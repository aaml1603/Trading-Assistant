import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Delete the Notion cookies
    cookieStore.delete('notion_access_token');
    cookieStore.delete('notion_workspace_name');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Notion:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
