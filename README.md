# AI Trading Assistant

An AI-powered trading assistant that analyzes your trading strategies and chart screenshots using Anthropic's Claude API.

## Features

- **Strategy Analysis**: Upload PDF documents containing your trading strategies and get AI-powered analysis of entry/exit rules and risk management
- **Chart Analysis**: Upload chart screenshots and receive detailed analysis on whether there's a valid entry based on your strategy
- **Vision AI**: Uses Claude's vision capabilities to analyze chart patterns, indicators, and price action
- **Real-time Feedback**: Get instant analysis results with confidence levels and recommendations

## Setup
## Change

1. Install dependencies:
```bash
npm install
```

2. Add your Anthropic API key to `.env.local`:
```
ANTHROPIC_API_KEY=your_api_key_here
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use

1. **Upload Trading Strategy**: Upload a PDF containing your trading strategy rules, entry criteria, exit criteria, and risk management guidelines
2. **Review Analysis**: The AI will analyze and extract key trading rules from your strategy
3. **Upload Chart**: Upload a screenshot of a chart you want to analyze
4. **Get Results**: Receive detailed analysis including:
   - Entry signal (YES/NO)
   - Confidence level
   - Key observations
   - Entry criteria met/not met
   - Recommendations
   - Suggested entry price, stop loss, and take profit levels

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: TailwindCSS
- **AI**: Anthropic Claude (Sonnet 4)
- **PDF Processing**: pdf-parse
- **Language**: TypeScript

## API Routes

- `/api/analyze-strategy`: Analyzes uploaded PDF trading strategies
- `/api/analyze-chart`: Analyzes chart screenshots based on uploaded strategies

## Notes

- For educational purposes only
- Not financial advice
- Always validate AI recommendations with your own analysis

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
