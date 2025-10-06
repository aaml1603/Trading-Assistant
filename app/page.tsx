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
import { FileText, Image as ImageIcon, RotateCcwIcon, Download, Link, Copy, Check, LogOut, X, MessageSquarePlus, Trash2, Menu, Settings, Pencil, Mic, MicOff } from 'lucide-react';
import { type FormEventHandler, useCallback, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import NotionConnect from './components/NotionConnect';
import { ThemeToggle } from './components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';

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

// Strip markdown formatting for plain text copy
const stripMarkdown = (markdown: string): string => {
  return markdown
    // Remove headers
    .replace(/#{1,6}\s+/g, '')
    // Remove bold/italic
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove blockquotes
    .replace(/^\s*>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '')
    // Remove list markers
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export default function Home() {
  const { user, logout, isLoading, token } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader size={32} />
      </div>
    );
  }

  // Show auth form if not logged in
  if (!user || !token) {
    return <AuthForm />;
  }

  // User is logged in, show the app
  return <TradingAssistant />;
}

function TradingAssistant() {
  const { user, logout, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "# Welcome to AI Trading Assistant! 👋\n\nI'm your AI-powered trading analysis companion, designed to help you make informed trading decisions by analyzing your strategies and charts.\n\n---\n\n## 🎯 What I Can Do\n\n- **Strategy Analysis**: Upload your trading strategy PDFs or import from Notion to get comprehensive analysis of your trading rules, entry/exit criteria, and risk management\n\n- **Chart Analysis**: Analyze multiple chart timeframes simultaneously to identify entry opportunities based on your strategy\n\n- **Indicator Analysis**: Upload images of your indicators alongside charts for deeper technical analysis\n\n- **Conversational Support**: Ask questions about trading concepts, strategy refinement, or get clarification on analysis results\n\n- **Multi-Timeframe Analysis**: Compare different timeframes (1M, 5M, 15M, 1H, 4H, Daily, etc.) to confirm trade setups\n\n---\n\n## 📋 How to Get Started\n\n**Option 1: Strategy Analysis**\n\n1. Click **Upload PDF** to upload your trading strategy document\n\n2. Add optional context or notes about your strategy\n\n3. Review the AI analysis of your strategy rules and criteria\n\n**Option 2: Import from Notion**\n\n1. Click **Notion** to connect your workspace\n\n2. Browse and select your strategy document\n\n3. Get instant analysis of your Notion content\n\n**Option 3: General Questions**\n\n- Simply type your trading questions in the chat below\n\n- Ask about strategy development, risk management, technical analysis, etc.\n\n---\n\n## 📈 Complete Workflow\n\n1. **Upload Strategy** → I'll analyze and extract key trading rules\n\n2. **Upload Charts & Indicators** → Add chart screenshots and indicator images to show market conditions\n\n3. **Specify Timeframes** → Label each chart with its timeframe (e.g., \"1H\", \"4H\")\n\n4. **Get Analysis** → Receive detailed entry/exit recommendations based on your strategy\n\n5. **Ask Follow-ups** → Refine your understanding with additional questions\n\n---\n\n## 💡 Pro Tips\n\n- You can export your conversation at any time using the **Export** button in the header\n\n- Upload multiple charts at once for comprehensive multi-timeframe analysis\n\n- **Include indicator screenshots** alongside your charts for more accurate analysis\n\n- Add context when uploading strategies for more tailored analysis\n\n- Use the chat to ask follow-up questions about any analysis\n\n---\n\n**Ready to start? Upload your strategy or ask me anything about trading!**",
      role: 'assistant',
      timestamp: new Date(),
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [strategyAnalysis, setStrategyAnalysis] = useState<string | null>(null);
  const [strategyText, setStrategyText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chartImages, setChartImages] = useState<Array<{ base64: string; mimeType: string; timeframe: string }>>([]);
  const [indicatorImages, setIndicatorImages] = useState<Array<{ base64: string; mimeType: string }>>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [pastedImages, setPastedImages] = useState<Array<{ base64: string; mimeType: string; previewUrl: string }>>([]);

  // Conversation management
  const [conversations, setConversations] = useState<Array<{ _id: string; title: string; updatedAt: Date; lastMessageAt: Date; isManuallyRenamed?: boolean }>>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  // Custom instructions
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [tempInstructions, setTempInstructions] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);

  // Load all conversations
  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, [token]);

  // Load a specific conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(data.conversation.messages || []);
        setStrategyText(data.conversation.strategyText || '');
        setStrategyAnalysis(data.conversation.strategyAnalysis || null);
        setCurrentConversationId(conversationId);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }, [token]);

  // Create new conversation
  const createNewConversation = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'New Conversation' }),
      });
      const data = await response.json();
      if (response.ok) {
        setCurrentConversationId(data.conversationId);
        setMessages([{
          id: '1',
          content: "# Welcome to AI Trading Assistant! 👋\n\nI'm your AI-powered trading analysis companion, designed to help you make informed trading decisions by analyzing your strategies and charts.\n\n---\n\n## 🎯 What I Can Do\n\n- **Strategy Analysis**: Upload your trading strategy PDFs or import from Notion to get comprehensive analysis of your trading rules, entry/exit criteria, and risk management\n\n- **Chart Analysis**: Analyze multiple chart timeframes simultaneously to identify entry opportunities based on your strategy\n\n- **Indicator Analysis**: Upload images of your indicators alongside charts for deeper technical analysis\n\n- **Conversational Support**: Ask questions about trading concepts, strategy refinement, or get clarification on analysis results\n\n- **Multi-Timeframe Analysis**: Compare different timeframes (1M, 5M, 15M, 1H, 4H, Daily, etc.) to confirm trade setups\n\n---\n\n## 📋 How to Get Started\n\n**Option 1: Strategy Analysis**\n\n1. Click **Upload PDF** to upload your trading strategy document\n\n2. Add optional context or notes about your strategy\n\n3. Review the AI analysis of your strategy rules and criteria\n\n**Option 2: Import from Notion**\n\n1. Click **Notion** to connect your workspace\n\n2. Browse and select your strategy document\n\n3. Get instant analysis of your Notion content\n\n**Option 3: General Questions**\n\n- Simply type your trading questions in the chat below\n\n- Ask about strategy development, risk management, technical analysis, etc.\n\n---\n\n## 📈 Complete Workflow\n\n1. **Upload Strategy** → I'll analyze and extract key trading rules\n\n2. **Upload Charts & Indicators** → Add chart screenshots and indicator images to show market conditions\n\n3. **Specify Timeframes** → Label each chart with its timeframe (e.g., \"1H\", \"4H\")\n\n4. **Get Analysis** → Receive detailed entry/exit recommendations based on your strategy\n\n5. **Ask Follow-ups** → Refine your understanding with additional questions\n\n---\n\n## 💡 Pro Tips\n\n- You can export your conversation at any time using the **Export** button in the header\n\n- Upload multiple charts at once for comprehensive multi-timeframe analysis\n\n- **Include indicator screenshots** alongside your charts for more accurate analysis\n\n- Add context when uploading strategies for more tailored analysis\n\n- Use the chat to ask follow-up questions about any analysis\n\n---\n\n**Ready to start? Upload your strategy or ask me anything about trading!**",
          role: 'assistant',
          timestamp: new Date(),
        }]);
        setStrategyText('');
        setStrategyAnalysis(null);
        setChartImages([]);
        setIndicatorImages([]);
        await loadConversations();
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  }, [token, loadConversations]);

  // Save current conversation
  const saveConversation = useCallback(async () => {
    if (!currentConversationId) return;

    try {
      await fetch(`/api/conversations/${currentConversationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          strategyText,
          strategyAnalysis,
        }),
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }, [currentConversationId, messages, strategyText, strategyAnalysis, token]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        if (currentConversationId === conversationId) {
          await createNewConversation();
        }
        await loadConversations();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }, [token, currentConversationId, createNewConversation, loadConversations]);

  // Rename conversation
  const renameConversation = useCallback(async (conversationId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle,
          isManuallyRenamed: true,
        }),
      });
      if (response.ok) {
        await loadConversations();
        setEditingConversationId(null);
        setEditingTitle('');
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
    }
  }, [token, loadConversations]);

  // Load custom instructions
  const loadCustomInstructions = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/instructions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomInstructions(data.customInstructions || '');
        setTempInstructions(data.customInstructions || '');
      }
    } catch (error) {
      console.error('Error loading custom instructions:', error);
    }
  }, [token]);

  // Save custom instructions
  const saveCustomInstructions = useCallback(async () => {
    setSavingInstructions(true);
    try {
      const response = await fetch('/api/auth/instructions', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customInstructions: tempInstructions }),
      });
      if (response.ok) {
        setCustomInstructions(tempInstructions);
        setSettingsOpen(false);
      }
    } catch (error) {
      console.error('Error saving custom instructions:', error);
    } finally {
      setSavingInstructions(false);
    }
  }, [token, tempInstructions]);

  // Load conversations and custom instructions on mount
  useEffect(() => {
    if (token) {
      loadConversations();
      loadCustomInstructions();
    }
  }, [token, loadConversations, loadCustomInstructions]);

  // Create first conversation if none exist, or load first conversation if none is selected
  useEffect(() => {
    if (!loadingConversations) {
      if (conversations.length === 0 && !currentConversationId) {
        createNewConversation();
      } else if (!currentConversationId && conversations.length > 0) {
        loadConversation(conversations[0]._id);
      }
    }
  }, [conversations, currentConversationId, loadConversation, loadingConversations, createNewConversation]);

  // Auto-save conversation when messages change
  useEffect(() => {
    if (currentConversationId && messages.length > 1) {
      const timeoutId = setTimeout(() => {
        saveConversation();
      }, 1000); // Debounce save by 1 second
      return () => clearTimeout(timeoutId);
    }
  }, [messages, currentConversationId, saveConversation]);

  // Cleanup pasted image URLs on unmount
  useEffect(() => {
    return () => {
      pastedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
  }, [pastedImages]);

  // Helper function to generate AI title
  const generateAndUpdateTitle = useCallback(async (conversationId: string, conversationMessages: ChatMessage[]) => {
    try {
      // Check if conversation is manually renamed
      const conversation = conversations.find(c => c._id === conversationId);
      if (conversation?.isManuallyRenamed) {
        return; // Don't auto-update manually renamed conversations
      }

      const response = await fetch('/api/conversations/generate-title', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: conversationMessages }),
      });

      if (response.ok) {
        const { title } = await response.json();
        await fetch(`/api/conversations/${conversationId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title }),
        });
        await loadConversations();
      }
    } catch (error) {
      console.error('Error generating title:', error);
    }
  }, [token, loadConversations, conversations]);

  // Strategy upload handler
  const handleStrategyUpload = useCallback(async (file: File, comments?: string) => {
    const isFirstMessage = messages.length === 1; // Only welcome message
    const userMsgId = Date.now().toString();
    const userContent = `Uploaded strategy: **${file.name}**${comments ? `\n\nAdditional context:\n${comments}` : ''}`;

    setMessages(prev => [...prev, {
      id: userMsgId,
      content: userContent,
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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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

      const assistantMessage: ChatMessage = {
        id: streamingMsgId,
        content: data.analysis,
        role: 'assistant',
        timestamp: new Date(),
        isStreaming: false,
        type: 'strategy',
      };

      setMessages(prev => prev.map(msg =>
        msg.id === streamingMsgId ? assistantMessage : msg
      ));

      // Generate AI title after first strategy upload
      if (isFirstMessage && currentConversationId) {
        const updatedMessages = [
          ...messages,
          { id: userMsgId, content: userContent, role: 'user' as const, timestamp: new Date(), type: 'strategy' as const, metadata: { fileName: file.name } },
          assistantMessage,
        ];
        generateAndUpdateTitle(currentConversationId, updatedMessages);
      }
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
          ? { ...msg, content: `Error: ${errorMessage}`, isStreaming: false }
          : msg
      ));
    } finally {
      setIsAnalyzing(false);
    }
  }, [messages, currentConversationId, token, generateAndUpdateTitle]);

  // Chart upload handler
  const handleChartUpload = useCallback(async (charts: Array<{ file: File; timeframe: string }>, indicators: File[], description?: string) => {
    if (!strategyText) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: '⚠️ Please upload a trading strategy first before analyzing charts.',
        role: 'assistant',
        timestamp: new Date(),
      }]);
      return;
    }

    const isFirstMessage = messages.length === 1; // Only welcome message
    const userMsgId = Date.now().toString();
    const timeframesList = charts.map(c => c.timeframe).join(', ');
    const indicatorText = indicators.length > 0 ? ` and ${indicators.length} indicator image${indicators.length > 1 ? 's' : ''}` : '';
    const userContent = `Uploaded ${charts.length} chart${charts.length > 1 ? 's' : ''}: **${timeframesList}**${indicatorText}`;

    setMessages(prev => [...prev, {
      id: userMsgId,
      content: userContent,
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

      // Convert indicators to base64 and store for future chat context
      const indicatorBase64Array = await Promise.all(
        indicators.map(async (indicator) => {
          const arrayBuffer = await indicator.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          return {
            base64,
            mimeType: indicator.type,
          };
        })
      );

      setIndicatorImages(indicatorBase64Array);

      const formData = new FormData();
      charts.forEach((chart, index) => {
        formData.append(`chart_${index}`, chart.file);
        formData.append(`timeframe_${index}`, chart.timeframe);
      });
      formData.append('chartCount', charts.length.toString());

      indicators.forEach((indicator, index) => {
        formData.append(`indicator_${index}`, indicator);
      });
      formData.append('indicatorCount', indicators.length.toString());

      formData.append('strategy', strategyText);

      if (description) {
        formData.append('description', description);
      }

      const response = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze charts');
      }

      const assistantMessage: ChatMessage = {
        id: streamingMsgId,
        content: data.analysis,
        role: 'assistant',
        timestamp: new Date(),
        isStreaming: false,
        type: 'chart',
      };

      setMessages(prev => prev.map(msg =>
        msg.id === streamingMsgId ? assistantMessage : msg
      ));

      // Generate AI title after first chart upload
      if (isFirstMessage && currentConversationId) {
        const updatedMessages = [
          ...messages,
          {
            id: userMsgId,
            content: userContent,
            role: 'user' as const,
            timestamp: new Date(),
            type: 'chart' as const,
            metadata: {
              chartCount: charts.length,
              timeframes: charts.map(c => c.timeframe),
            },
          },
          assistantMessage,
        ];
        generateAndUpdateTitle(currentConversationId, updatedMessages);
      }
    } catch (err) {
      setMessages(prev => prev.map(msg =>
        msg.id === streamingMsgId
          ? { ...msg, content: `Error: ${err instanceof Error ? err.message : 'Failed to analyze charts'}`, isStreaming: false }
          : msg
      ));
    } finally {
      setIsAnalyzing(false);
    }
  }, [strategyText, messages, currentConversationId, token, generateAndUpdateTitle]);

  const handleReset = useCallback(() => {
    createNewConversation();
  }, [createNewConversation]);

  // Handle paste in chat input
  const handlePasteInChat = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            const previewUrl = URL.createObjectURL(blob);
            setPastedImages(prev => [...prev, {
              base64,
              mimeType: blob.type,
              previewUrl,
            }]);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  }, []);

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(async (event) => {
    event.preventDefault();
    if ((!inputValue.trim() && pastedImages.length === 0) || isAnalyzing) return;

    const userMsgId = Date.now().toString();
    const userMessage = inputValue.trim();
    const currentPastedImages = [...pastedImages];
    setInputValue('');
    setPastedImages([]);

    const isFirstMessage = messages.length === 1; // Only welcome message

    // Build user message content
    let userContent = userMessage;
    if (currentPastedImages.length > 0) {
      if (userMessage) {
        userContent = `${userMessage}\n\n📎 Attached ${currentPastedImages.length} image${currentPastedImages.length > 1 ? 's' : ''}`;
      } else {
        userContent = `📎 Sent ${currentPastedImages.length} image${currentPastedImages.length > 1 ? 's' : ''}`;
      }
    }

    // Add user message
    setMessages(prev => [...prev, {
      id: userMsgId,
      content: userContent,
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
      // Combine chart images, indicator images, and pasted images
      const allImages = [
        ...chartImages,
        ...currentPastedImages.map(img => ({ ...img, timeframe: 'Pasted' }))
      ];
      const allIndicators = [
        ...indicatorImages,
      ];

      // If user sends images without text, provide a default message
      const messageToSend = userMessage || (currentPastedImages.length > 0 ? 'Please analyze this image in the context of my trading strategy.' : '');

      const formData = new FormData();
      formData.append('message', messageToSend);
      formData.append('strategy', strategyText || '');
      formData.append('conversationHistory', JSON.stringify(messages));
      formData.append('chartImages', JSON.stringify(allImages));
      formData.append('indicatorImages', JSON.stringify(allIndicators));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: ChatMessage = {
        id: streamingMsgId,
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
        isStreaming: false,
        type: 'text',
      };

      setMessages(prev => prev.map(msg =>
        msg.id === streamingMsgId ? assistantMessage : msg
      ));

      // Generate AI title after first response
      if (isFirstMessage && currentConversationId) {
        const updatedMessages = [
          ...messages,
          { id: userMsgId, content: userMessage, role: 'user' as const, timestamp: new Date(), type: 'text' as const },
          assistantMessage,
        ];
        generateAndUpdateTitle(currentConversationId, updatedMessages);
      }
    } catch (err) {
      let errorMessage = 'Failed to get response';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'The request took too long and timed out after 5 minutes. Please try simplifying your question or reducing the number of images.';
        } else {
          errorMessage = err.message;
        }
      }

      setMessages(prev => prev.map(msg =>
        msg.id === streamingMsgId
          ? { ...msg, content: `Error: ${errorMessage}`, isStreaming: false }
          : msg
      ));
    } finally {
      setIsAnalyzing(false);
    }
  }, [inputValue, isAnalyzing, strategyText, messages, currentConversationId, token, generateAndUpdateTitle, pastedImages, chartImages, indicatorImages]);

  const handleCopyMessage = useCallback((messageId: string, content: string) => {
    const plainText = stripMarkdown(content);
    navigator.clipboard.writeText(plainText).then(() => {
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden rounded-lg sm:rounded-xl border bg-background shadow-sm">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'flex' : 'hidden'} sm:flex flex-col w-64 border-r bg-muted/30 overflow-hidden`}>
        <div className="flex items-center justify-between p-3 border-b">
          <h2 className="font-semibold text-sm">Conversations</h2>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={createNewConversation}
            title="New conversation"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-4">
              <Loader size={16} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv._id}
                className={`w-full text-left px-2 py-2 rounded text-xs transition-colors ${
                  currentConversationId === conv._id ? 'bg-muted' : ''
                } ${editingConversationId === conv._id ? '' : 'hover:bg-muted/50 cursor-pointer group'}`}
                onClick={() => {
                  if (editingConversationId !== conv._id) {
                    loadConversation(conv._id);
                  }
                }}
              >
                {editingConversationId === conv._id ? (
                  <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          renameConversation(conv._id, editingTitle);
                        } else if (e.key === 'Escape') {
                          setEditingConversationId(null);
                          setEditingTitle('');
                        }
                      }}
                      className="w-full px-2 py-1 text-xs rounded border bg-background"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-6 flex-1 text-xs"
                        onClick={() => renameConversation(conv._id, editingTitle)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 flex-1 text-xs"
                        onClick={() => {
                          setEditingConversationId(null);
                          setEditingTitle('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-1">
                      <span className="flex-1 truncate font-medium">
                        {conv.title}
                      </span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingConversationId(conv._id);
                            setEditingTitle(conv.title);
                          }}
                          title="Rename"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv._id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(conv.lastMessageAt).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-muted/50 px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 sm:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="size-2 rounded-full bg-green-500" />
              <span className="font-medium text-xs sm:text-sm">AI Trading Assistant</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <span className="hidden sm:block text-muted-foreground text-xs">
              {user?.email}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTempInstructions(customInstructions);
                setSettingsOpen(true);
              }}
              className="h-7 sm:h-8 px-1.5 sm:px-2"
              title="Custom Instructions"
            >
              <Settings className="size-3.5 sm:size-4" />
              <span className="ml-1 hidden sm:inline">Settings</span>
            </Button>
            <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 sm:h-8 px-1.5 sm:px-2"
                disabled={messages.length <= 1}
              >
                <Download className="size-3.5 sm:size-4" />
                <span className="ml-1 hidden sm:inline">Export</span>
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
            className="h-7 sm:h-8 px-1.5 sm:px-2"
          >
            <RotateCcwIcon className="size-3.5 sm:size-4" />
            <span className="ml-1 hidden sm:inline">Reset</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="h-7 sm:h-8 px-1.5 sm:px-2"
            title="Logout"
          >
            <LogOut className="size-3.5 sm:size-4" />
            <span className="ml-1 hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* Conversation Area */}
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-3 group">
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
                  ) : message.role === 'user' ? (
                    // User messages - simple text, no markdown rendering
                    message.content
                  ) : (
                    // Assistant messages - render markdown with copy button
                    <div className="relative">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm sm:text-base">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-1 -right-1 h-6 w-6 sm:h-7 sm:w-7 p-0 opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation active:opacity-100"
                        onClick={() => handleCopyMessage(message.id, message.content)}
                        title="Copy response"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        )}
                      </Button>
                    </div>
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
          token={token!}
        />

        {/* Text Input for Conversation */}
        <div className="border-t px-3 sm:px-6 py-2 sm:py-3">
          {/* Pasted Images Preview */}
          {pastedImages.length > 0 && (
            <div className="mb-2 flex gap-2 flex-wrap">
              {pastedImages.map((img, index) => (
                <div key={index} className="relative group">
                  <img src={img.previewUrl} alt="" className="h-16 w-16 sm:h-20 sm:w-20 rounded object-cover border" />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-background/90 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      URL.revokeObjectURL(img.previewUrl);
                      setPastedImages(pastedImages.filter((_, i) => i !== index));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPaste={handlePasteInChat}
              placeholder={
                strategyText
                  ? "Ask follow-up questions or paste images..."
                  : "Ask me anything about trading or paste images..."
              }
              disabled={isAnalyzing}
              rows={2}
              className="text-sm sm:text-base"
            />
            <PromptInputToolbar>
              <PromptInputTools>
                {pastedImages.length > 0 ? (
                  <span className="text-xs sm:text-xs text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {pastedImages.length} image{pastedImages.length > 1 ? 's' : ''} attached
                  </span>
                ) : strategyText ? (
                  <span className="text-xs sm:text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Strategy loaded • Chat enabled
                  </span>
                ) : (
                  <span className="text-xs sm:text-xs text-muted-foreground hidden sm:block">
                    General trading questions
                  </span>
                )}
              </PromptInputTools>
              <PromptInputSubmit
                disabled={(!inputValue.trim() && pastedImages.length === 0) || isAnalyzing}
                status={isAnalyzing ? 'streaming' : 'ready'}
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSettingsOpen(false)}>
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Custom Instructions</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSettingsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Add custom instructions that the AI will always follow in every conversation. These instructions will be included in all chat responses, strategy analyses, and chart analyses.
              </p>
              <textarea
                value={tempInstructions}
                onChange={(e) => setTempInstructions(e.target.value)}
                placeholder="e.g., Always respond in Spanish, focus on swing trading setups, avoid risky strategies..."
                className="w-full min-h-[200px] resize-none rounded-md border bg-background px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-2">
                {customInstructions && (
                  <span className="text-xs text-muted-foreground">
                    Current instructions active
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSettingsOpen(false)}
                disabled={savingInstructions}
              >
                Cancel
              </Button>
              <Button
                onClick={saveCustomInstructions}
                disabled={savingInstructions}
              >
                {savingInstructions ? 'Saving...' : 'Save Instructions'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadSection({
  strategyAnalysis,
  onStrategyUpload,
  onChartUpload,
  isAnalyzing,
  token,
}: {
  strategyAnalysis: string | null;
  onStrategyUpload: (file: File, comments?: string) => void;
  onChartUpload: (charts: Array<{ file: File; timeframe: string }>, indicators: File[], description?: string) => void;
  isAnalyzing: boolean;
  token: string;
}) {
  const [selectedStrategyFile, setSelectedStrategyFile] = useState<File | null>(null);
  const [comments, setComments] = useState('');
  const [charts, setCharts] = useState<Array<{ file: File; previewUrl: string; timeframe: string }>>([]);
  const [indicators, setIndicators] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const [showComments, setShowComments] = useState(false);
  const [tradingViewUrl, setTradingViewUrl] = useState('');
  const [showTradingViewInput, setShowTradingViewInput] = useState(false);
  const [loadingTradingView, setLoadingTradingView] = useState(false);
  const [tradingViewError, setTradingViewError] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const [chartDescription, setChartDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recognition, setRecognition] = useState<{
    start: () => void;
    stop: () => void;
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
  } | null>(null);

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

  const handleIndicatorSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newIndicators = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setIndicators(prev => [...prev, ...newIndicators]);
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let pastedImage = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Check if the item is an image
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        pastedImage = true;

        const blob = item.getAsFile();
        if (blob) {
          // Create a proper File object with a name
          const timestamp = new Date().getTime();
          const extension = blob.type.split('/')[1] || 'png';
          const file = new File([blob], `pasted-chart-${timestamp}.${extension}`, { type: blob.type });

          const previewUrl = URL.createObjectURL(file);
          setCharts(prev => [...prev, {
            file,
            previewUrl,
            timeframe: '',
          }]);
        }
      }
    }

    if (pastedImage) {
      setPasteSuccess(true);
      setTimeout(() => setPasteSuccess(false), 2000);
    }
  };

  const hasStrategy = strategyAnalysis !== null && strategyAnalysis.length > 0;

  console.log('UploadSection render:', { hasStrategy, strategyAnalysisLength: strategyAnalysis?.length });

  // Initialize speech recognition on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        const recognitionInstance = new SpeechRecognitionAPI();
        recognitionInstance.continuous = true; // Keep listening until manually stopped
        recognitionInstance.interimResults = true; // Show interim results as user speaks
        recognitionInstance.lang = 'en-US';
        recognitionInstance.maxAlternatives = 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognitionInstance.onresult = (event: any) => {
          let finalTranscript = '';
          let interimText = '';

          // Process all results
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimText += transcript;
            }
          }

          // Show interim results
          setInterimTranscript(interimText);

          // Update description with final transcript only
          if (finalTranscript) {
            setChartDescription(prev => {
              const newText = prev ? `${prev} ${finalTranscript}`.trim() : finalTranscript.trim();
              return newText;
            });
            setInterimTranscript(''); // Clear interim after final
          }
        };

        recognitionInstance.onerror = (event: { error: string }) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'no-speech') {
            // Don't stop on no-speech, just continue listening
            console.log('No speech detected, continuing to listen...');
          } else {
            setIsRecording(false);
          }
        };

        recognitionInstance.onend = () => {
          // Auto-restart if still in recording mode (prevents auto-stop)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stillRecording = (window as any)._isRecording;
          if (stillRecording) {
            try {
              recognitionInstance.start();
            } catch (e) {
              console.log('Recognition restart failed:', e);
              setIsRecording(false);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window as any)._isRecording = false;
            }
          }
        };

        setRecognition(recognitionInstance);
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) {
      alert('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)._isRecording = false;
      setInterimTranscript('');
    } else {
      try {
        recognition.start();
        setIsRecording(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any)._isRecording = true;
      } catch (e) {
        console.error('Failed to start recognition:', e);
        alert('Failed to start voice recognition. Please check your microphone permissions.');
      }
    }
  };

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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
    <div className="px-3 sm:px-6 py-2 sm:py-3 bg-muted/30" onPaste={hasStrategy ? handlePaste : undefined}>
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
                className="h-7 sm:h-8 text-xs"
                disabled={isAnalyzing}
                asChild
              >
                <div className="cursor-pointer">
                  <FileText className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="text-xs">Upload PDF</span>
                </div>
              </Button>
            </label>

            <div className="hidden sm:block h-4 w-px bg-border" />

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
                className="w-full h-8 text-xs sm:text-sm"
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
                className="h-7 sm:h-8 text-xs"
                disabled={isAnalyzing}
                asChild
              >
                <div className="cursor-pointer">
                  <ImageIcon className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="text-xs">{charts.length > 0 ? `Charts (${charts.length})` : 'Charts'}</span>
                </div>
              </Button>
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleIndicatorSelect}
              disabled={isAnalyzing}
              className="hidden"
              id="indicator-files"
              multiple
            />
            <label htmlFor="indicator-files">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 sm:h-8 text-xs"
                disabled={isAnalyzing}
                asChild
              >
                <div className="cursor-pointer">
                  <ImageIcon className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="text-xs">{indicators.length > 0 ? `Indicators (${indicators.length})` : 'Indicators'}</span>
                </div>
              </Button>
            </label>

            <span className="text-xs text-muted-foreground hidden sm:inline">or paste images</span>

            {pasteSuccess && (
              <span className="text-xs text-green-600 font-medium animate-in fade-in flex items-center gap-1">
                <Check className="h-3 w-3" />
                Image pasted
              </span>
            )}

            <div className="hidden sm:block h-4 w-px bg-border" />

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 sm:h-8 text-xs"
              disabled={isAnalyzing || loadingTradingView}
              onClick={() => setShowTradingViewInput(!showTradingViewInput)}
            >
              <Link className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="text-xs hidden sm:inline">TradingView Link</span>
              <span className="text-xs sm:hidden">TV Link</span>
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

          {indicators.length > 0 && (
            <div className="space-y-1.5 rounded-lg border bg-muted/50 p-2">
              <div className="text-xs font-medium text-muted-foreground px-1">Indicator Images</div>
              <div className="flex flex-wrap gap-1.5">
                {indicators.map((indicator, index) => (
                  <div key={index} className="relative group">
                    <img src={indicator.previewUrl} alt="" className="h-16 w-16 sm:h-20 sm:w-20 rounded object-cover border" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-background/90 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        URL.revokeObjectURL(indicator.previewUrl);
                        setIndicators(indicators.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {charts.length > 0 && (
            <div className="space-y-1.5 rounded-lg border bg-muted/50 p-2">
              <div className="text-xs font-medium text-muted-foreground px-1">Charts with Timeframes</div>
              {charts.map((chart, index) => (
                <div key={index} className="flex items-center gap-1.5 sm:gap-2 rounded-md border bg-background p-1.5">
                  <img src={chart.previewUrl} alt="" className="h-8 w-8 sm:h-10 sm:w-10 rounded object-cover" />
                  <input
                    type="text"
                    value={chart.timeframe}
                    onChange={(e) => {
                      const newCharts = [...charts];
                      newCharts[index].timeframe = e.target.value;
                      setCharts(newCharts);
                    }}
                    placeholder="e.g., 1H"
                    className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-xs"
                    onClick={() => {
                      URL.revokeObjectURL(chart.previewUrl);
                      setCharts(charts.filter((_, i) => i !== index));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {/* Chart Description with Voice Input */}
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground px-1">Chart Description (Optional)</div>
                <div className="flex gap-1.5">
                  <textarea
                    value={chartDescription}
                    onChange={(e) => setChartDescription(e.target.value)}
                    placeholder="Describe what you see... e.g., 'Price at resistance, RSI overbought at 72'"
                    rows={2}
                    className="flex-1 resize-none rounded-md border bg-background px-2 py-1.5 text-xs"
                  />
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    className="h-auto px-2"
                    onClick={toggleRecording}
                    title={isRecording ? "Stop recording" : "Start voice input"}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
                {isRecording && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 px-1">
                      <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground">Listening... Click mic again to stop</span>
                    </div>
                    {interimTranscript && (
                      <div className="px-1 py-1 text-xs text-muted-foreground italic border-l-2 border-red-500 pl-2">
                        {interimTranscript}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                onClick={() => {
                  onChartUpload(
                    charts.map(c => ({ file: c.file, timeframe: c.timeframe })),
                    indicators.map(i => i.file),
                    chartDescription.trim() || undefined
                  );
                  charts.forEach(c => URL.revokeObjectURL(c.previewUrl));
                  indicators.forEach(i => URL.revokeObjectURL(i.previewUrl));
                  setCharts([]);
                  setIndicators([]);
                  setChartDescription('');
                }}
                disabled={isAnalyzing || charts.some(c => !c.timeframe.trim())}
                size="sm"
                className="w-full h-8 text-xs sm:text-sm"
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
