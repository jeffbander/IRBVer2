import { NextRequest, NextResponse } from 'next/server';
import {
  createProtocolVersion,
  getVersionHistory,
  compareVersions,
  rollbackToVersion,
} from '@/lib/collaboration/version-control';

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();

    if (action === 'create') {
      const { studyId, changes, changedBy, changeType, changeNotes } = data;

      if (!studyId || !changes || !changedBy || !changeType) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const version = await createProtocolVersion({
        studyId,
        changes,
        changedBy,
        changeType,
        changeNotes,
      });

      return NextResponse.json({
        success: true,
        version,
      });
    }

    if (action === 'rollback') {
      const { studyId, targetVersionId, rolledBackBy } = data;

      if (!studyId || !targetVersionId || !rolledBackBy) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      await rollbackToVersion(studyId, targetVersionId, rolledBackBy);

      return NextResponse.json({
        success: true,
        message: 'Successfully rolled back to previous version',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Version control API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studyId = searchParams.get('studyId');
    const compare = searchParams.get('compare');

    if (compare) {
      // Compare two versions
      const versionId1 = searchParams.get('versionId1');
      const versionId2 = searchParams.get('versionId2');

      if (!versionId1 || !versionId2) {
        return NextResponse.json(
          { error: 'Missing version IDs for comparison' },
          { status: 400 }
        );
      }

      const comparison = await compareVersions(versionId1, versionId2);

      return NextResponse.json({
        success: true,
        comparison,
      });
    }

    if (!studyId) {
      return NextResponse.json({ error: 'Missing studyId parameter' }, { status: 400 });
    }

    // Get version history
    const versions = await getVersionHistory(studyId);

    return NextResponse.json({
      success: true,
      versions,
    });
  } catch (error) {
    console.error('Get versions API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
