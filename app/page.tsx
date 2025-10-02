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
import { FileText, Image as ImageIcon, RotateCcwIcon } from 'lucide-react';
import { type FormEventHandler, useCallback, useState } from 'react';
import NotionConnect from './components/NotionConnect';
import { ThemeToggle } from './components/theme-toggle';

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

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Welcome to AI Trading Assistant! I'll help you analyze your trading strategies and charts.\n\n📊 **Step 1:** Upload your trading strategy PDF\n📈 **Step 2:** Upload chart screenshots with timeframes\n🤖 **Step 3:** Get AI-powered entry analysis\n\nLet's start by uploading your trading strategy document, or ask me anything about trading!",
      role: 'assistant',
      timestamp: new Date(),
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [strategyAnalysis, setStrategyAnalysis] = useState<string | null>(null);
  const [strategyText, setStrategyText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    }]);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      if (comments) {
        formData.append('additionalComments', comments);
      }

      const response = await fetch('/api/analyze-strategy', {
        method: 'POST',
        body: formData,
      });

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
      setMessages(prev => prev.map(msg =>
        msg.id === streamingMsgId
          ? { ...msg, content: `❌ Error: ${err instanceof Error ? err.message : 'Failed to analyze strategy'}`, isStreaming: false }
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
        content: "Welcome to AI Trading Assistant! I'll help you analyze your trading strategies and charts.\n\n📊 **Step 1:** Upload your trading strategy PDF\n📈 **Step 2:** Upload chart screenshots with timeframes\n🤖 **Step 3:** Get AI-powered entry analysis\n\nLet's start by uploading your trading strategy document!",
        role: 'assistant',
        timestamp: new Date(),
      }
    ]);
    setInputValue('');
    setIsAnalyzing(false);
    setStrategyAnalysis(null);
    setStrategyText('');
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
            Powered by Claude Sonnet 4
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
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
                    <div className="flex items-center gap-2">
                      <Loader size={14} />
                      <span className="text-muted-foreground text-sm">Analyzing...</span>
                    </div>
                  ) : (
                    message.content
                  )}
                </MessageContent>
                <MessageAvatar
                  src={message.role === 'user' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=user' : 'https://api.dicebear.com/7.x/bottts/svg?seed=ai'}
                  name={message.role === 'user' ? 'User' : 'AI Assistant'}
                />
              </Message>
            </div>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input Area */}
      <div className="border-t p-4 space-y-4">
        <UploadSection
          strategyAnalysis={strategyAnalysis}
          onStrategyUpload={handleStrategyUpload}
          onChartUpload={handleChartUpload}
          isAnalyzing={isAnalyzing}
        />

        {/* Text Input for Conversation */}
        <div className="border-t pt-4">
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

  return (
    <div className="space-y-3">
      {!hasStrategy ? (
        <div className="space-y-3">
          {/* PDF Upload */}
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
              className="w-full"
              disabled={isAnalyzing}
              asChild
            >
              <div className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                Upload Trading Strategy PDF
              </div>
            </Button>
          </label>

          {/* Notion Integration */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <NotionConnect
            onPageSelected={handleNotionPageSelected}
            isAnalyzing={isAnalyzing}
          />

          {selectedStrategyFile && showComments && (
            <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
              <div className="text-sm font-medium">{selectedStrategyFile.name}</div>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add additional context (optional)..."
                rows={3}
                className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm"
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
                className="w-full"
              >
                Analyze Strategy
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
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
              className="w-full"
              disabled={isAnalyzing}
              asChild
            >
              <div className="cursor-pointer">
                <ImageIcon className="mr-2 h-4 w-4" />
                {charts.length > 0 ? `Add More Charts (${charts.length})` : 'Upload Chart Screenshots'}
              </div>
            </Button>
          </label>

          {charts.length > 0 && (
            <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
              {charts.map((chart, index) => (
                <div key={index} className="flex items-center gap-2 rounded-md border bg-background p-2">
                  <img src={chart.previewUrl} alt="" className="h-12 w-12 rounded object-cover" />
                  <input
                    type="text"
                    value={chart.timeframe}
                    onChange={(e) => {
                      const newCharts = [...charts];
                      newCharts[index].timeframe = e.target.value;
                      setCharts(newCharts);
                    }}
                    placeholder="Timeframe (e.g., 1H)"
                    className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
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
                className="w-full"
              >
                {charts.some(c => !c.timeframe.trim()) ? 'Specify All Timeframes' : 'Analyze Charts'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
