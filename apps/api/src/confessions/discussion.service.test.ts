import assert from 'node:assert/strict';
import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { ConfessionCommentStatus, ConfessionStatus } from '@prisma/client';
import { prisma, setPrismaForTests } from '../admin-auth';
import { DiscussionService } from './discussion.service';

const realPrisma = prisma;
const now = new Date();
const profile = {
  id: 'profile-test',
  displayName: 'Test User',
  instagramUsername: 'test.user',
};
const session = {
  id: 'session-test',
  profileId: profile.id,
  profile,
  revokedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
};
const confession = { id: 'confession-test', commentsLocked: false };
const comment = {
  id: 'comment-test',
  confessionId: confession.id,
  parentId: null,
  content: 'Visible immediately',
  deletedAt: null,
  createdAt: now,
  profile,
  _count: { replies: 0 },
};
const nestedReply = {
  id: 'reply-test',
  confessionId: confession.id,
  parentId: comment.id,
  content: 'A nested reply',
  deletedAt: null,
  createdAt: new Date(now.getTime() + 1000),
  profile,
};

async function testCreatePublishesImmediately() {
  let createArgs: any;
  setPrismaForTests({
    commenterSession: {
      findUnique: async () => session,
      update: async () => ({}),
    },
    confession: {
      findFirst: async (args: any) => {
        assert.equal(args.where.status, ConfessionStatus.PUBLISHED);
        return confession;
      },
    },
    confessionComment: {
      create: async (args: any) => {
        createArgs = args;
        return comment;
      },
    },
  } as any);
  const result = await new DiscussionService().create(
    'public-test',
    { content: ' Visible immediately ' } as any,
    'valid-session-token',
    'create-test-ip',
  );
  assert.equal(createArgs.data.status, ConfessionCommentStatus.PUBLISHED);
  assert.equal(result.status, 'PUBLISHED');
  assert.match(result.message, /now visible/i);
  assert.equal(result.comment.content, 'Visible immediately');
  assert.equal(result.comment.deletedAt, null);
}

async function testListSurvivesReactionFailure() {
  setPrismaForTests({
    commenterSession: { findUnique: async () => null },
    confession: { findFirst: async () => confession },
    confessionComment: {
      findMany: async (args: any) =>
        args.where.parentId === null
          ? [comment]
          : args.where.parentId?.in?.includes(comment.id)
            ? [nestedReply]
            : [],
      count: async () => 1,
    },
    confessionCommentReaction: {
      groupBy: async () => {
        throw new Error('relation "ConfessionCommentReaction" does not exist');
      },
      findMany: async () => [],
    },
  } as any);
  const result = await new DiscussionService().list('public-test', 1, undefined, 'list-test-ip');
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].content, 'Visible immediately');
  assert.equal(result.items[0].deletedAt, null);
  assert.deepEqual(result.items[0].reactionCounts, {});
  assert.deepEqual(result.items[0].selectedReactions, []);
  assert.equal(result.items[0].replies.length, 1);
  assert.equal(result.items[0].replies[0].id, nestedReply.id);
  assert.equal(result.items[0].replies[0].deletedAt, null);
}

async function testRepliesCanTargetPublishedReplies() {
  let createArgs: any;
  setPrismaForTests({
    commenterSession: { findUnique: async () => session, update: async () => ({}) },
    confession: { findFirst: async () => confession },
    confessionComment: {
      findFirst: async (args: any) => {
        assert.equal(args.where.id, nestedReply.id);
        assert.equal(args.where.confessionId, confession.id);
        assert.equal(args.where.status, ConfessionCommentStatus.PUBLISHED);
        return nestedReply;
      },
      create: async (args: any) => {
        createArgs = args;
        return { ...nestedReply, id: 'reply-2', parentId: nestedReply.id };
      },
    },
  } as any);
  await new DiscussionService().create(
    'public-test',
    { content: 'Reply to a reply', parentId: nestedReply.id } as any,
    'valid-session-token',
    'nested-reply-ip',
  );
  assert.equal(createArgs.data.parentId, nestedReply.id);
}

async function testCommentReactionCreatesAndRemoves() {
  let reaction: { id: string; emoji: string } | null = null;
  const reactionRows: Array<{ emoji: string }> = [];
  const reactionModel = {
    findUnique: async () => reaction,
    create: async (args: any) => {
      reaction = { id: 'comment-reaction-test', emoji: args.data.emoji };
      reactionRows.push({ emoji: args.data.emoji });
      return reaction;
    },
    delete: async () => {
      reaction = null;
      reactionRows.splice(0, reactionRows.length);
    },
    groupBy: async () =>
      reactionRows.length ? [{ emoji: '❤️', _count: { _all: reactionRows.length } }] : [],
    findMany: async () => reactionRows,
  };
  const transaction = async (callback: (tx: any) => Promise<void>) =>
    callback({ confessionCommentReaction: reactionModel });

  setPrismaForTests({
    commenterSession: { findUnique: async () => null },
    confession: { findFirst: async () => confession },
    confessionComment: { findFirst: async () => ({ id: comment.id }) },
    confessionCommentReaction: reactionModel,
    $transaction: transaction,
  } as any);

  const service = new DiscussionService();
  const created = await service.reactToComment(
    'public-test',
    comment.id,
    { emoji: '❤️' } as any,
    undefined,
    'reaction-test-ip',
  );
  assert.deepEqual(created, { counts: { '❤️': 1 }, selected: ['❤️'] });

  const removed = await service.reactToComment(
    'public-test',
    comment.id,
    { emoji: '❤️' } as any,
    undefined,
    'reaction-test-ip',
  );
  assert.deepEqual(removed, { counts: {}, selected: [] });
}

async function testCoreFailuresStillPropagate() {
  setPrismaForTests({
    commenterSession: { findUnique: async () => null },
    confession: { findFirst: async () => confession },
    confessionComment: {
      findMany: async () => {
        throw new Error('comment query failed');
      },
      count: async () => 0,
    },
  } as any);
  await assert.rejects(() => new DiscussionService().list('public-test'), /comment query failed/);

  setPrismaForTests({
    confession: {
      findFirst: async () => {
        throw new Error('confession lookup failed');
      },
    },
  } as any);
  await assert.rejects(
    () => new DiscussionService().list('public-test'),
    /confession lookup failed/,
  );
}

async function testOwnerCanEditAndSoftDelete() {
  let updateArgs: any;
  let deletedAt: Date | null = null;
  let findCount = 0;
  const editable = {
    ...comment,
    profileId: profile.id,
    deletedAt: null,
    status: ConfessionCommentStatus.PUBLISHED,
  };
  setPrismaForTests({
    commenterSession: { findUnique: async () => session, update: async () => ({}) },
    confession: { findFirst: async () => confession },
    confessionComment: {
      findFirst: async (args: any) => {
        assert.equal(args.where.status, ConfessionCommentStatus.PUBLISHED);
        findCount += 1;
        return findCount === 1 || findCount === 3
          ? editable
          : { ...editable, content: 'Updated text', deletedAt, _count: { replies: 1 } };
      },
      updateMany: async (args: any) => {
        updateArgs = args;
        deletedAt = args.data.deletedAt ?? null;
        return { count: 1 };
      },
    },
  } as any);
  const service = new DiscussionService();
  const edited = await service.edit(
    'public-test',
    comment.id,
    { content: ' Updated text ' } as any,
    'valid-session-token',
  );
  assert.equal(updateArgs.data.content, 'Updated text');
  assert.equal(updateArgs.where.profileId, profile.id);
  assert.equal(updateArgs.where.deletedAt, null);
  assert.equal(edited.comment.content, 'Updated text');
  const removed = await service.delete('public-test', comment.id, 'valid-session-token');
  assert.equal(updateArgs.data.deletedAt instanceof Date, true);
  assert.equal(removed.comment.content, 'This comment was deleted.');
  assert.equal(removed.comment.profile.instagramUsername, null);
  assert.equal(removed.comment.replyCount, 1);
}

async function testCommentAuthorizationAndDeletedGuards() {
  const otherProfile = {
    id: 'profile-other',
    displayName: 'Other User',
    instagramUsername: 'other.user',
  };
  const otherComment = {
    ...comment,
    profileId: otherProfile.id,
    profile: otherProfile,
    status: ConfessionCommentStatus.PUBLISHED,
    deletedAt: null,
  };
  let lastWhere: any;
  setPrismaForTests({
    commenterSession: { findUnique: async () => session, update: async () => ({}) },
    confession: { findFirst: async () => confession },
    confessionComment: {
      findFirst: async (args: any) => {
        lastWhere = args.where;
        return otherComment;
      },
    },
  } as any);
  const service = new DiscussionService();
  await assert.rejects(
    () =>
      service.edit('public-test', comment.id, { content: 'nope' } as any, 'valid-session-token'),
    /only edit your own/i,
  );
  await assert.rejects(
    () => service.delete('public-test', comment.id, 'valid-session-token'),
    /only delete your own/i,
  );
  assert.equal(lastWhere.status, ConfessionCommentStatus.PUBLISHED);

  setPrismaForTests({
    commenterSession: { findUnique: async () => null },
    confession: { findFirst: async () => confession },
    confessionComment: { findFirst: async () => otherComment },
  } as any);
  await assert.rejects(
    () => service.edit('public-test', comment.id, { content: 'nope' } as any),
    /join the conversation/i,
  );
  await assert.rejects(() => service.delete('public-test', comment.id), /join the conversation/i);

  const deleted = {
    ...comment,
    profileId: profile.id,
    status: ConfessionCommentStatus.PUBLISHED,
    deletedAt: now,
  };
  setPrismaForTests({
    commenterSession: { findUnique: async () => session, update: async () => ({}) },
    confession: { findFirst: async () => confession },
    confessionComment: { findFirst: async () => deleted },
  } as any);
  await assert.rejects(
    () =>
      service.edit('public-test', comment.id, { content: 'nope' } as any, 'valid-session-token'),
    /deleted comments cannot be edited/i,
  );
  await assert.rejects(
    () => service.delete('public-test', comment.id, 'valid-session-token'),
    /already been deleted/i,
  );

  setPrismaForTests({
    commenterSession: { findUnique: async () => session, update: async () => ({}) },
    confession: { findFirst: async () => confession },
    confessionComment: {
      findFirst: async (args: any) => {
        assert.equal(args.where.deletedAt, null);
        return null;
      },
    },
  } as any);
  await assert.rejects(
    () =>
      service.create(
        'public-test',
        { content: 'reply', parentId: comment.id } as any,
        'valid-session-token',
        'deleted-parent-ip',
      ),
    /reply target is unavailable/i,
  );

  setPrismaForTests({
    commenterSession: { findUnique: async () => null },
    confession: { findFirst: async () => confession },
    confessionComment: { findFirst: async () => null },
  } as any);
  await assert.rejects(
    () =>
      service.reactToComment(
        'public-test',
        comment.id,
        { emoji: '❤️' } as any,
        undefined,
        'deleted-reaction-ip',
      ),
    /comment is unavailable/i,
  );
  await assert.rejects(
    () =>
      service.report('public-test', comment.id, { reason: 'OTHER' } as any, 'deleted-report-ip'),
    /comment is unavailable/i,
  );
}

async function testDeletedTreeIsRedactedAndRepliesPreserved() {
  const deletedParent = {
    ...comment,
    status: ConfessionCommentStatus.PUBLISHED,
    deletedAt: now,
  };
  const activeReply = {
    ...nestedReply,
    status: ConfessionCommentStatus.PUBLISHED,
    deletedAt: null,
  };
  setPrismaForTests({
    commenterSession: { findUnique: async () => null },
    confession: { findFirst: async () => confession },
    confessionComment: {
      findMany: async (args: any) =>
        args.where.parentId === null
          ? [deletedParent]
          : args.where.parentId?.in?.includes(deletedParent.id)
            ? [activeReply]
            : [],
      count: async () => 1,
    },
    confessionCommentReaction: {
      groupBy: async () => [],
      findMany: async () => [],
    },
  } as any);
  const result = await new DiscussionService().list('public-test');
  assert.equal(result.items[0].content, 'This comment was deleted.');
  assert.equal(result.items[0].profile.displayName, 'Deleted commenter');
  assert.equal(result.items[0].profile.id, 'deleted-comment');
  assert.deepEqual(result.items[0].reactionCounts, {});
  assert.equal(result.items[0].replies.length, 1);
  assert.equal(result.items[0].replies[0].content, activeReply.content);
}

async function testEditInputIsTrimmedAndValidated() {
  let updatedContent = '';
  const editable = {
    ...comment,
    profileId: profile.id,
    status: ConfessionCommentStatus.PUBLISHED,
    deletedAt: null,
  };
  setPrismaForTests({
    commenterSession: { findUnique: async () => session, update: async () => ({}) },
    confession: { findFirst: async () => confession },
    confessionComment: {
      findFirst: async () => ({ ...editable, content: updatedContent || editable.content }),
      updateMany: async (args: any) => {
        updatedContent = args.data.content;
        return { count: 1 };
      },
    },
  } as any);
  const service = new DiscussionService();
  await service.edit(
    'public-test',
    comment.id,
    { content: '  trimmed  ' } as any,
    'valid-session-token',
  );
  assert.equal(updatedContent, 'trimmed');
  await assert.rejects(
    () => service.edit('public-test', comment.id, { content: '   ' } as any, 'valid-session-token'),
    /content is required/i,
  );
  await assert.rejects(
    () =>
      service.edit(
        'public-test',
        comment.id,
        { content: 'x'.repeat(1001) } as any,
        'valid-session-token',
      ),
    /1000 characters/i,
  );
}

async function testConditionalWriteRejectsRacesAndWrongOwner() {
  const current = { ...comment, profileId: profile.id, deletedAt: null };
  let updateCalls = 0;
  setPrismaForTests({
    commenterSession: { findUnique: async () => session, update: async () => ({}) },
    confession: { findFirst: async () => confession },
    confessionComment: {
      findFirst: async () => current,
      updateMany: async (args: any) => {
        assert.equal(args.where.id, comment.id);
        assert.equal(args.where.confessionId, confession.id);
        assert.equal(args.where.profileId, profile.id);
        assert.equal(args.where.status, ConfessionCommentStatus.PUBLISHED);
        assert.equal(args.where.deletedAt, null);
        updateCalls += 1;
        return { count: 0 };
      },
    },
  } as any);
  const service = new DiscussionService();
  await assert.rejects(
    () =>
      service.edit('public-test', comment.id, { content: 'raced' } as any, 'valid-session-token'),
    (error) => error instanceof NotFoundException,
  );
  await assert.rejects(
    () => service.delete('public-test', comment.id, 'valid-session-token'),
    (error) => error instanceof NotFoundException,
  );
  assert.equal(updateCalls, 2, 'both operations must use a conditional write');

  const other = { ...comment, profileId: 'other-profile' };
  setPrismaForTests({
    commenterSession: { findUnique: async () => session, update: async () => ({}) },
    confession: { findFirst: async () => confession },
    confessionComment: {
      findFirst: async () => other,
      updateMany: async () => ({ count: 0 }),
    },
  } as any);
  await assert.rejects(
    () =>
      service.edit('public-test', comment.id, { content: 'nope' } as any, 'valid-session-token'),
    (error) => error instanceof HttpException && error.getStatus() === HttpStatus.FORBIDDEN,
  );
}

async function main() {
  try {
    await testCreatePublishesImmediately();
    await testListSurvivesReactionFailure();
    await testRepliesCanTargetPublishedReplies();
    await testCommentReactionCreatesAndRemoves();
    await testCoreFailuresStillPropagate();
    await testOwnerCanEditAndSoftDelete();
    await testCommentAuthorizationAndDeletedGuards();
    await testDeletedTreeIsRedactedAndRepliesPreserved();
    await testEditInputIsTrimmedAndValidated();
    await testConditionalWriteRejectsRacesAndWrongOwner();
    console.log('discussion service publication and reaction fallback tests passed');
  } finally {
    setPrismaForTests(realPrisma);
  }
}

void main();
