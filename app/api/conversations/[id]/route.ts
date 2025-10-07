import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { COLLECTIONS, Conversation } from '@/lib/models';
import { verifyToken } from '@/lib/auth';
import { validateConversationTitle, sanitizeString } from '@/lib/input-validation';

export const dynamic = 'force-dynamic';

// GET - Get a specific conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const db = await getDb();
    const conversation = await db
      .collection<Conversation>(COLLECTIONS.CONVERSATIONS)
      .findOne({
        _id: new ObjectId(id),
        userId: new ObjectId(payload.userId),
      });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// PATCH - Update a conversation (add messages, update strategy, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const body = await request.json();
    const { messages, strategies, strategyText, strategyAnalysis, title, isManuallyRenamed } = body;

    // Validate title if provided
    if (title !== undefined) {
      const titleValidation = validateConversationTitle(title);
      if (!titleValidation.valid) {
        return NextResponse.json(
          { error: titleValidation.error },
          { status: 400 }
        );
      }
    }

    const { id } = await params;
    const db = await getDb();
    const now = new Date();

    const updateFields: Partial<Conversation> = {
      updatedAt: now,
      lastMessageAt: now,
    };

    if (messages) updateFields.messages = messages;
    if (strategies !== undefined) updateFields.strategies = strategies;
    // Legacy support for old single strategy format
    if (strategyText !== undefined) updateFields.strategyText = sanitizeString(strategyText, 500000);
    if (strategyAnalysis !== undefined) updateFields.strategyAnalysis = sanitizeString(strategyAnalysis, 100000);
    if (title !== undefined) updateFields.title = sanitizeString(title, 200);
    if (isManuallyRenamed !== undefined) updateFields.isManuallyRenamed = isManuallyRenamed;

    const result = await db
      .collection<Conversation>(COLLECTIONS.CONVERSATIONS)
      .findOneAndUpdate(
        {
          _id: new ObjectId(id),
          userId: new ObjectId(payload.userId),
        },
        { $set: updateFields },
        { returnDocument: 'after' }
      );

    if (!result) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation: result });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const db = await getDb();
    const result = await db
      .collection<Conversation>(COLLECTIONS.CONVERSATIONS)
      .deleteOne({
        _id: new ObjectId(id),
        userId: new ObjectId(payload.userId),
      });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
