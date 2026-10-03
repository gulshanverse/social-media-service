import 'reflect-metadata';
import assert from 'node:assert/strict';
import request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Test } from '@nestjs/testing';
import { GarbaController } from './garba.controller';
import { CreateGarbaPostDto } from './dto';
import { GarbaService } from './garba.service';

async function run() {
  const calls: Array<{ category?: string; page: number }> = [];
  let createdDto: Record<string, unknown> | undefined;
  const testingModule = await Test.createTestingModule({
    controllers: [GarbaController],
    providers: [
      {
        provide: GarbaService,
        useValue: {
          list: async (category?: string, page = 1) => {
            calls.push({ category, page });
            return { items: [], category, page, limit: 12, total: 0, hasMore: false };
          },
          create: async (dto: Record<string, unknown>) => {
            createdDto = dto;
            return { message: 'Your Garba post is awaiting moderation.' };
          },
        },
      },
    ],
  }).compile();
  const app = testingModule.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  try {
    const server = app.getHttpServer();
    for (const path of [
      '/garba',
      '/garba?page=1',
      '/garba?page=2',
      '/garba?category=GENERAL',
      '/garba?category=GENERAL&page=1',
    ]) {
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
    await request(server)
      .post('/garba')
      .send({
        category: 'FRIENDS',
        content:
          "Need a garba partner for the Navratri. I got an extra ticket so anyone who's interested in coming with me on garba text me on jellOyfish01",
        eventDate: '',
        location: '',
        instagramHandle: 'jellOyfish01',
      })
      .expect(201)
      .expect({ message: 'Your Garba post is awaiting moderation.' });
    assert.deepEqual(createdDto, {
      category: 'FRIENDS',
      content:
        "Need a garba partner for the Navratri. I got an extra ticket so anyone who's interested in coming with me on garba text me on jellOyfish01",
      eventDate: '',
      location: '',
      instagramHandle: 'jellOyfish01',
    });
    const invalidDto = plainToInstance(CreateGarbaPostDto, {
      category: 'FRIENDS',
      eventDate: '',
      location: '',
      instagramHandle: '',
    });
    const validationErrors = await validate(invalidDto);
    assert.ok(validationErrors.some((error) => error.property === 'content'));
    assert.match(Object.values(validationErrors[0]?.constraints ?? {}).join(' '), /content/i);
    console.log('Garba list query validation tests passed');
  } finally {
    await app.close();
  }
}

void run();
export {};
