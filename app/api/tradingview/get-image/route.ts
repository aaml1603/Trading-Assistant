import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { verifyToken } from '@/lib/auth';
import { validateUrl } from '@/lib/input-validation';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Fetches the image URL from a TradingView snapshot page
 * @param url - The TradingView snapshot URL
 * @returns The image URL
 */
function getTradingViewImageUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Add timeout to prevent hanging
    const requestOptions = {
      timeout: 10000, // 10 second timeout
    };

    https.get(url, requestOptions, (res) => {
      let data = '';

      // Check if redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location;
        if (location) {
          // Validate redirect location to prevent SSRF
          try {
            const redirectUrl = new URL(location);
            const hostname = redirectUrl.hostname.toLowerCase();
            if (!hostname.endsWith('.tradingview.com') && hostname !== 'tradingview.com') {
              reject(new Error('Invalid redirect: must stay on tradingview.com domain'));
              return;
            }
            if (redirectUrl.protocol !== 'https:') {
              reject(new Error('Invalid redirect: must use HTTPS'));
              return;
            }
          } catch {
            reject(new Error('Invalid redirect URL'));
            return;
          }

          return getTradingViewImageUrl(location)
            .then(resolve)
            .catch(reject);
        }
      }

      // Collect data chunks
      res.on('data', (chunk) => {
        data += chunk;
      });

      // Process complete response
      res.on('end', () => {
        try {
          // Method 1: Look for og:image meta tag
          const ogImageMatch = data.match(/<meta property="og:image" content="([^"]+)"/);
          if (ogImageMatch && ogImageMatch[1]) {
            resolve(ogImageMatch[1]);
            return;
          }

          // Method 2: Look for twitter:image meta tag
          const twitterImageMatch = data.match(/<meta name="twitter:image" content="([^"]+)"/);
          if (twitterImageMatch && twitterImageMatch[1]) {
            resolve(twitterImageMatch[1]);
            return;
          }

          // Method 3: Look for img tag with tv-snapshot-image class
          const imgMatch = data.match(/<img src=['"]([^'"]+)['"] alt=[^>]*class="tv-snapshot-image"/);
          if (imgMatch && imgMatch[1]) {
            resolve(imgMatch[1]);
            return;
          }

          // Method 4: Look for any s3.tradingview.com/snapshots URL
          const s3Match = data.match(/https:\/\/s3\.tradingview\.com\/snapshots\/[a-z]\/[a-zA-Z0-9]+\.png/);
          if (s3Match) {
            resolve(s3Match[0]);
            return;
          }

          reject(new Error('Image URL not found in the page'));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Fetches the actual image from the image URL and converts to base64
 */
function fetchImageAsBase64(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(imageUrl, (res) => {
      const chunks: Buffer[] = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        resolve(base64);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Rate limiting: 10 requests per 5 minutes per user
    if (!checkRateLimit(request, 10, 5 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { url } = body;

    // Validate URL
    const urlValidation = validateUrl(url, ['tradingview.com']);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    // Get the image URL from the TradingView page
    const imageUrl = await getTradingViewImageUrl(url);

    // Fetch the actual image and convert to base64
    const base64Image = await fetchImageAsBase64(imageUrl);

    return NextResponse.json({
      imageUrl,
      base64: base64Image,
      mimeType: 'image/png',
    });
  } catch (error) {
    console.error('Error fetching TradingView image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch TradingView image' },
      { status: 500 }
    );
  }
}
