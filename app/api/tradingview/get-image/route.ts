import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

/**
 * Fetches the image URL from a TradingView snapshot page
 * @param url - The TradingView snapshot URL
 * @returns The image URL
 */
function getTradingViewImageUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      // Check if redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location;
        if (location) {
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
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'TradingView URL is required' },
        { status: 400 }
      );
    }

    // Validate that it's a TradingView URL
    if (!url.includes('tradingview.com')) {
      return NextResponse.json(
        { error: 'Invalid TradingView URL' },
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
