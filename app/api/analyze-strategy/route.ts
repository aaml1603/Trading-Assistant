import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { COLLECTIONS, Strategy } from '@/lib/models';
import { getUserFromRequest } from '@/lib/auth';

// Configure route for long-running requests
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 300000, // 5 minutes timeout
});

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login first' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const pdfFile = formData.get('pdf') as File;
    const additionalComments = formData.get('additionalComments') as string;

    if (!pdfFile) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Extract strategy content without analysis
    let strategyContent = '';

    // Check if it's a text file (from Notion) or PDF
    if (pdfFile.type === 'text/plain') {
      // Handle text content from Notion
      strategyContent = await pdfFile.text();
    } else {
      // Handle PDF files - extract text using Claude
      const arrayBuffer = await pdfFile.arrayBuffer();
      const base64Pdf = Buffer.from(arrayBuffer).toString('base64');

      const extractionMessage = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16384,
        messages: [
          {
            role: 'user',
            content: [
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
                text: 'Extract all text content from this document. Return only the text, no analysis or commentary.',
              },
            ],
          },
        ],
      });

      strategyContent = extractionMessage.content[0].type === 'text' ? extractionMessage.content[0].text : '';
    }

    console.log('Strategy content extracted, length:', strategyContent.length);

    // Create a simple confirmation message
    const strategyName = pdfFile.name.replace(/\.(pdf|txt)$/i, '');
    const analysis = `**Strategy loaded: ${strategyName}**\n\nYour strategy is now in context${additionalComments ? ' with your additional notes' : ''}. You can now upload charts for analysis or ask questions about your strategy.`;

    // Save strategy to MongoDB
    const db = await getDb();
    const strategiesCollection = db.collection<Strategy>(COLLECTIONS.STRATEGIES);

    const now = new Date();

    const newStrategy: Strategy = {
      userId: new ObjectId(user.userId),
      name: strategyName,
      analysis,
      strategyText: strategyContent,
      fileType: pdfFile.type,
      additionalComments: additionalComments || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const result = await strategiesCollection.insertOne(newStrategy);

    return NextResponse.json({
      success: true,
      analysis,
      strategyText: strategyContent,
      strategyId: result.insertedId.toString(),
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
