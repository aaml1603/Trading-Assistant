import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('notion_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not connected to Notion' },
        { status: 401 }
      );
    }

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
