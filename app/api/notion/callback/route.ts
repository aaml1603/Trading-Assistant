import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  console.log('[Notion Callback] Request URL:', request.url);
  console.log('[Notion Callback] Code present:', !!code);
  console.log('[Notion Callback] Error:', error);

  if (error) {
    console.error('[Notion Callback] OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/?notion_error=${error}`, request.url)
    );
  }

  if (!code) {
    console.error('[Notion Callback] No authorization code received');
    return NextResponse.redirect(
      new URL('/?notion_error=no_code', request.url)
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.NOTION_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[Notion Callback] Token exchange error:', errorData);
      console.error('[Notion Callback] Status:', tokenResponse.status);
      return NextResponse.redirect(
        new URL('/?notion_error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('[Notion Callback] Token exchange successful');

    // Store the access token in a cookie (in production, use a database)
    const cookieStore = await cookies();
    cookieStore.set('notion_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 90, // 90 days
      path: '/',
    });

    // Also store workspace info
    if (tokenData.workspace_name) {
      cookieStore.set('notion_workspace_name', tokenData.workspace_name, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 90,
        path: '/',
      });
    }

    const redirectUrl = new URL('/?notion_connected=true', request.url);
    console.log('[Notion Callback] Redirecting to:', redirectUrl.toString());

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[Notion Callback] Unexpected error:', error);
    return NextResponse.redirect(
      new URL('/?notion_error=unknown', request.url)
    );
  }
}
