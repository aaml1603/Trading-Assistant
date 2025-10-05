import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { COLLECTIONS, User } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Get user's custom instructions
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
    const user = await db
      .collection<User>(COLLECTIONS.USERS)
      .findOne({ _id: new ObjectId(payload.userId) });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ customInstructions: user.customInstructions || '' });
  } catch (error) {
    console.error('Error fetching custom instructions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom instructions' },
      { status: 500 }
    );
  }
}

// PATCH - Update user's custom instructions
export async function PATCH(request: NextRequest) {
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

    const { customInstructions } = await request.json();

    const db = await getDb();
    const result = await db
      .collection<User>(COLLECTIONS.USERS)
      .findOneAndUpdate(
        { _id: new ObjectId(payload.userId) },
        { $set: { customInstructions } },
        { returnDocument: 'after' }
      );

    if (!result) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      customInstructions: result.customInstructions || ''
    });
  } catch (error) {
    console.error('Error updating custom instructions:', error);
    return NextResponse.json(
      { error: 'Failed to update custom instructions' },
      { status: 500 }
    );
  }
}
