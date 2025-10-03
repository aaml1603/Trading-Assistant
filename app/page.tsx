'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ui/shadcn-io/ai/conversation';
import { Loader } from '@/components/ui/shadcn-io/ai/loader';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/shadcn-io/ai/message';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ui/shadcn-io/ai/prompt-input';
import { Button } from '@/components/ui/button';
import { FileText, Image as ImageIcon, RotateCcwIcon, Download, Link } from 'lucide-react';
import { type FormEventHandler, useCallback, useState } from 'react';
import NotionConnect from './components/NotionConnect';
import { ThemeToggle } from './components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ChatMessage = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'strategy' | 'chart' | 'text';
  metadata?: {
    fileName?: string;
    timeframes?: string[];
    chartCount?: number;
  };
  isStreaming?: boolean;
};

// Export utility functions
const exportConversation = (messages: ChatMessage[], format: 'json' | 'markdown' | 'text') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  let content = '';
  let filename = '';
  let mimeType = '';

  switch (format) {
    case 'json':
      content = JSON.stringify(messages, null, 2);
      filename = `conversation-${timestamp}.json`;
      mimeType = 'application/json';
      break;

    case 'markdown':
      content = messages.map(msg => {
        const time = new Date(msg.timestamp).toLocaleString();
        const role = msg.role === 'user' ? '👤 User' : '🤖 AI Assistant';
        return `## ${role}\n*${time}*\n\n${msg.content}\n\n---\n`;
      }).join('\n');
      filename = `conversation-${timestamp}.md`;
      mimeType = 'text/markdown';
      break;

    case 'text':
      content = messages.map(msg => {
        const time = new Date(msg.timestamp).toLocaleString();
        const role = msg.role === 'user' ? 'User' : 'AI Assistant';
        return `[${time}] ${role}:\n${msg.content}\n\n${'='.repeat(80)}\n`;
      }).join('\n');
      filename = `conversation-${timestamp}.txt`;
      mimeType = 'text/plain';
      break;
  }

  // Create and trigger download
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "# Welcome to AI Trading Assistant! 👋\n\nI'm your AI-powered trading analysis companion, designed to help you make informed trading decisions by analyzing your strategies and charts.\n\n## 🎯 What I Can Do\n\n- **Strategy Analysis**: Upload your trading strategy PDFs or import from Notion to get comprehensive analysis of your trading rules, entry/exit criteria, and risk management\n- **Chart Analysis**: Analyze multiple chart timeframes simultaneously to identify entry opportunities based on your strategy\n- **Conversational Support**: Ask questions about trading concepts, strategy refinement, or get clarification on analysis results\n- **Multi-Timeframe Analysis**: Compare different timeframes (1M, 5M, 15M, 1H, 4H, Daily, etc.) to confirm trade setups\n\n## 📋 How to Get Started\n\n**Option 1: Strategy Analysis**\n1. Click **Upload PDF** to upload your trading strategy document\n2. Add optional context or notes about your strategy\n3. Review the AI analysis of your strategy rules and criteria\n\n**Option 2: Import from Notion**\n1. Click **Notion** to connect your workspace\n2. Browse and select your strategy document\n3. Get instant analysis of your Notion content\n\n**Option 3: General Questions**\n- Simply type your trading questions in the chat below\n- Ask about strategy development, risk management, technical analysis, etc.\n\n## 📈 Complete Workflow\n\n1. **Upload Strategy** → I'll analyze and extract key trading rules\n2. **Upload Charts** → Add chart screenshots or paste TradingView snapshot links\n3. **Specify Timeframes** → Label each chart with its timeframe (e.g., \"1H\", \"4H\")\n4. **Get Analysis** → Receive detailed entry/exit recommendations based on your strategy\n5. **Ask Follow-ups** → Refine your understanding with additional questions\n\n## 💡 Pro Tips\n\n- You can export your conversation at any time using the **Export** button in the header\n- Upload multiple charts at once for comprehensive multi-timeframe analysis\n- Paste TradingView snapshot links directly instead of downloading screenshots\n- Add context when uploading strategies for more tailored analysis\n- Use the chat to ask follow-up questions about any analysis\n\n**Ready to start? Upload your strategy or ask me anything about trading!**",
      role: 'assistant',
      timestamp: new Date(),
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [strategyAnalysis, setStrategyAnalysis] = useState<string | null>(null);
  const [strategyText, setStrategyText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chartImages, setChartImages] = useState<Array<{ base64: string; mimeType: string; timeframe: string }>>([]);

  // Strategy upload handler
  const handleStrategyUpload = useCallback(async (file: File, comments?: string) => {
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: userMsgId,
      content: `📄 Uploaded strategy: **${file.name}**${comments ? `\n\nAdditional context:\n${comments}` : ''}`,
      role: 'user',
      timestamp: new Date(),
      type: 'strategy',
      metadata: { fileName: file.name },
    }]);

    setIsAnalyzing(true);
    const streamingMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: streamingMsgId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
      type: 'strategy',
    }]);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      if (comments) {
        formData.append('additionalComments', comments);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for long documents

      const response = await fetch('/api/analyze-strategy', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze strategy');
      }

      setStrategyAnalysis(data.analysis);
      setStrategyText(data.strategyText);

      setMessages(prev => prev.map(msg =>
        msg.id === streamingMsgId
          ? { ...msg, content: data.analysis, isStreaming: false, type: 'strategy' }
          : msg
      ));
    } catch (err) {
      let errorMessage = 'Failed to analyze strategy';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'The document is extremely large and exceeded the 5-minute processing limit. Consider splitting it into smaller sections.';
        } else {
          errorMessage = err.message;
        }
      }

      setMessages(prev => prev.map(msg =>
        msg.id === streamingMsgId
          ? { ...msg, content: `❌ Error: ${errorMessage}`, isStreaming: false }
          : msg
      ));
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Chart upload handler
  const handleChartUpload = useCallback(async (charts: Array<{ file: File; timeframe: string }>) => {
    if (!strategyText) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: '⚠️ Please upload a trading strategy first before analyzing charts.',
        role: 'assistant',
        timestamp: new Date(),
      }]);
      return;
    }

    const userMsgId = Date.now().toString();
    const timeframesList = charts.map(c => c.timeframe).join(', ');

    setMessages(prev => [...prev, {
      id: userMsgId,
      content: `📊 Uploaded ${charts.length} chart${charts.length > 1 ? 's' : ''}: **${timeframesList}**`,
      role: 'user',
      timestamp: new Date(),
      type: 'chart',
      metadata: {
        chartCount: charts.length,
        timeframes: charts.map(c => c.timeframe),
      },
    }]);

    setIsAnalyzing(true);
    const streamingMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: streamingMsgId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    try {
      // Convert charts to base64 and store for future chat context
      const chartBase64Array = await Promise.all(
        charts.map(async (chart) => {
          const arrayBuffer = await chart.file.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          return {
            base64,
            mimeType: chart.file.type,
            timeframe: chart.timeframe,
          };
        })
      );

      setChartImages(chartBase64Array);

      const formData = new FormData();
      charts.forEach((chart, index) => {
        formData.append(`chart_${index}`, chart.file);
        formData.append(`timeframe_${index}`, chart.timeframe);
      });
      formData.append('chartCount', charts.length.toString());
      formData.append('strategy', strategyText);

      const response = await fetch('/api/analyze-chart', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze charts');
      }

      setMessages(prev => prev.map(msg =>
        msg.id === streamingMsgId
          ? { ...msg, content: data.analysis, isStreaming: false, type: 'chart' }
          : msg
      ));
    } catch (err) {
      setMessages(prev => prev.map(msg =>
        msg.id === streamingMsgId
          ? { ...msg, content: `❌ Error: ${err instanceof Error ? err.message : 'Failed to analyze charts'}`, isStreaming: false }
          : msg
      ));
    } finally {
      setIsAnalyzing(false);
    }
  }, [strategyText]);

  const handleReset = useCallback(() => {
    setMessages([
      {
        id: '1',
        content: "# Welcome to AI Trading Assistant! 👋\n\nI'm your AI-powered trading analysis companion, designed to help you make informed trading decisions by analyzing your strategies and charts.\n\n## 🎯 What I Can Do\n\n- **Strategy Analysis**: Upload your trading strategy PDFs or import from Notion to get comprehensive analysis of your trading rules, entry/exit criteria, and risk management\n- **Chart Analysis**: Analyze multiple chart timeframes simultaneously to identify entry opportunities based on your strategy\n- **Conversational Support**: Ask questions about trading concepts, strategy refinement, or get clarification on analysis results\n- **Multi-Timeframe Analysis**: Compare different timeframes (1M, 5M, 15M, 1H, 4H, Daily, etc.) to confirm trade setups\n\n## 📋 How to Get Started\n\n**Option 1: Strategy Analysis**\n1. Click **Upload PDF** to upload your trading strategy document\n2. Add optional context or notes about your strategy\n3. Review the AI analysis of your strategy rules and criteria\n\n**Option 2: Import from Notion**\n1. Click **Notion** to connect your workspace\n2. Browse and select your strategy document\n3. Get instant analysis of your Notion content\n\n**Option 3: General Questions**\n- Simply type your trading questions in the chat below\n- Ask about strategy development, risk management, technical analysis, etc.\n\n## 📈 Complete Workflow\n\n1. **Upload Strategy** → I'll analyze and extract key trading rules\n2. **Upload Charts** → Add chart screenshots or paste TradingView snapshot links\n3. **Specify Timeframes** → Label each chart with its timeframe (e.g., \"1H\", \"4H\")\n4. **Get Analysis** → Receive detailed entry/exit recommendations based on your strategy\n5. **Ask Follow-ups** → Refine your understanding with additional questions\n\n## 💡 Pro Tips\n\n- You can export your conversation at any time using the **Export** button in the header\n- Upload multiple charts at once for comprehensive multi-timeframe analysis\n- Paste TradingView snapshot links directly instead of downloading screenshots\n- Add context when uploading strategies for more tailored analysis\n- Use the chat to ask follow-up questions about any analysis\n\n**Ready to start? Upload your strategy or ask me anything about trading!**",
        role: 'assistant',
        timestamp: new Date(),
      }
    ]);
    setInputValue('');
    setIsAnalyzing(false);
    setStrategyAnalysis(null);
    setStrategyText('');
    setChartImages([]);
  }, []);

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(async (event) => {
    event.preventDefault();
    if (!inputValue.trim() || isAnalyzing) return;

    const userMsgId = Date.now().toString();
    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message
    setMessages(prev => [...prev, {
      id: userMsgId,
      content: userMessage,
      role: 'user',
      timestamp: new Date(),
      type: 'text',
    }]);

    setIsAnalyzing(true);
    const streamingMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: streamingMsgId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    try {
      const formData = new FormData();
      formData.append('message', userMessage);
      formData.append('strategy', strategyText || '');
      formData.append('conversationHistory', JSON.stringify(messages));
      formData.append('chartImages', JSON.stringify(chartImages));

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages(prev => prev.map(msg =>
        msg.id === streamingMsgId
          ? { ...msg, content: data.response, isStreaming: false, type: 'text' }
          : msg
      ));
    } catch (err) {
      setMessages(prev => prev.map(msg =>
        msg.id === streamingMsgId
          ? { ...msg, content: `❌ Error: ${err instanceof Error ? err.message : 'Failed to get response'}`, isStreaming: false }
          : msg
      ));
    } finally {
      setIsAnalyzing(false);
    }
  }, [inputValue, isAnalyzing, strategyText, messages]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-green-500" />
            <span className="font-medium text-sm">AI Trading Assistant</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-muted-foreground text-xs">
            Powered by House of Stocks
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                disabled={messages.length <= 1}
              >
                <Download className="size-4" />
                <span className="ml-1">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportConversation(messages, 'markdown')}>
                Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportConversation(messages, 'json')}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportConversation(messages, 'text')}>
                Export as Text
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 px-2"
          >
            <RotateCcwIcon className="size-4" />
            <span className="ml-1">Reset</span>
          </Button>
        </div>
      </div>

      {/* Conversation Area */}
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-3">
              <Message from={message.role}>
                <MessageContent>
                  {message.isStreaming && message.content === '' ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Loader size={14} />
                        <span className="text-muted-foreground text-sm">Analyzing...</span>
                      </div>
                      {message.type === 'strategy' && (
                        <span className="text-xs text-muted-foreground">
                          Large documents may take up to 5 minutes to process
                        </span>
                      )}
                    </div>
                  ) : (
                    message.content
                  )}
                </MessageContent>
                <MessageAvatar
                  src={message.role === 'user' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=trader&backgroundColor=b6e3f4' : 'https://api.dicebear.com/7.x/bottts/svg?seed=trading-ai&backgroundColor=c0aede'}
                  name={message.role === 'user' ? 'Trader' : 'AI Trading Assistant'}
                />
              </Message>
            </div>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input Area */}
      <div className="border-t">
        <UploadSection
          strategyAnalysis={strategyAnalysis}
          onStrategyUpload={handleStrategyUpload}
          onChartUpload={handleChartUpload}
          isAnalyzing={isAnalyzing}
        />

        {/* Text Input for Conversation */}
        <div className="border-t px-6 py-3">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                strategyText
                  ? "Ask follow-up questions... (Press Enter to send, Shift+Enter for new line)"
                  : "Ask me anything about trading strategies... (Press Enter to send)"
              }
              disabled={isAnalyzing}
              rows={2}
            />
            <PromptInputToolbar>
              <PromptInputTools>
                <span className="text-xs text-muted-foreground">
                  {strategyText ? '✓ Strategy loaded • Chat enabled' : 'General trading questions'}
                </span>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!inputValue.trim() || isAnalyzing}
                status={isAnalyzing ? 'streaming' : 'ready'}
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

function UploadSection({
  strategyAnalysis,
  onStrategyUpload,
  onChartUpload,
  isAnalyzing,
}: {
  strategyAnalysis: string | null;
  onStrategyUpload: (file: File, comments?: string) => void;
  onChartUpload: (charts: Array<{ file: File; timeframe: string }>) => void;
  isAnalyzing: boolean;
}) {
  const [selectedStrategyFile, setSelectedStrategyFile] = useState<File | null>(null);
  const [comments, setComments] = useState('');
  const [charts, setCharts] = useState<Array<{ file: File; previewUrl: string; timeframe: string }>>([]);
  const [showComments, setShowComments] = useState(false);
  const [tradingViewUrl, setTradingViewUrl] = useState('');
  const [showTradingViewInput, setShowTradingViewInput] = useState(false);
  const [loadingTradingView, setLoadingTradingView] = useState(false);
  const [tradingViewError, setTradingViewError] = useState<string | null>(null);

  const handleStrategySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedStrategyFile(file);
      setShowComments(true);
    }
  };

  const handleChartSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newCharts = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      timeframe: '',
    }));
    setCharts(prev => [...prev, ...newCharts]);
    e.target.value = '';
  };

  const hasStrategy = strategyAnalysis !== null && strategyAnalysis.length > 0;

  console.log('UploadSection render:', { hasStrategy, strategyAnalysisLength: strategyAnalysis?.length });

  const handleNotionPageSelected = (content: string, title: string) => {
    // Simulate file upload by calling parent's upload handler with notion content
    onStrategyUpload(
      new File([content], `${title}.txt`, { type: 'text/plain' }),
      `Imported from Notion: ${title}`
    );
  };

  const handleTradingViewLink = async () => {
    if (!tradingViewUrl.trim()) return;

    setLoadingTradingView(true);
    setTradingViewError(null);

    try {
      const response = await fetch('/api/tradingview/get-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tradingViewUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch TradingView chart');
      }

      // Convert base64 to blob and create a File object
      const byteCharacters = atob(data.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType });

      const file = new File([blob], 'tradingview-chart.png', { type: data.mimeType });
      const previewUrl = URL.createObjectURL(blob);

      setCharts(prev => [...prev, {
        file,
        previewUrl,
        timeframe: '',
      }]);

      setTradingViewUrl('');
      setShowTradingViewInput(false);
    } catch (err) {
      setTradingViewError(err instanceof Error ? err.message : 'Failed to load TradingView chart');
    } finally {
      setLoadingTradingView(false);
    }
  };

  return (
    <div className="px-6 py-3 bg-muted/30">
      {!hasStrategy ? (
        <div className="space-y-2">
          {/* Compact button row - horizontal layout */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              accept=".pdf"
              onChange={handleStrategySelect}
              disabled={isAnalyzing}
              className="hidden"
              id="strategy-file"
            />
            <label htmlFor="strategy-file">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-8"
                disabled={isAnalyzing}
                asChild
              >
                <div className="cursor-pointer">
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  <span className="text-xs">Upload PDF</span>
                </div>
              </Button>
            </label>

            <div className="h-4 w-px bg-border" />

            {/* Notion Integration - Inline */}
            <NotionConnect
              onPageSelected={handleNotionPageSelected}
              isAnalyzing={isAnalyzing}
            />
          </div>

          {selectedStrategyFile && showComments && (
            <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
              <div className="text-xs font-medium truncate">{selectedStrategyFile.name}</div>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add context (optional)..."
                rows={2}
                className="w-full resize-none rounded-md border bg-background px-2 py-1.5 text-xs"
              />
              <Button
                onClick={() => {
                  if (selectedStrategyFile) {
                    onStrategyUpload(selectedStrategyFile, comments);
                    setSelectedStrategyFile(null);
                    setComments('');
                    setShowComments(false);
                  }
                }}
                disabled={isAnalyzing}
                size="sm"
                className="w-full h-8"
              >
                Analyze Strategy
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              accept="image/*"
              onChange={handleChartSelect}
              disabled={isAnalyzing}
              className="hidden"
              id="chart-files"
              multiple
            />
            <label htmlFor="chart-files">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8"
                disabled={isAnalyzing}
                asChild
              >
                <div className="cursor-pointer">
                  <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                  <span className="text-xs">{charts.length > 0 ? `Add More (${charts.length})` : 'Upload Charts'}</span>
                </div>
              </Button>
            </label>

            <div className="h-4 w-px bg-border" />

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={isAnalyzing || loadingTradingView}
              onClick={() => setShowTradingViewInput(!showTradingViewInput)}
            >
              <Link className="mr-1.5 h-3.5 w-3.5" />
              <span className="text-xs">TradingView Link</span>
            </Button>
          </div>

          {showTradingViewInput && (
            <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
              <div className="text-xs font-medium">Add TradingView Chart</div>
              <input
                type="text"
                value={tradingViewUrl}
                onChange={(e) => setTradingViewUrl(e.target.value)}
                placeholder="Paste TradingView snapshot URL (e.g., https://www.tradingview.com/x/...)"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                disabled={loadingTradingView}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTradingViewLink();
                  }
                }}
              />
              {tradingViewError && (
                <p className="text-xs text-red-600">{tradingViewError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleTradingViewLink}
                  disabled={!tradingViewUrl.trim() || loadingTradingView}
                  size="sm"
                  className="flex-1 h-8"
                >
                  {loadingTradingView ? 'Loading...' : 'Add Chart'}
                </Button>
                <Button
                  onClick={() => {
                    setShowTradingViewInput(false);
                    setTradingViewUrl('');
                    setTradingViewError(null);
                  }}
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={loadingTradingView}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {charts.length > 0 && (
            <div className="space-y-1.5 rounded-lg border bg-muted/50 p-2">
              {charts.map((chart, index) => (
                <div key={index} className="flex items-center gap-2 rounded-md border bg-background p-1.5">
                  <img src={chart.previewUrl} alt="" className="h-10 w-10 rounded object-cover" />
                  <input
                    type="text"
                    value={chart.timeframe}
                    onChange={(e) => {
                      const newCharts = [...charts];
                      newCharts[index].timeframe = e.target.value;
                      setCharts(newCharts);
                    }}
                    placeholder="e.g., 1H"
                    className="flex-1 rounded-md border bg-background px-2 py-1 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      URL.revokeObjectURL(chart.previewUrl);
                      setCharts(charts.filter((_, i) => i !== index));
                    }}
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <Button
                onClick={() => {
                  onChartUpload(charts.map(c => ({ file: c.file, timeframe: c.timeframe })));
                  charts.forEach(c => URL.revokeObjectURL(c.previewUrl));
                  setCharts([]);
                }}
                disabled={isAnalyzing || charts.some(c => !c.timeframe.trim())}
                size="sm"
                className="w-full h-8"
              >
                {charts.some(c => !c.timeframe.trim()) ? 'Specify Timeframes' : 'Analyze Charts'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
