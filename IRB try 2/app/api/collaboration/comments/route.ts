import { NextRequest, NextResponse } from 'next/server';
import { createComment, getComments, resolveComment } from '@/lib/collaboration/comments';

export async function POST(request: NextRequest) {
  try {
    const { studyId, userId, section, content, action } = await request.json();

    if (action === 'resolve') {
      // Resolve a comment
      const { commentId, resolvedById } = await request.json();

      if (!commentId || !resolvedById) {
        return NextResponse.json(
          { error: 'Missing required fields: commentId, resolvedById' },
          { status: 400 }
        );
      }

      const comment = await resolveComment({ commentId, resolvedById });

      return NextResponse.json({
        success: true,
        comment,
      });
    }

    // Create a new comment
    if (!studyId || !userId || !section || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: studyId, userId, section, content' },
        { status: 400 }
      );
    }

    const comment = await createComment({
      studyId,
      userId,
      section,
      content,
    });

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error) {
    console.error('Comments API error:', error);

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
    const includeResolved = searchParams.get('includeResolved') === 'true';

    if (!studyId) {
      return NextResponse.json({ error: 'Missing studyId parameter' }, { status: 400 });
    }

    const comments = await getComments(studyId, includeResolved);

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error('Get comments API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
