import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - please login first' },
      { status: 401 }
    );
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Notion OAuth not configured' },
      { status: 500 }
    );
  }

  // Build Notion OAuth URL with user ID in state
  const notionAuthUrl = new URL('https://api.notion.com/v1/oauth/authorize');
  notionAuthUrl.searchParams.set('client_id', clientId);
  notionAuthUrl.searchParams.set('redirect_uri', redirectUri);
  notionAuthUrl.searchParams.set('response_type', 'code');
  notionAuthUrl.searchParams.set('owner', 'user');
  notionAuthUrl.searchParams.set('state', user.userId);

  // Return the URL as JSON instead of redirecting
  // This allows the client to handle the redirect with proper auth
  return NextResponse.json({ authUrl: notionAuthUrl.toString() });
}
