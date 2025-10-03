import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { COLLECTIONS, Strategy } from '@/lib/models';
import { getUserFromRequest } from '@/lib/auth';

// GET - Retrieve all strategies for the logged-in user
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const strategiesCollection = db.collection<Strategy>(COLLECTIONS.STRATEGIES);

    const strategies = await strategiesCollection
      .find({ userId: new ObjectId(user.userId) })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      strategies: strategies.map((s) => ({
        id: s._id!.toString(),
        name: s.name,
        analysis: s.analysis,
        strategyText: s.strategyText,
        fileType: s.fileType,
        additionalComments: s.additionalComments,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategies' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific strategy
export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get('id');

    if (!strategyId) {
      return NextResponse.json(
        { error: 'Strategy ID required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const strategiesCollection = db.collection<Strategy>(COLLECTIONS.STRATEGIES);

    const result = await strategiesCollection.deleteOne({
      _id: new ObjectId(strategyId),
      userId: new ObjectId(user.userId), // Ensure user owns the strategy
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    return NextResponse.json(
      { error: 'Failed to delete strategy' },
      { status: 500 }
    );
  }
}
