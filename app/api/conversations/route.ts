import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { COLLECTIONS, Conversation } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - List all conversations for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = await getDb();
    const conversations = await db
      .collection<Conversation>(COLLECTIONS.CONVERSATIONS)
      .find({ userId: new ObjectId(payload.userId) })
      .sort({ lastMessageAt: -1 })
      .toArray();

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { title } = await request.json();

    const db = await getDb();
    const now = new Date();

    const conversation: Conversation = {
      userId: new ObjectId(payload.userId),
      title: title || 'New Conversation',
      messages: [],
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    };

    const result = await db
      .collection<Conversation>(COLLECTIONS.CONVERSATIONS)
      .insertOne(conversation);

    return NextResponse.json({
      conversationId: result.insertedId.toString(),
      conversation: { ...conversation, _id: result.insertedId },
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
