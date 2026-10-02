import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminQueueQueryDto, CreateThemeDto, UpdateThemeDto } from './admin.dto';
import { normalizeTheme, themeToCssVariables } from '@ggv/themes';

async function run() {
  const scheduled = plainToInstance(CreateThemeDto, {
    slug: 'seasonal', name: 'Seasonal', background: '#070a12',
    gradient: 'linear-gradient(135deg,#070a12,#101c3b)', textColor: '#fff',
    accentColor: '#00b8ff', fontFamily: 'Inter', radius: 28,
    status: 'SCHEDULED', startAt: '2026-10-03T00:00:00.000Z', endAt: '2026-10-04T00:00:00.000Z',
  });
  assert.equal((await validate(scheduled)).length, 0);
  const invalidStatus = plainToInstance(UpdateThemeDto, { status: 'BROKEN' });
  assert.ok((await validate(invalidStatus)).some((error) => error.property === 'status'));

  const filters = plainToInstance(AdminQueueQueryDto, {
    status: 'PUBLISHED', category: 'CRUSH', theme: 'theme-1', variant: 'editorial',
    mode: 'dark', favorites: 'true', search: 'campus', order: 'oldest', page: '2', limit: '10',
  });
  assert.equal((await validate(filters)).length, 0);
  assert.equal(filters.favorites, true);
  assert.equal(filters.variant, 'editorial');
  assert.equal(filters.mode, 'dark');
  const normalized = normalizeTheme({
    id: 'draft', name: 'Draft', background: '#070a12', gradient: 'linear-gradient(135deg,#070a12,#101c3b)',
    textColor: '#fff', accentColor: '#00b8ff', fontFamily: 'Inter', radius: 24,
    tokens: { primaryText: '#fff', buttonVariant: 'outline', cardRadius: '18px' },
  });
  assert.equal(normalized.visualTokens.buttonVariant, 'outline');
  assert.equal(themeToCssVariables(normalized)['--theme-primary-text'], '#fff');
  assert.throws(() => normalizeTheme({ ...normalized, tokens: { primaryText: 'url(javascript:bad)' } }));
  console.log('phase 2 lifecycle DTO and filter regression tests passed');
}
void run();
