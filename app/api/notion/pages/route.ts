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
    });

    console.log('Notion search results:', JSON.stringify(response, null, 2));

    // Format pages for the frontend
    const pages = response.results
      .filter((item: Record<string, unknown>) => item.object === 'page')
      .map((page: Record<string, unknown>) => {
        let title = 'Untitled';

        // Try different property names for title
        const properties = page.properties as Record<string, { title?: Array<{ plain_text: string }> }> | undefined;
        if (properties) {
          const titleProp = properties.title || properties.Name || properties.name;
          if (titleProp?.title?.[0]?.plain_text) {
            title = titleProp.title[0].plain_text;
          }
        }

        // Fallback to page title if available
        const pageTitle = page.title as string | undefined;
        if (title === 'Untitled' && pageTitle) {
          title = pageTitle;
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
