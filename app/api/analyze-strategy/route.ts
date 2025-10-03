import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Configure route for long-running requests
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 300000, // 5 minutes timeout
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get('pdf') as File;
    const additionalComments = formData.get('additionalComments') as string;

    if (!pdfFile) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Build the analysis prompt with optional additional comments
    let analysisPrompt = `You are a trading strategy analyzer. IMPORTANT: Respond in the same language as the content of the document provided. Please analyze the trading strategy document provided and extract the key rules, entry criteria, exit criteria, and risk management guidelines. Provide a clear, structured summary that can be used to evaluate chart setups.`;

    if (additionalComments && additionalComments.trim()) {
      analysisPrompt += `\n\nThe user has provided additional context:\n${additionalComments}\n\nPlease incorporate this additional information into your analysis.`;
    }

    analysisPrompt += `\n\nPlease provide:
1. Strategy Name/Type
2. Key Entry Rules
3. Key Exit Rules
4. Risk Management Rules
5. Important Notes or Conditions

Also extract the full text content of the strategy for future reference.`;

    let messageContent: Array<
      | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }
      | { type: 'text'; text: string }
    >;

    // Check if it's a text file (from Notion) or PDF
    if (pdfFile.type === 'text/plain') {
      // Handle text content from Notion
      const textContent = await pdfFile.text();
      messageContent = [
        {
          type: 'text' as const,
          text: `Here is the trading strategy:\n\n${textContent}\n\n${analysisPrompt}`,
        },
      ];
    } else {
      // Handle PDF files
      const arrayBuffer = await pdfFile.arrayBuffer();
      const base64Pdf = Buffer.from(arrayBuffer).toString('base64');

      messageContent = [
        {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64Pdf,
          },
        },
        {
          type: 'text' as const,
          text: analysisPrompt,
        },
      ];
    }

    // Analyze the strategy using Claude (timeout configured at client level)
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    });

    const analysis = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({
      success: true,
      analysis,
      strategyText: analysis, // Use the analysis as strategy text since Claude extracted it
    });
  } catch (error) {
    console.error('Error analyzing strategy:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('499') || error.message.includes('522')) {
        return NextResponse.json(
          { error: 'The document is very large and analysis timed out. Please try splitting it into smaller sections.' },
          { status: 408 }
        );
      }
      if (error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment and try again.' },
          { status: 429 }
        );
      }
      if (error.message.includes('400')) {
        return NextResponse.json(
          { error: 'Invalid request. Please check your document format and try again.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to analyze strategy. Please try again.' },
      { status: 500 }
    );
  }
}
