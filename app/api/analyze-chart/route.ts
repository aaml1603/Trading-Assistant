import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Configure route for potentially long-running requests
export const maxDuration = 60; // 1 minute for chart analysis
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 60000, // 1 minute timeout for chart analysis
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const strategy = formData.get('strategy') as string;
    const chartCount = parseInt(formData.get('chartCount') as string || '0');

    if (!strategy) {
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

    // Collect all charts with their timeframes
    const charts: Array<{ base64: string; mimeType: string; timeframe: string }> = [];

    for (let i = 0; i < chartCount; i++) {
      const chartFile = formData.get(`chart_${i}`) as File;
      const timeframe = formData.get(`timeframe_${i}`) as string;

      if (chartFile) {
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
    let analysisPrompt = `You are a professional trading analyst. IMPORTANT: Respond in the same language as the trading strategy content provided below. I'm providing ${charts.length} chart screenshot${charts.length > 1 ? 's' : ''} for analysis across different timeframes:\n\n`;

    charts.forEach((chart, index) => {
      analysisPrompt += `**Chart ${index + 1}**: ${chart.timeframe}\n`;
    });

    analysisPrompt += `\n**Trading Strategy:**\n${strategy}\n\n`;

    if (charts.length > 1) {
      analysisPrompt += `Please analyze ALL charts together, considering the multi-timeframe perspective, and provide:\n\n`;
      analysisPrompt += `1. **Multi-Timeframe Analysis**: How do the different timeframes align or conflict?\n`;
      analysisPrompt += `2. **Entry Signal**: YES or NO - Is there a valid entry based on the strategy across all timeframes?\n`;
      analysisPrompt += `3. **Confidence Level**: High, Medium, or Low\n`;
      analysisPrompt += `4. **Key Observations**: What patterns, indicators, or price action do you see on each timeframe?\n`;
      analysisPrompt += `5. **Entry Criteria Met**: Which specific strategy rules are satisfied across the timeframes?\n`;
      analysisPrompt += `6. **Entry Criteria Not Met**: Which rules are missing or not satisfied?\n`;
      analysisPrompt += `7. **Timeframe Alignment**: Are the timeframes confirming each other or showing divergence?\n`;
      analysisPrompt += `8. **Recommendations**: Should the trader take this setup? Any warnings or considerations?\n`;
      analysisPrompt += `9. **Entry Price**: If applicable, suggest an entry price\n`;
      analysisPrompt += `10. **Stop Loss**: If applicable, suggest a stop loss level\n`;
      analysisPrompt += `11. **Take Profit**: If applicable, suggest take profit targets\n\n`;
      analysisPrompt += `Be specific about which timeframe shows which signal and reference the actual strategy rules provided.`;
    } else {
      analysisPrompt += `Please analyze the chart and provide:\n\n`;
      analysisPrompt += `1. **Entry Signal**: YES or NO - Is there a valid entry based on the strategy?\n`;
      analysisPrompt += `2. **Confidence Level**: High, Medium, or Low\n`;
      analysisPrompt += `3. **Key Observations**: What patterns, indicators, or price action do you see?\n`;
      analysisPrompt += `4. **Entry Criteria Met**: Which specific strategy rules are satisfied?\n`;
      analysisPrompt += `5. **Entry Criteria Not Met**: Which rules are missing or not satisfied?\n`;
      analysisPrompt += `6. **Recommendations**: Should the trader take this setup? Any warnings or considerations?\n`;
      analysisPrompt += `7. **Entry Price**: If applicable, suggest an entry price\n`;
      analysisPrompt += `8. **Stop Loss**: If applicable, suggest a stop loss level\n`;
      analysisPrompt += `9. **Take Profit**: If applicable, suggest take profit targets\n\n`;
      analysisPrompt += `Be specific and reference the actual strategy rules provided.`;
    }

    content.push({
      type: 'text',
      text: analysisPrompt,
    });

    // Analyze the charts using Claude with vision
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
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
    return NextResponse.json(
      { error: 'Failed to analyze chart' },
      { status: 500 }
    );
  }
}
