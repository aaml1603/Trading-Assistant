import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
    let analysisPrompt = `You are a trading strategy analyzer. Please analyze the trading strategy document provided and extract the key rules, entry criteria, exit criteria, and risk management guidelines. Provide a clear, structured summary that can be used to evaluate chart setups.`;

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

    // Analyze the strategy using Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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
    return NextResponse.json(
      { error: 'Failed to analyze strategy' },
      { status: 500 }
    );
  }
}
