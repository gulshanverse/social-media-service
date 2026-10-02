import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminQueueQueryDto, CreateThemeDto, UpdateThemeDto } from './admin.dto';
import {
  analyzeThemeContrast,
  contrastRatio,
  evaluateContrast,
  exportPortableTheme,
  normalizeImportedTheme,
  normalizeTheme,
  themePresets,
  themeToCssVariables,
  validatePresets,
} from '@ggv/themes';

async function run() {
  const scheduled = plainToInstance(CreateThemeDto, {
    slug: 'seasonal',
    name: 'Seasonal',
    background: '#070a12',
    gradient: 'linear-gradient(135deg,#070a12,#101c3b)',
    textColor: '#fff',
    accentColor: '#00b8ff',
    fontFamily: 'Inter',
    radius: 28,
    status: 'SCHEDULED',
    startAt: '2026-10-03T00:00:00.000Z',
    endAt: '2026-10-04T00:00:00.000Z',
  });
  assert.equal((await validate(scheduled)).length, 0);
  const invalidStatus = plainToInstance(UpdateThemeDto, { status: 'BROKEN' });
  assert.ok((await validate(invalidStatus)).some((error) => error.property === 'status'));

  const filters = plainToInstance(AdminQueueQueryDto, {
    status: 'PUBLISHED',
    category: 'CRUSH',
    theme: 'theme-1',
    variant: 'editorial',
    mode: 'dark',
    favorites: 'true',
    search: 'campus',
    order: 'oldest',
    page: '2',
    limit: '10',
  });
  assert.equal((await validate(filters)).length, 0);
  assert.equal(filters.favorites, true);
  assert.equal(filters.variant, 'editorial');
  assert.equal(filters.mode, 'dark');
  const normalized = normalizeTheme({
    id: 'draft',
    name: 'Draft',
    background: '#070a12',
    gradient: 'linear-gradient(135deg,#070a12,#101c3b)',
    textColor: '#fff',
    accentColor: '#00b8ff',
    fontFamily: 'Inter',
    radius: 24,
    tokens: { primaryText: '#fff', buttonVariant: 'outline', cardRadius: '18px' },
  });
  assert.equal(normalized.visualTokens.buttonVariant, 'outline');
  assert.equal(themeToCssVariables(normalized)['--theme-primary-text'], '#fff');
  assert.throws(() =>
    normalizeTheme({ ...normalized, tokens: { primaryText: 'url(javascript:bad)' } }),
  );
  const portable = exportPortableTheme({
    ...normalized,
    mode: 'dark',
    description: 'Portable theme',
    tags: ['test'],
  });
  assert.equal(portable.schemaVersion, 1);
  assert.equal((portable as any).id, undefined);
  assert.equal((portable as any).createdAt, undefined);
  assert.equal(normalizeImportedTheme(portable).normalized.visualTokens.buttonVariant, 'outline');
  assert.throws(() => normalizeImportedTheme({ ...portable, schemaVersion: 99 }));
  assert.throws(() =>
    normalizeImportedTheme({
      ...portable,
      tokens: { ...portable.tokens, background: 'url(javascript:bad)' },
    }),
  );
  assert.equal(new Set(themePresets.map((preset) => preset.slug)).size, 14);
  assert.equal(validatePresets().length, 14);
  assert.equal(contrastRatio('#000', '#fff'), 21);
  assert.equal(evaluateContrast('#000', '#fff')?.aaaNormal, true);
  assert.equal(evaluateContrast('#777', '#fff')?.aaNormal, false);
  assert.equal(contrastRatio('rgba(0,0,0,.5)', '#fff') !== null, true);
  assert.equal(contrastRatio('rgba(0,0,0,.5)', 'rgba(255,255,255,.5)'), null);
  assert.equal(
    analyzeThemeContrast({
      ...normalized,
      tokens: { ...normalized.visualTokens, primaryText: '#fff' },
    }).length > 0,
    true,
  );
  console.log('phase 2 lifecycle DTO and filter regression tests passed');
}
void run();
