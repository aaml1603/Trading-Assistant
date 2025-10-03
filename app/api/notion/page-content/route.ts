import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { cookies } from 'next/headers';

interface RichText {
  plain_text: string;
}

interface BlockData {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
}

async function getBlockContent(notion: Client, blockId: string): Promise<string> {
  const blocks = await notion.blocks.children.list({ block_id: blockId });
  let content = '';

  for (const block of blocks.results) {
    const blockData = block as BlockData;

    const getTextFromRichText = (richTextArray: unknown): string => {
      if (!Array.isArray(richTextArray)) return '';
      return richTextArray.map((t: RichText) => t.plain_text).join('') || '';
    };

    const data = blockData as Record<string, { rich_text?: unknown }>;

    switch (blockData.type) {
      case 'paragraph':
        content += getTextFromRichText(data.paragraph?.rich_text) + '\n\n';
        break;

      case 'heading_1':
        content += `# ${getTextFromRichText(data.heading_1?.rich_text)}\n\n`;
        break;

      case 'heading_2':
        content += `## ${getTextFromRichText(data.heading_2?.rich_text)}\n\n`;
        break;

      case 'heading_3':
        content += `### ${getTextFromRichText(data.heading_3?.rich_text)}\n\n`;
        break;

      case 'bulleted_list_item':
        content += `• ${getTextFromRichText(data.bulleted_list_item?.rich_text)}\n`;
        break;

      case 'numbered_list_item':
        content += `${getTextFromRichText(data.numbered_list_item?.rich_text)}\n`;
        break;

      case 'code':
        content += `\`\`\`\n${getTextFromRichText(data.code?.rich_text)}\n\`\`\`\n\n`;
        break;

      case 'quote':
        content += `> ${getTextFromRichText(data.quote?.rich_text)}\n\n`;
        break;

      case 'divider':
        content += '---\n\n';
        break;

      case 'toggle':
        content += `${getTextFromRichText(data.toggle?.rich_text)}\n`;
        if (blockData.has_children) {
          content += await getBlockContent(notion, blockData.id);
        }
        break;

      default:
        // For other block types, try to extract text if available
        const blockType = data[blockData.type];
        if (blockType?.rich_text) {
          const text = getTextFromRichText(blockType.rich_text);
          if (text) content += text + '\n\n';
        }
    }

    // Handle nested children
    if (blockData.has_children && blockData.type !== 'toggle') {
      content += await getBlockContent(notion, blockData.id);
    }
  }

  return content;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('notion_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not connected to Notion' },
        { status: 401 }
      );
    }

    const { pageId } = await request.json();

    if (!pageId) {
      return NextResponse.json(
        { error: 'Page ID required' },
        { status: 400 }
      );
    }

    const notion = new Client({ auth: accessToken });

    // Get page metadata
    const pageResponse = await notion.pages.retrieve({ page_id: pageId });
    const page = pageResponse as Record<string, unknown>;
    const properties = page.properties as Record<string, { title?: Array<{ plain_text: string }> }> | undefined;

    let title = 'Untitled';
    if (properties?.title?.title?.[0]?.plain_text) {
      title = properties.title.title[0].plain_text;
    } else if (properties?.Name?.title?.[0]?.plain_text) {
      title = properties.Name.title[0].plain_text;
    }

    // Get page content (no truncation - process full content)
    const content = await getBlockContent(notion, pageId);

    return NextResponse.json({
      title,
      content,
      url: page.url,
      contentLength: content.length,
    });
  } catch (error) {
    console.error('Error fetching Notion page content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch page content' },
      { status: 500 }
    );
  }
}
