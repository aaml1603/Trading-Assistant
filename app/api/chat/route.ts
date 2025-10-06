import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { COLLECTIONS, User } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

// Configure route for chat requests
export const maxDuration = 300; // 5 minutes for chat (to handle complex queries with images)
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 300000, // 5 minutes timeout
});

export async function POST(request: NextRequest) {
  try {
    // Verify user and get custom instructions
    const authHeader = request.headers.get('authorization');
    let customInstructions = '';

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyToken(token);

      if (payload) {
        const db = await getDb();
        const user = await db
          .collection<User>(COLLECTIONS.USERS)
          .findOne({ _id: new ObjectId(payload.userId) });

        if (user?.customInstructions) {
          customInstructions = user.customInstructions;
        }
      }
    }

    const formData = await request.formData();
    const message = formData.get('message') as string;
    const strategy = formData.get('strategy') as string;
    const conversationHistoryStr = formData.get('conversationHistory') as string;
    const chartImagesStr = formData.get('chartImages') as string;
    const indicatorImagesStr = formData.get('indicatorImages') as string;

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      );
    }

    console.log('Chat request - Strategy length:', strategy?.length || 0);

    // Parse conversation history
    type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    let conversationHistory: Array<{
      role: 'user' | 'assistant';
      content: string | Array<
        | { type: 'text'; text: string }
        | { type: 'image'; source: { type: 'base64'; media_type: ImageMediaType; data: string } }
      >
    }> = [];
    try {
      const parsed = JSON.parse(conversationHistoryStr || '[]');
      // Convert to Claude format (last 10 messages for context)
      conversationHistory = parsed
        .slice(-10)
        .filter((msg: { type?: string }) => msg.type !== 'strategy' && msg.type !== 'chart') // Exclude file uploads
        .map((msg: { role: 'user' | 'assistant'; content: string }) => ({
          role: msg.role,
          content: msg.content,
        }));
    } catch {
      // If parsing fails, continue without history
    }

    // Parse chart images if provided
    let chartImages: Array<{ base64: string; mimeType: string; timeframe: string }> = [];
    try {
      if (chartImagesStr) {
        chartImages = JSON.parse(chartImagesStr);
      }
    } catch {
      // If parsing fails, continue without charts
    }

    // Parse indicator images if provided
    let indicatorImages: Array<{ base64: string; mimeType: string }> = [];
    try {
      if (indicatorImagesStr) {
        indicatorImages = JSON.parse(indicatorImagesStr);
      }
    } catch {
      // If parsing fails, continue without indicators
    }

    // Build system prompt
    let systemPrompt = `You are a trading assistant. Be CONCISE and DIRECT. Keep responses brief - 3-5 sentences max unless specifically asked for detail. Focus on actionable insights only. IMPORTANT: Always respond in the same language as the user's messages.`;

    // Add custom instructions if available
    if (customInstructions && customInstructions.trim()) {
      systemPrompt += `\n\nIMPORTANT - Custom Instructions (ALWAYS follow these):\n${customInstructions}`;
    }

    if (strategy && strategy.trim()) {
      systemPrompt += `\n\nThe user has already uploaded their trading strategy. Here it is:\n\n${strategy}\n\nWhen the user asks about "my strategy" or to "explain my strategy", you are referring to THIS strategy above. You have it in context - explain it based on the content provided.`;
    }

    if (chartImages.length > 0) {
      systemPrompt += `\n\nCharts available: ${chartImages.map(c => c.timeframe).join(', ')}. Reference when relevant.`;
    }

    if (indicatorImages.length > 0) {
      systemPrompt += `\n\nIndicator images: ${indicatorImages.length} indicator screenshot${indicatorImages.length > 1 ? 's' : ''} available for analysis.`;
    }

    // Build messages array
    const messages: Array<{
      role: 'user' | 'assistant';
      content: string | Array<
        | { type: 'text'; text: string }
        | { type: 'image'; source: { type: 'base64'; media_type: ImageMediaType; data: string } }
      >
    }> = [];

    // Add conversation history
    if (conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Build current message content with charts/indicators if provided
    if (chartImages.length > 0 || indicatorImages.length > 0) {
      const messageContent: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; source: { type: 'base64'; media_type: ImageMediaType; data: string } }
      > = [];

      // Add indicator images first (if any)
      indicatorImages.forEach((indicator) => {
        messageContent.push({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: indicator.mimeType as ImageMediaType,
            data: indicator.base64,
          },
        });
      });

      // Add all chart images
      chartImages.forEach((chart) => {
        messageContent.push({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: chart.mimeType as ImageMediaType,
            data: chart.base64,
          },
        });
      });

      // Add text message
      messageContent.push({
        type: 'text' as const,
        text: message,
      });

      messages.push({
        role: 'user' as const,
        content: messageContent,
      });
    } else {
      // Text-only message
      messages.push({
        role: 'user' as const,
        content: message,
      });
    }

    // Get response from Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      system: systemPrompt,
      messages,
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({
      success: true,
      response: responseText,
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
