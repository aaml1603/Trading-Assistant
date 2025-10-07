import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { COLLECTIONS, User } from '@/lib/models';
import { verifyToken } from '@/lib/auth';
import { validateFile } from '@/lib/file-validation';
import { checkRateLimit } from '@/lib/rate-limit';

// Configure route for potentially long-running requests
export const maxDuration = 300; // 5 minutes for chart analysis
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 300000, // 5 minutes timeout for chart analysis
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
        // Rate limiting: 30 chart analyses per hour
        if (!checkRateLimit(request, 30, 60 * 60 * 1000)) {
          return NextResponse.json(
            { error: 'Too many analysis requests. Please try again later.' },
            { status: 429 }
          );
        }

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
    const strategiesStr = formData.get('strategies') as string;
    const chartCount = parseInt(formData.get('chartCount') as string || '0');
    const indicatorCount = parseInt(formData.get('indicatorCount') as string || '0');
    const description = formData.get('description') as string;

    // Parse strategies
    let strategies: Array<{ id: string; name: string; text: string; analysis: string }> = [];
    try {
      if (strategiesStr) {
        strategies = JSON.parse(strategiesStr);
      }
    } catch {
      // If parsing fails, continue without strategies
    }

    if (strategies.length === 0) {
      return NextResponse.json(
        { error: 'No strategy provided. Please upload a strategy PDF first.' },
        { status: 400 }
      );
    }

    if (chartCount === 0) {
      return NextResponse.json(
        { error: 'No chart images provided' },
        { status: 400 }
      );
    }

    // Collect all indicator images
    const indicators: Array<{ base64: string; mimeType: string }> = [];

    for (let i = 0; i < indicatorCount; i++) {
      const indicatorFile = formData.get(`indicator_${i}`) as File;

      if (indicatorFile) {
        // Validate file
        const fileValidation = await validateFile(indicatorFile);
        if (!fileValidation.valid) {
          return NextResponse.json(
            { error: `Indicator ${i + 1}: ${fileValidation.error}` },
            { status: 400 }
          );
        }

        const arrayBuffer = await indicatorFile.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = indicatorFile.type || 'image/png';

        indicators.push({
          base64: base64Image,
          mimeType,
        });
      }
    }

    // Collect all charts with their timeframes
    const charts: Array<{ base64: string; mimeType: string; timeframe: string }> = [];

    for (let i = 0; i < chartCount; i++) {
      const chartFile = formData.get(`chart_${i}`) as File;
      const timeframe = formData.get(`timeframe_${i}`) as string;

      if (chartFile) {
        // Validate file
        const fileValidation = await validateFile(chartFile);
        if (!fileValidation.valid) {
          return NextResponse.json(
            { error: `Chart ${i + 1}: ${fileValidation.error}` },
            { status: 400 }
          );
        }

        const arrayBuffer = await chartFile.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = chartFile.type || 'image/png';

        charts.push({
          base64: base64Image,
          mimeType,
          timeframe: timeframe || `Chart ${i + 1}`,
        });
      }
    }

    if (charts.length === 0) {
      return NextResponse.json(
        { error: 'No valid chart images found' },
        { status: 400 }
      );
    }

    // Build content array with all images and analysis prompt
    type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const content: Array<
      | { type: 'image'; source: { type: 'base64'; media_type: ImageMediaType; data: string } }
      | { type: 'text'; text: string }
    > = [];

    // Add indicator images first (if any)
    indicators.forEach((indicator) => {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: indicator.mimeType as ImageMediaType,
          data: indicator.base64,
        },
      });
    });

    // Add all chart images with labels
    charts.forEach((chart) => {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: chart.mimeType as ImageMediaType,
          data: chart.base64,
        },
      });
    });

    // Build the analysis prompt
    let analysisPrompt = `IMPORTANT: Respond in the same language as the strategy. `;

    if (indicators.length > 0) {
      analysisPrompt += `The first ${indicators.length} image${indicators.length > 1 ? 's show' : ' shows'} the indicator${indicators.length > 1 ? 's' : ''} being used. `;
    }

    analysisPrompt += `Analyze ${charts.length} chart${charts.length > 1 ? 's' : ''}:\n\n`;

    charts.forEach((chart, index) => {
      analysisPrompt += `Chart ${index + 1}: ${chart.timeframe}\n`;
    });

    if (description && description.trim()) {
      analysisPrompt += `\n**User's Chart Observations:**\n${description}\n`;
    }

    analysisPrompt += `\n**Trading Strateg${strategies.length > 1 ? 'ies' : 'y'}:**\n`;
    strategies.forEach((strat, index) => {
      analysisPrompt += `\n--- Strategy ${index + 1}: ${strat.name} ---\n${strat.text}\n`;
    });
    analysisPrompt += `\n`;

    if (charts.length > 1) {
      analysisPrompt += `Provide BRIEF analysis:\n`;
      analysisPrompt += `1. **Entry Signal**: YES/NO\n`;
      analysisPrompt += `2. **Confidence**: High/Medium/Low\n`;
      analysisPrompt += `3. **Timeframe Alignment**: Quick summary\n`;
      analysisPrompt += `4. **Criteria Met**: Which strategy rules (bullets only)\n`;
      analysisPrompt += `5. **Criteria Not Met**: Missing rules (bullets only)\n`;
      analysisPrompt += `6. **Entry/SL/TP**: Price levels if applicable\n`;
      analysisPrompt += `7. **Verdict**: Take it or not? (1-2 sentences)\n\n`;
      analysisPrompt += `Keep it concise - no long explanations.`;
    } else {
      analysisPrompt += `Provide BRIEF analysis:\n`;
      analysisPrompt += `1. **Entry Signal**: YES/NO\n`;
      analysisPrompt += `2. **Confidence**: High/Medium/Low\n`;
      analysisPrompt += `3. **Criteria Met**: Which strategy rules (bullets only)\n`;
      analysisPrompt += `4. **Criteria Not Met**: Missing rules (bullets only)\n`;
      analysisPrompt += `5. **Entry/SL/TP**: Price levels if applicable\n`;
      analysisPrompt += `6. **Verdict**: Take it or not? (1-2 sentences)\n\n`;
      analysisPrompt += `Keep it concise - no long explanations.`;
    }

    content.push({
      type: 'text',
      text: analysisPrompt,
    });

    // Build system prompt
    let systemPrompt = 'You are a trading assistant analyzing charts based on the provided strategy. Be CONCISE and DIRECT. Pay special attention to any user observations about the chart, as these provide crucial context about what they see in the image.';

    // Add custom instructions if available
    if (customInstructions && customInstructions.trim()) {
      systemPrompt += `\n\nIMPORTANT - Custom Instructions (ALWAYS follow these):\n${customInstructions}`;
    }

    // Analyze the charts using Claude with vision
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16384,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    });

    const analysis = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Error analyzing chart:', error);

    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze chart';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
