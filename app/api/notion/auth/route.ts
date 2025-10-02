import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Notion OAuth not configured' },
      { status: 500 }
    );
  }

  // Build Notion OAuth URL
  const notionAuthUrl = new URL('https://api.notion.com/v1/oauth/authorize');
  notionAuthUrl.searchParams.set('client_id', clientId);
  notionAuthUrl.searchParams.set('redirect_uri', redirectUri);
  notionAuthUrl.searchParams.set('response_type', 'code');
  notionAuthUrl.searchParams.set('owner', 'user');

  return NextResponse.redirect(notionAuthUrl.toString());
}
