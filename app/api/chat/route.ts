import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const strategy = formData.get('strategy') as string;
    const conversationHistoryStr = formData.get('conversationHistory') as string;

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      );
    }

    // Parse conversation history
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
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

    // Build system prompt
    let systemPrompt = `You are an expert trading assistant helping traders analyze their strategies and make informed trading decisions. You provide clear, actionable advice based on trading principles and technical analysis.`;

    if (strategy) {
      systemPrompt += `\n\nThe user has uploaded the following trading strategy:\n\n${strategy}\n\nUse this strategy as context when answering questions.`;
    }

    // Build messages array
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add conversation history
    if (conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current user message
    messages.push({
      role: 'user' as const,
      content: message,
    });

    // Get response from Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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
