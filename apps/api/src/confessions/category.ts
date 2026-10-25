import { BadRequestException } from '@nestjs/common';
import { allConfessionCategories } from '@ggv/types';

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/;
const STANDARD_LABELS = new Set(
  allConfessionCategories.map((category) => category.toLowerCase().replace(/[_\s-]+/g, '')),
);

export function normalizeCustomCategory(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('Your Category is required when CUSTOM is selected.');
  }
  const normalized = value.trim();
  if (!normalized) throw new BadRequestException('Your Category cannot be blank.');
  if (normalized.length > 40)
    throw new BadRequestException('Your Category must be 40 characters or fewer.');
  if (CONTROL_CHARACTERS.test(normalized))
    throw new BadRequestException('Your Category contains invalid control characters.');
  if (STANDARD_LABELS.has(normalized.toLowerCase().replace(/[_\s-]+/g, '')))
    throw new BadRequestException('Choose a distinct custom category label.');
  return normalized;
}

export function validateCategoryPair(category: string | undefined, customCategory: unknown) {
  if (category === 'CUSTOM') return normalizeCustomCategory(customCategory);
  if (customCategory !== undefined && customCategory !== null && customCategory !== '')
    throw new BadRequestException('Your Category is only valid when CUSTOM is selected.');
  return undefined;
}
