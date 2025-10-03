import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Configure route for chat requests
export const maxDuration = 60; // 1 minute for chat
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 60000, // 1 minute timeout
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const strategy = formData.get('strategy') as string;
    const conversationHistoryStr = formData.get('conversationHistory') as string;
    const chartImagesStr = formData.get('chartImages') as string;

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      );
    }

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

    // Build system prompt
    let systemPrompt = `You are an expert trading assistant helping traders analyze their strategies and make informed trading decisions. You provide clear, actionable advice based on trading principles and technical analysis. IMPORTANT: Always respond in the same language as the user's messages and strategy content.`;

    if (strategy) {
      systemPrompt += `\n\nThe user has uploaded the following trading strategy:\n\n${strategy}\n\nUse this strategy as context when answering questions.`;
    }

    if (chartImages.length > 0) {
      systemPrompt += `\n\nThe user has uploaded ${chartImages.length} chart image(s) for analysis. These charts show different timeframes: ${chartImages.map(c => c.timeframe).join(', ')}. Reference these charts when answering questions about the current market setup.`;
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

    // Build current message content with charts if provided
    if (chartImages.length > 0) {
      const messageContent: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; source: { type: 'base64'; media_type: ImageMediaType; data: string } }
      > = [];

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
      max_tokens: 2048,
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
