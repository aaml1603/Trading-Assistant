import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/?notion_error=${error}`, request.url)
    );
  }

  if (!code) {
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
      console.error('Notion token exchange error:', errorData);
      return NextResponse.redirect(
        new URL('/?notion_error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();

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

    return NextResponse.redirect(
      new URL('/?notion_connected=true', request.url)
    );
  } catch (error) {
    console.error('Error in Notion callback:', error);
    return NextResponse.redirect(
      new URL('/?notion_error=unknown', request.url)
    );
  }
}
