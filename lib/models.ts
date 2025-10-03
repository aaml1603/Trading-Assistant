import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  password: string; // hashed
  createdAt: Date;
  notionAccessToken?: string;
  notionWorkspaceName?: string;
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

export const COLLECTIONS = {
  USERS: 'users',
  STRATEGIES: 'strategies',
} as const;
