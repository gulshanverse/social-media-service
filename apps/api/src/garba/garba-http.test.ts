import 'reflect-metadata';
import assert from 'node:assert/strict';
import request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GarbaController } from './garba.controller';
import { GarbaService } from './garba.service';

async function run() {
  const calls: Array<{ category?: string; page: number }> = [];
  const testingModule = await Test.createTestingModule({
    controllers: [GarbaController],
    providers: [{ provide: GarbaService, useValue: { list: async (category?: string, page = 1) => { calls.push({ category, page }); return { items: [], category, page, limit: 12, total: 0, hasMore: false }; } } }],
  }).compile();
  const app = testingModule.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  try {
    const server = app.getHttpServer();
    for (const path of ['/garba', '/garba?page=1', '/garba?page=2', '/garba?category=GENERAL', '/garba?category=GENERAL&page=1']) {
      await request(server).get(path).expect(200);
    }
    await request(server).get('/garba?page=abc').expect(400);
    assert.deepEqual(calls, [
      { category: undefined, page: 1 },
      { category: undefined, page: 1 },
      { category: undefined, page: 2 },
      { category: 'GENERAL', page: 1 },
      { category: 'GENERAL', page: 1 },
    ]);
    console.log('Garba list query validation tests passed');
  } finally {
    await app.close();
  }
}

void run();
export {};
