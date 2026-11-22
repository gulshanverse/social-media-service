import assert from 'node:assert/strict';
import { ConfessionCommentStatus, ConfessionStatus, PrismaClient } from '@prisma/client';
import { prisma as applicationPrisma, setPrismaForTests } from '../admin-auth';
import { DiscussionService } from './discussion.service';

const databaseUrl = process.env.TEST_DATABASE_URL;

async function main() {
  if (!databaseUrl) {
    console.log(
      'discussion database integration tests skipped: set TEST_DATABASE_URL to a disposable PostgreSQL database',
    );
    return;
  }

  const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const publicId = `discussion-integration-${Date.now()}`;
  const otherPublicId = `${publicId}-other`;
  const profileId = `integration-profile-${Date.now()}`;
  const sessionId = `integration-session-${Date.now()}`;
  try {
    await client.$connect();
    setPrismaForTests(client);
    const service = new DiscussionService();
    const [confession, otherConfession] = await Promise.all([
      client.confession.create({
        data: {
          publicId,
          content: 'Integration confession',
          originalContent: 'Integration confession',
          status: ConfessionStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      }),
      client.confession.create({
        data: {
          publicId: otherPublicId,
          content: 'Other integration confession',
          originalContent: 'Other integration confession',
          status: ConfessionStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      }),
    ]);
    const profile = await client.commenterProfile.create({
      data: {
        id: profileId,
        displayName: 'Integration User',
        instagramUsername: 'integration.user',
        sessions: {
          create: {
            id: sessionId,
            tokenHash: 'integration-token-hash',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        },
      },
      include: { sessions: true },
    });
    const token = 'integration-token';
    const tokenHash = (await import('node:crypto'))
      .createHash('sha256')
      .update(token)
      .digest('hex');
    await client.commenterSession.update({
      where: { id: profile.sessions[0].id },
      data: { tokenHash },
    });

    const created = await service.create(
      publicId,
      { content: 'Original comment' } as any,
      token,
      '127.0.0.1',
    );
    const commentId = created.comment.id;
    const edited = await service.edit(
      publicId,
      commentId,
      { content: 'Edited comment' } as any,
      token,
    );
    assert.equal(edited.comment.content, 'Edited comment');

    await assert.rejects(
      () => service.edit(otherPublicId, commentId, { content: 'Cross-confession' } as any, token),
      /comment is unavailable|confession is unavailable/i,
    );
    const isolated = await client.confessionComment.findUnique({ where: { id: commentId } });
    assert.equal(isolated?.confessionId, confession.id);
    assert.notEqual(isolated?.confessionId, otherConfession.id);

    const raceComment = await service.create(
      publicId,
      { content: 'Race comment' } as any,
      token,
      '127.0.0.1',
    );
    const raceResults = await Promise.allSettled([
      service.edit(publicId, raceComment.comment.id, { content: 'Raced edit' } as any, token),
      service.delete(publicId, raceComment.comment.id, token),
    ]);
    assert.equal(raceResults.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(raceResults.filter((result) => result.status === 'rejected').length, 1);
    const finalRaceComment = await client.confessionComment.findUnique({
      where: { id: raceComment.comment.id },
    });
    assert.equal(finalRaceComment?.status, ConfessionCommentStatus.PUBLISHED);
    assert.ok(finalRaceComment?.deletedAt || finalRaceComment?.content === 'Raced edit');

    const deleted = await service.delete(publicId, commentId, token);
    assert.equal(deleted.status, 'DELETED');
    await assert.rejects(
      () => service.edit(publicId, commentId, { content: 'After deletion' } as any, token),
      /deleted comments cannot be edited/i,
    );
    await assert.rejects(() => service.delete(publicId, commentId, token), /already been deleted/i);
    console.log('discussion real database integration tests passed');
  } finally {
    await client.confession.deleteMany({ where: { publicId: { in: [publicId, otherPublicId] } } });
    await client.commenterProfile.deleteMany({ where: { id: profileId } });
    await client.$disconnect();
    setPrismaForTests(applicationPrisma);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
