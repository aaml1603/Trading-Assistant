import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { COLLECTIONS, User } from '@/lib/models';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);
    const dbUser = await usersCollection.findOne({ _id: new ObjectId(user.userId) });

    if (!dbUser?.notionAccessToken) {
      return NextResponse.json(
        { error: 'Not connected to Notion' },
        { status: 401 }
      );
    }

    const accessToken = dbUser.notionAccessToken;

    const notion = new Client({ auth: accessToken });

    // Get cursor from query params for pagination
    const { searchParams } = new URL(request.url);
    const startCursor = searchParams.get('cursor');

    // Search for pages
    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'page',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
      page_size: 100,
      ...(startCursor && { start_cursor: startCursor }),
    });

    console.log('Notion search results:', JSON.stringify(response, null, 2));

    // Format pages for the frontend
    const pages = response.results
      .filter((item: Record<string, unknown>) => item.object === 'page')
      .map((page: Record<string, unknown>) => {
        let title = 'Untitled';

        // Try different property names for title
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const properties = page.properties as Record<string, any> | undefined;
        if (properties) {
          // Check for title property (most common)
          const titleProp = properties.title;
          if (titleProp?.title?.[0]?.plain_text) {
            title = titleProp.title[0].plain_text;
          }
          
          // If no title property found, look for the first text property
          if (title === 'Untitled') {
            for (const [_propName, propValue] of Object.entries(properties)) {
              if (propValue?.title?.[0]?.plain_text) {
                title = propValue.title[0].plain_text;
                break;
              }
              // Also check for rich_text properties
              if (propValue?.rich_text?.[0]?.plain_text) {
                title = propValue.rich_text[0].plain_text;
                break;
              }
            }
          }
        }

        // Fallback to page title if available
        const pageTitle = page.title as string | undefined;
        if (title === 'Untitled' && pageTitle) {
          title = pageTitle;
        }

        // If still untitled, try to use the first part of the page ID
        if (title === 'Untitled') {
          title = `Page ${(page.id as string).slice(-8)}`;
        }

        return {
          id: page.id as string,
          title,
          lastEdited: page.last_edited_time as string,
          url: page.url as string,
        };
      });

    console.log('Formatted pages:', pages);

    return NextResponse.json({
      pages,
      hasMore: response.has_more,
      nextCursor: response.next_cursor || null,
      debug: {
        totalResults: response.results.length,
        hasMore: response.has_more,
      }
    });
  } catch (error) {
    console.error('Error fetching Notion pages:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}
