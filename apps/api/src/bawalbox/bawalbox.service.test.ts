import assert from 'node:assert/strict';
import {
  AdminRole,
  BawalBoxQuestionStatus,
  BawalBoxResponseStatus,
  type PrismaClient,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { prisma, setPrismaForTests, type AdminIdentity } from '../admin-auth';
import { CreateBawalBoxQuestionDto, UpdateBawalBoxQuestionDto } from './dto';
import { BawalBoxService } from './bawalbox.service';

const realPrisma = prisma;
const actor: AdminIdentity = {
  id: 'admin-test',
  email: 'admin@example.invalid',
  name: 'Test Admin',
  role: AdminRole.SUPER_ADMIN,
};

// These are service unit tests with a Prisma mock. Its FIFO/snapshot behavior exercises
// service ordering and rollback structure; it is not a PostgreSQL locking integration test.
type Question = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  category: string | null;
  startAt: Date | null;
  endAt: Date | null;
  status: BawalBoxQuestionStatus;
  featured: boolean;
  answerLimit: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type Response = {
  id: string;
  questionId: string;
  content: string;
  status: BawalBoxResponseStatus;
  pinned: boolean;
  createdAt: Date;
};

function databaseFixture(
  options: {
    question?: Partial<Question>;
    responses?: Response[];
    failQuestionCreate?: boolean;
    failQuestionUpdate?: boolean;
  } = {},
) {
  const events: string[] = [];
  const questions = new Map<string, Question>();
  const responses = [...(options.responses ?? [])];
  const auditEntries: Array<Record<string, unknown>> = [];
  let questionSequence = 0;
  let responseSequence = responses.length;
  let transactionTail = Promise.resolve();
  const defaults: Question = {
    id: 'question-1',
    title: 'Existing question title',
    description: 'Existing description',
    instructions: 'Existing instructions',
    category: 'CAMPUS_LIFE',
    startAt: null,
    endAt: null,
    status: BawalBoxQuestionStatus.PUBLISHED,
    featured: true,
    answerLimit: 4,
    publishedAt: new Date('2026-10-01T00:00:00.000Z'),
    createdAt: new Date('2026-09-30T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  };
  const question = { ...defaults, ...options.question };
  questions.set(question.id, question);

  const transactionClient: any = {
    bawalBoxQuestion: {
      findUnique: async ({ where }: any) => {
        const found = questions.get(where.id);
        if (!found) return null;
        return {
          ...found,
          _count: { responses: responses.filter((item) => item.questionId === found.id).length },
        };
      },
      updateMany: async ({ where, data }: any) => {
        events.push('unfeature-others');
        let count = 0;
        for (const item of questions.values()) {
          if (item.featured && (where.id?.not === undefined || item.id !== where.id.not)) {
            Object.assign(item, data);
            count += 1;
          }
        }
        return { count };
      },
      create: async ({ data }: any) => {
        events.push('create-question');
        if (options.failQuestionCreate) throw new Error('Simulated question create failure');
        const item: Question = {
          ...defaults,
          ...data,
          id: `question-new-${++questionSequence}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        questions.set(item.id, item);
        return item;
      },
      update: async ({ where, data }: any) => {
        events.push('update-question');
        if (options.failQuestionUpdate) throw new Error('Simulated question update failure');
        const item = questions.get(where.id);
        if (!item) throw new Error('Question missing in test fixture');
        Object.assign(
          item,
          Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
        );
        return { ...item };
      },
    },
    bawalBoxResponse: {
      create: async ({ data }: any) => {
        events.push('create-response');
        const item: Response = {
          id: `response-new-${++responseSequence}`,
          questionId: data.questionId,
          content: data.content,
          status: BawalBoxResponseStatus.PENDING,
          pinned: false,
          createdAt: new Date(),
        };
        responses.push(item);
        return item;
      },
    },
  };
  const database: any = {
    ...transactionClient,
    $transaction: async (callback: (tx: any) => Promise<unknown>) => {
      events.push('transaction-start');
      const releases: Array<() => void> = [];
      let acquiredMockTransactionLock = false;
      const snapshot: {
        questions: Map<string, Question> | null;
        responses: Response[] | null;
      } = { questions: null, responses: null };
      const tx = {
        ...transactionClient,
        $queryRaw: async (strings: TemplateStringsArray) => {
          const sql = strings.join('?');
          events.push(sql.includes('FOR UPDATE') ? 'row-lock' : 'feature-lock');
          if (!acquiredMockTransactionLock) {
            const previous = transactionTail;
            let release!: () => void;
            transactionTail = new Promise<void>((resolve) => {
              release = resolve;
            });
            await previous;
            events.push('mock-lock-acquired');
            if (snapshot.questions === null) {
              snapshot.questions = new Map(
                [...questions.entries()].map(([id, item]) => [id, { ...item }]),
              );
              snapshot.responses = [...responses];
            }
            releases.push(release);
            acquiredMockTransactionLock = true;
          }
          return [];
        },
      };
      try {
        return await callback(tx);
      } catch (error) {
        if (snapshot.questions && snapshot.responses) {
          questions.clear();
          for (const [id, item] of snapshot.questions) questions.set(id, item);
          responses.splice(0, responses.length, ...snapshot.responses);
        }
        throw error;
      } finally {
        releases.reverse().forEach((release) => release());
        events.push('transaction-end');
      }
    },
    auditLog: {
      create: async ({ data }: any) => {
        auditEntries.push(data);
        return data;
      },
    },
  };
  return { database, events, questions, responses, auditEntries };
}

async function run() {
  try {
    const invalidCreateTitle = plainToInstance(CreateBawalBoxQuestionDto, { title: '   ' });
    assert.ok(
      (await validate(invalidCreateTitle)).length > 0,
      'create rejects whitespace-only titles',
    );
    const validCreateTitle = plainToInstance(CreateBawalBoxQuestionDto, {
      title: '  A valid question  ',
    });
    assert.deepEqual(await validate(validCreateTitle), []);
    assert.equal(validCreateTitle.title, 'A valid question', 'create trims before validation');

    const invalidPartial = plainToInstance(UpdateBawalBoxQuestionDto, { title: '   ' });
    assert.ok((await validate(invalidPartial)).length > 0, 'PATCH rejects whitespace-only titles');
    const validPartial = plainToInstance(UpdateBawalBoxQuestionDto, {
      title: '  Renamed prompt  ',
    });
    assert.deepEqual(await validate(validPartial), [], 'PATCH accepts omitted optional fields');
    assert.equal(validPartial.title, 'Renamed prompt', 'PATCH trims before validation');

    const originalStartAt = new Date('2026-10-01T00:00:00.000Z');
    const originalEndAt = new Date('2026-10-15T00:00:00.000Z');
    const patchFixture = databaseFixture({
      question: { startAt: originalStartAt, endAt: originalEndAt },
    });
    setPrismaForTests(patchFixture.database as PrismaClient);
    const service = new BawalBoxService();
    const patched = await service.updateQuestion('question-1', validPartial, actor);
    assert.equal(patched.title, 'Renamed prompt');
    assert.equal(patched.status, BawalBoxQuestionStatus.PUBLISHED);
    assert.equal(patched.featured, true);
    assert.equal(patched.description, 'Existing description');
    assert.equal(patched.instructions, 'Existing instructions');
    assert.equal(patched.category, 'CAMPUS_LIFE');
    assert.equal(patched.startAt?.toISOString(), originalStartAt.toISOString());
    assert.equal(patched.endAt?.toISOString(), originalEndAt.toISOString());
    assert.equal(patched.answerLimit, 4);
    assert.equal(patchFixture.events.includes('unfeature-others'), false);
    assert.deepEqual(patchFixture.auditEntries[0].metadata, { changedFields: ['title'] });

    const suppliedFields = plainToInstance(UpdateBawalBoxQuestionDto, {
      description: '  Updated description  ',
      instructions: '  Updated instructions  ',
      category: '  Updated category  ',
      startAt: '2026-11-01T00:00:00.000Z',
      endAt: '2026-12-01T00:00:00.000Z',
      status: BawalBoxQuestionStatus.DRAFT,
      featured: false,
      answerLimit: 17,
    });
    assert.deepEqual(await validate(suppliedFields), []);
    const explicitlyUpdated = await service.updateQuestion('question-1', suppliedFields, actor);
    assert.equal(explicitlyUpdated.title, 'Renamed prompt', 'omitted title stays unchanged');
    assert.equal(explicitlyUpdated.description, 'Updated description');
    assert.equal(explicitlyUpdated.instructions, 'Updated instructions');
    assert.equal(explicitlyUpdated.category, 'Updated category');
    assert.equal(explicitlyUpdated.startAt?.toISOString(), '2026-11-01T00:00:00.000Z');
    assert.equal(explicitlyUpdated.endAt?.toISOString(), '2026-12-01T00:00:00.000Z');
    assert.equal(explicitlyUpdated.status, BawalBoxQuestionStatus.DRAFT);
    assert.equal(explicitlyUpdated.featured, false);
    assert.equal(explicitlyUpdated.answerLimit, 17);

    const nullFields = plainToInstance(UpdateBawalBoxQuestionDto, {
      title: null,
      description: null,
      instructions: null,
      category: null,
      startAt: null,
      endAt: null,
      status: null,
      featured: null,
      answerLimit: null,
    });
    assert.deepEqual(await validate(nullFields), []);
    const nullUpdated = await service.updateQuestion('question-1', nullFields, actor);
    assert.equal(nullUpdated.title, 'Renamed prompt', 'null title is a no-op');
    assert.equal(nullUpdated.description, null);
    assert.equal(nullUpdated.instructions, null);
    assert.equal(nullUpdated.category, null);
    assert.equal(nullUpdated.startAt, null);
    assert.equal(nullUpdated.endAt, null);
    assert.equal(nullUpdated.status, BawalBoxQuestionStatus.DRAFT, 'null status is a no-op');
    assert.equal(nullUpdated.featured, false, 'null featured is a no-op');
    assert.equal(nullUpdated.answerLimit, null);

    const invalidUpdateWindowFixture = databaseFixture({
      question: {
        startAt: new Date('2026-12-01T00:00:00.000Z'),
        endAt: new Date('2026-12-15T00:00:00.000Z'),
      },
    });
    setPrismaForTests(invalidUpdateWindowFixture.database as PrismaClient);
    const invalidEndUpdate = plainToInstance(UpdateBawalBoxQuestionDto, {
      endAt: '2026-11-30T00:00:00.000Z',
    });
    assert.deepEqual(await validate(invalidEndUpdate), []);
    await assert.rejects(
      () => new BawalBoxService().updateQuestion('question-1', invalidEndUpdate, actor),
      /endAt must be after startAt/i,
    );
    assert.equal(invalidUpdateWindowFixture.events.includes('update-question'), false);

    const invalidCreateWindow = plainToInstance(CreateBawalBoxQuestionDto, {
      title: 'Valid question',
      startAt: '2026-12-01T00:00:00.000Z',
      endAt: '2026-11-30T00:00:00.000Z',
    });
    assert.deepEqual(await validate(invalidCreateWindow), []);
    await assert.rejects(
      () => new BawalBoxService().createQuestion(invalidCreateWindow, actor),
      /endAt must be after startAt/i,
    );
    assert.equal(invalidUpdateWindowFixture.events.includes('create-question'), false);

    const featureFixture = databaseFixture();
    setPrismaForTests(featureFixture.database as PrismaClient);
    const createdFeaturedQuestion = await new BawalBoxService().createQuestion(
      plainToInstance(CreateBawalBoxQuestionDto, {
        title: '  New featured question  ',
        status: BawalBoxQuestionStatus.PUBLISHED,
        featured: true,
      }),
      actor,
    );
    assert.equal(createdFeaturedQuestion.title, 'New featured question');
    assert.deepEqual(
      featureFixture.events.filter((event) =>
        [
          'transaction-start',
          'feature-lock',
          'unfeature-others',
          'create-question',
          'transaction-end',
        ].includes(event),
      ),
      [
        'transaction-start',
        'feature-lock',
        'unfeature-others',
        'create-question',
        'transaction-end',
      ],
      'unfeature and create run under the same serialized transaction',
    );
    assert.equal([...featureFixture.questions.values()].filter((item) => item.featured).length, 1);

    const concurrentFeatureFixture = databaseFixture();
    setPrismaForTests(concurrentFeatureFixture.database as PrismaClient);
    const concurrentFeatureService = new BawalBoxService();
    await Promise.all([
      concurrentFeatureService.createQuestion(
        plainToInstance(CreateBawalBoxQuestionDto, {
          title: 'Concurrent featured A',
          featured: true,
        }),
        actor,
      ),
      concurrentFeatureService.createQuestion(
        plainToInstance(CreateBawalBoxQuestionDto, {
          title: 'Concurrent featured B',
          featured: true,
        }),
        actor,
      ),
    ]);
    assert.equal(
      [...concurrentFeatureFixture.questions.values()].filter((item) => item.featured).length,
      1,
      'mock advisory lock serializes concurrent featured creates',
    );
    assert.deepEqual(
      concurrentFeatureFixture.events.filter((event) =>
        ['mock-lock-acquired', 'unfeature-others', 'create-question'].includes(event),
      ),
      [
        'mock-lock-acquired',
        'unfeature-others',
        'create-question',
        'mock-lock-acquired',
        'unfeature-others',
        'create-question',
      ],
    );

    const failedFeatureCreateFixture = databaseFixture({ failQuestionCreate: true });
    setPrismaForTests(failedFeatureCreateFixture.database as PrismaClient);
    await assert.rejects(
      () =>
        new BawalBoxService().createQuestion(
          plainToInstance(CreateBawalBoxQuestionDto, {
            title: 'A failed featured create',
            featured: true,
          }),
          actor,
        ),
      /Simulated question create failure/,
    );
    assert.equal(failedFeatureCreateFixture.questions.get('question-1')?.featured, true);
    assert.equal(
      [...failedFeatureCreateFixture.questions.values()].filter((item) => item.featured).length,
      1,
      'mock transaction restores the existing feature when create fails',
    );

    const failedFeatureUpdateFixture = databaseFixture({ failQuestionUpdate: true });
    failedFeatureUpdateFixture.questions.set('question-2', {
      ...failedFeatureUpdateFixture.questions.get('question-1')!,
      id: 'question-2',
      featured: false,
    });
    setPrismaForTests(failedFeatureUpdateFixture.database as PrismaClient);
    await assert.rejects(
      () =>
        new BawalBoxService().updateQuestion(
          'question-2',
          plainToInstance(UpdateBawalBoxQuestionDto, { featured: true }),
          actor,
        ),
      /Simulated question update failure/,
    );
    assert.equal(failedFeatureUpdateFixture.questions.get('question-1')?.featured, true);
    assert.equal(failedFeatureUpdateFixture.questions.get('question-2')?.featured, false);

    const responseFixture = databaseFixture({
      question: { answerLimit: 2 },
      responses: [
        {
          id: 'already-rejected',
          questionId: 'question-1',
          content: 'Previously rejected',
          status: BawalBoxResponseStatus.REJECTED,
          pinned: false,
          createdAt: new Date(),
        },
      ],
    });
    setPrismaForTests(responseFixture.database as PrismaClient);
    const responseService = new BawalBoxService();
    await responseService.createResponse('question-1', 'First additional answer');
    await assert.rejects(
      () => responseService.createResponse('question-1', 'Over the cap'),
      /reached its response limit/i,
      'rejected as well as pending/approved submissions consume the configured total cap',
    );
    assert.equal(responseFixture.responses.length, 2);
    assert.equal(responseFixture.events.filter((event) => event === 'row-lock').length, 2);

    const archivedResponseFixture = databaseFixture({
      question: { answerLimit: 1 },
      responses: [
        {
          id: 'already-archived',
          questionId: 'question-1',
          content: 'Previously archived',
          status: BawalBoxResponseStatus.ARCHIVED,
          pinned: false,
          createdAt: new Date(),
        },
      ],
    });
    setPrismaForTests(archivedResponseFixture.database as PrismaClient);
    await assert.rejects(
      () => new BawalBoxService().createResponse('question-1', 'Over archived cap'),
      /reached its response limit/i,
    );
    assert.equal(archivedResponseFixture.responses.length, 1);

    const concurrentFixture = databaseFixture({ question: { answerLimit: 1 } });
    setPrismaForTests(concurrentFixture.database as PrismaClient);
    const concurrentService = new BawalBoxService();
    const concurrent = await Promise.allSettled([
      concurrentService.createResponse('question-1', 'Concurrent answer A'),
      concurrentService.createResponse('question-1', 'Concurrent answer B'),
    ]);
    assert.equal(concurrent.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(concurrent.filter((result) => result.status === 'rejected').length, 1);
    assert.equal(
      concurrentFixture.responses.length,
      1,
      'concurrent requests cannot exceed the cap',
    );

    for (const answerLimit of [null, 0]) {
      const unlimitedFixture = databaseFixture({ question: { answerLimit } });
      setPrismaForTests(unlimitedFixture.database as PrismaClient);
      await new BawalBoxService().createResponse('question-1', 'Accepted without a cap');
      assert.equal(unlimitedFixture.responses.length, 1);
    }

    const updateFeatureFixture = databaseFixture();
    updateFeatureFixture.questions.set('question-1', {
      ...updateFeatureFixture.questions.get('question-1')!,
      featured: true,
    });
    updateFeatureFixture.questions.set('question-2', {
      ...updateFeatureFixture.questions.get('question-1')!,
      id: 'question-2',
      featured: false,
    });
    setPrismaForTests(updateFeatureFixture.database as PrismaClient);
    await new BawalBoxService().updateQuestion(
      'question-2',
      plainToInstance(UpdateBawalBoxQuestionDto, { featured: true }),
      actor,
    );
    assert.deepEqual(
      updateFeatureFixture.events.filter((event) =>
        [
          'transaction-start',
          'feature-lock',
          'row-lock',
          'unfeature-others',
          'update-question',
          'transaction-end',
        ].includes(event),
      ),
      [
        'transaction-start',
        'feature-lock',
        'row-lock',
        'unfeature-others',
        'update-question',
        'transaction-end',
      ],
    );
    assert.equal(updateFeatureFixture.questions.get('question-1')?.featured, false);
    assert.equal(updateFeatureFixture.questions.get('question-2')?.featured, true);

    console.log('BawalBox partial PATCH, featured-switch atomicity, and answer-limit tests passed');
  } finally {
    setPrismaForTests(realPrisma);
  }
}

void run();
