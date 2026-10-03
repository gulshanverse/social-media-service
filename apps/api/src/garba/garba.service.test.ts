import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { prisma, setPrismaForTests } from '../admin-auth';
import { GarbaService } from './garba.service';

const realPrisma = prisma;

async function run() {
  let reaction: any = null;
  let locked = false;
  let created: any;
  let createdPost: any;
  const database: any = {
    garbaPost: {
      findFirst: async () => ({ id: 'post-1', commentsLocked: locked }),
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
        return data;
      },
    },
  };
  setPrismaForTests(database);
  try {
    const service = new GarbaService();
    const result = await service.create(
      {
        category: 'FRIENDS',
        content:
          "Need a garba partner for the Navratri. I got an extra ticket so anyone who's interested in coming with me on garba text me on jellOyfish01",
        eventDate: undefined,
        location: undefined,
        instagramHandle: 'jellOyfish01',
      } as any,
      '127.0.0.10',
    );
    assert.equal(result.status, 'PENDING');
    assert.equal(createdPost.category, 'FRIENDS');
    assert.equal(createdPost.content.startsWith('Need a garba partner'), true);
    assert.equal(createdPost.eventDate, undefined);
    assert.equal(createdPost.location, undefined);
    assert.equal(createdPost.instagramHandle, 'jellOyfish01');
    assert.deepEqual(await service.react('post-1', '127.0.0.1'), { reacted: true, count: 1 });
    assert.deepEqual(await service.react('post-1', '127.0.0.1'), { reacted: false, count: 0 });
    await service.comment('post-1', { content: 'A published test comment' } as any, '127.0.0.1');
    assert.equal(created.status, 'PUBLISHED');
    locked = true;
    await assert.rejects(
      () => service.comment('post-1', { content: 'Blocked comment' } as any, '127.0.0.2'),
      BadRequestException,
    );
  } finally {
    setPrismaForTests(realPrisma);
  }
  console.log('Garba reaction, published comment, and lock tests passed');
}

void run();
