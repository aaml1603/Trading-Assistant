import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { messages } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Build a context string from the first few messages
    const conversationContext = messages
      .slice(0, 4) // First 2 exchanges (user + assistant)
      .map((msg: { role: string; content: string; type?: string }) => {
        const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
        // Truncate very long messages
        const content = msg.content.length > 300 ? msg.content.substring(0, 300) + '...' : msg.content;
        return `${roleLabel}: ${content}`;
      })
      .join('\n\n');

    // Generate title using Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `Based on this conversation, generate a short, descriptive title (3-7 words max). The title should capture the main topic or intent. Respond with ONLY the title, no quotes or extra text.

Conversation:
${conversationContext}`,
        },
      ],
    });

    const generatedTitle = response.content[0].type === 'text'
      ? response.content[0].text.trim().replace(/^["']|["']$/g, '') // Remove quotes if present
      : 'New Conversation';

    // Ensure title isn't too long
    const title = generatedTitle.length > 60
      ? generatedTitle.substring(0, 57) + '...'
      : generatedTitle;

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    );
  }
}
