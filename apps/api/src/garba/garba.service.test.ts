import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { prisma, setPrismaForTests } from '../admin-auth';
import { GARBA_DEFAULT_THEME_ID, getGarbaTheme } from '@ggv/themes';
import { GarbaService } from './garba.service';

const realPrisma = prisma;

async function run() {
  let reaction: any = null;
  let locked = false;
  let created: any;
  let createdPost: any;
  const publishedPost = {
    id: 'internal-post-id',
    publicId: 'public-post-id',
    seasonId: 'internal-season-id',
    category: 'FRIENDS',
    content: 'A published Garba post',
    themeId: 'garba-peacock',
    eventDate: null,
    location: 'Campus ground',
    instagramHandle: null,
    authorHash: 'private-author-hash',
    status: 'PUBLISHED',
    commentsLocked: false,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-02T00:00:00.000Z'),
    publishedAt: new Date('2026-10-01T00:00:00.000Z'),
    comments: [
      {
        id: 'public-comment-id',
        parentId: null,
        content: 'A public comment',
        createdAt: new Date('2026-10-01T01:00:00.000Z'),
        authorHash: 'private-comment-author-hash',
        status: 'PUBLISHED',
        postId: 'internal-post-id',
        replies: [
          {
            id: 'public-reply-id',
            parentId: 'public-comment-id',
            content: 'A public reply',
            createdAt: new Date('2026-10-01T02:00:00.000Z'),
            authorHash: 'private-reply-author-hash',
            status: 'PUBLISHED',
            postId: 'internal-post-id',
          },
        ],
      },
    ],
    _count: { reactions: 3, comments: 1 },
  };
  const activeSeason = {
    id: 'internal-active-season-id',
    name: 'Navratri',
    year: 2026,
    startDate: new Date('2026-10-01T00:00:00.000Z'),
    endDate: new Date('2026-10-10T00:00:00.000Z'),
    status: 'ACTIVE',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-02T00:00:00.000Z'),
  };
  const database: any = {
    garbaPost: {
      findFirst: async (args: any) =>
        args?.include ? publishedPost : { id: 'post-1', commentsLocked: locked },
      findMany: async () => [publishedPost],
      count: async () => 1,
      create: async ({ data }: any) => {
        createdPost = { publicId: 'post-created', ...data };
        return createdPost;
      },
    },
    garbaReaction: {
      findUnique: async () => reaction,
      create: async ({ data }: any) => {
        reaction = { id: 'reaction-1', ...data };
        return reaction;
      },
      delete: async () => {
        reaction = null;
      },
      count: async () => (reaction ? 1 : 0),
    },
    garbaComment: {
      findFirst: async () => ({ id: 'parent-1', postId: 'post-1', parentId: null }),
      create: async ({ data }: any) => {
        created = data;
        return {
          id: 'created-comment-id',
          parentId: data.parentId,
          content: data.content,
          createdAt: new Date('2026-10-01T03:00:00.000Z'),
          authorHash: data.authorHash,
          status: data.status,
        };
      },
    },
    garbaSeason: { findFirst: async () => activeSeason },
  };
  setPrismaForTests(database);
  try {
    const service = new GarbaService();
    const expectedPublicSeason = {
      name: 'Navratri',
      year: 2026,
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-10-10T00:00:00.000Z',
    };
    assert.deepEqual(await service.season(), expectedPublicSeason);
    const result = await service.create(
      {
        category: 'FRIENDS',
        content:
          "Need a garba partner for the Navratri. I got an extra ticket so anyone who's interested in coming with me on garba text me on jellOyfish01",
        eventDate: undefined,
        location: undefined,
        instagramHandle: 'jellOyfish01',
        themeId: 'garba-peacock',
      } as any,
      '127.0.0.10',
    );
    assert.equal(result.status, 'PENDING');
    assert.equal(createdPost.category, 'FRIENDS');
    assert.equal(createdPost.content.startsWith('Need a garba partner'), true);
    assert.equal(createdPost.eventDate, undefined);
    assert.equal(createdPost.location, undefined);
    assert.equal(createdPost.instagramHandle, 'jellOyfish01');
    assert.equal(createdPost.themeId, 'garba-peacock');
    assert.equal(getGarbaTheme(undefined).id, GARBA_DEFAULT_THEME_ID);
    await assert.rejects(
      () =>
        service.create(
          {
            category: 'FRIENDS',
            content: 'A post with an invalid theme',
            themeId: 'not-a-theme',
          } as any,
          '127.0.0.11',
        ),
      BadRequestException,
    );
    assert.deepEqual(await service.react('post-1', '127.0.0.1'), { reacted: true, count: 1 });
    assert.deepEqual(await service.react('post-1', '127.0.0.1'), { reacted: false, count: 0 });
    await service.comment('post-1', { content: 'A published test comment' } as any, '127.0.0.1');
    assert.equal(created.status, 'PUBLISHED');
    const publicComment = await service.comment(
      'post-1',
      { content: 'A second public comment' } as any,
      '127.0.0.3',
    );
    assert.deepEqual(Object.keys(publicComment).sort(), ['content', 'createdAt', 'id', 'parentId']);
    assert.equal(JSON.stringify(publicComment).includes('authorHash'), false);

    const detail = await service.detail('public-post-id');
    const detailJson = JSON.stringify(detail);
    assert.equal(detail.publicId, 'public-post-id');
    assert.equal(detail.content, 'A published Garba post');
    assert.equal(detail.comments[0].replies[0].content, 'A public reply');
    for (const privateValue of [
      'private-author-hash',
      'private-comment-author-hash',
      'private-reply-author-hash',
      'internal-post-id',
      'internal-season-id',
      'authorHash',
      'seasonId',
      'publishedAt',
      'updatedAt',
      'commentsLocked',
    ]) {
      assert.equal(detailJson.includes(privateValue), false, `detail leaked ${privateValue}`);
    }
    const feed = await service.list();
    assert.equal(feed.items[0].publicId, 'public-post-id');
    assert.deepEqual(feed.season, expectedPublicSeason);
    const feedJson = JSON.stringify(feed);
    assert.equal(feedJson.includes('private-author-hash'), false);
    const seasonJson = JSON.stringify(feed.season);
    for (const privateValue of ['internal-active-season-id', 'ACTIVE', 'createdAt', 'updatedAt']) {
      assert.equal(seasonJson.includes(privateValue), false, `season leaked ${privateValue}`);
    }
    locked = true;
    await assert.rejects(
      () => service.comment('post-1', { content: 'Blocked comment' } as any, '127.0.0.2'),
      BadRequestException,
    );
  } finally {
    setPrismaForTests(realPrisma);
  }
  console.log('Garba reaction, comment moderation, safe public projection, and lock tests passed');
}

void run();
