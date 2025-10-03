import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { COLLECTIONS, User } from '@/lib/models';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // Remove Notion credentials from database
    await usersCollection.updateOne(
      { _id: new ObjectId(user.userId) },
      {
        $unset: {
          notionAccessToken: '',
          notionWorkspaceName: '',
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Notion:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
