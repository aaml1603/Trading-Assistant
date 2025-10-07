import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  password: string; // hashed
  createdAt: Date;
  notionAccessToken?: string;
  notionWorkspaceName?: string;
  customInstructions?: string;
}

export interface Strategy {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  analysis: string;
  strategyText: string;
  fileType?: string;
  additionalComments?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
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
}

export interface Conversation {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  messages: ChatMessage[];
  strategies?: Array<{ id: string; name: string; text: string; analysis: string }>;
  // Legacy fields for backward compatibility
  strategyText?: string;
  strategyAnalysis?: string;
  isManuallyRenamed?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

export const COLLECTIONS = {
  USERS: 'users',
  STRATEGIES: 'strategies',
  CONVERSATIONS: 'conversations',
} as const;
