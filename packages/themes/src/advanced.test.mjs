import assert from 'node:assert/strict';
import { exportPortableTheme, normalizeImportedTheme, themeToCssVariables } from '../dist/index.js';

const advanced = {
  schemaVersion: 1,
  type: 'theme',
  name: 'Holographic Test',
  slug: 'holographic-test',
  tags: ['test'],
  variant: 'featured',
  mode: 'dark',
  tokens: {
    background: '#071525',
    gradient: 'linear-gradient(135deg,#0ea5e9,#dbeafe)',
    textColor: '#eff6ff',
    accentColor: '#7dd3fc',
    fontFamily: 'Inter',
    radius: 24,
    cardStyle: 'holographic',
    cardBackground: 'radial-gradient(circle,#0ea5e9,#071525)',
    cardBorderWidth: '2px',
    cardBorderStyle: 'gradient',
    cardBorderGradient: 'linear-gradient(90deg,#0ea5e9,#dbeafe)',
    cardGlowEnabled: 'true',
    cardGlowColor: '#7dd3fc',
    cardLayout: 'horizontal',
    cardBodyFont: 'Georgia',
    cardBodyFontSize: '20px',
    cardBodyLineHeight: '1.5',
    cardBodyMaxLines: '4',
  },
};

const normalized = normalizeImportedTheme(advanced).normalized;
assert.equal(normalized.visualTokens.cardStyle, 'holographic');
assert.equal(normalized.visualTokens.cardLayout, 'horizontal');
assert.equal(themeToCssVariables(normalized)['--theme-card-glow-color'], '#7dd3fc');
assert.equal(themeToCssVariables(normalized)['--theme-card-body-font'], 'Georgia');

const exported = exportPortableTheme(normalized);
assert.equal(exported.tokens.cardBorderStyle, 'gradient');
assert.equal(exported.tokens.cardBodyFontSize, '20px');

const legacy = normalizeImportedTheme({
  schemaVersion: 1,
  type: 'theme',
  name: 'Legacy',
  slug: 'legacy',
  tags: [],
  variant: 'classic',
  mode: 'dark',
  tokens: {
    background: '#070a12',
    gradient: 'linear-gradient(135deg,#070a12,#101c3b)',
    textColor: '#fff',
    accentColor: '#00b8ff',
    fontFamily: 'Inter',
    radius: 28,
  },
});
assert.equal(legacy.normalized.visualTokens.cardStyle, undefined);

assert.throws(
  () =>
    normalizeImportedTheme({ ...advanced, tokens: { ...advanced.tokens, cardStyle: 'invalid' } }),
  /cardStyle must be one of/,
);
assert.throws(
  () => normalizeImportedTheme({ ...advanced, tokens: { ...advanced.tokens, unknownEffect: '1' } }),
  /Unsupported visual token: unknownEffect/,
);

console.log('advanced theme schema tests passed');
