import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { prisma, setPrismaForTests } from '../admin-auth';
import { GarbaService } from './garba.service';

const realPrisma = prisma;

async function run() {
  let reaction: any = null;
  let locked = false;
  let created: any;
  const database: any = {
    garbaPost: {
      findFirst: async () => ({ id: 'post-1', commentsLocked: locked }),
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
