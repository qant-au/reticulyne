// Small helpers with no dependencies, kept apart from common.ts (which
// loads chroma-js) so the read-only viewer can use the geometry and routing
// utils without it. common.ts re-exports all of these.

import { v4 as uuid } from 'uuid';

export const generateId = () => {
  return uuid();
};

export const clamp = (num: number, min: number, max: number) => {
  return Math.max(Math.min(num, max), min);
};

export const toPx = (value: number | string) => {
  return `${value}px`;
};

export function getItemByIdOrThrow<T extends { id: string }>(
  values: T[],
  id: string
): { value: T; index: number } {
  const index = values.findIndex((val) => {
    return val.id === id;
  });

  if (index === -1) {
    throw new Error(`Item with id "${id}" not found.`);
  }

  return { value: values[index], index };
}

export function getItemById<T extends { id: string }>(
  values: T[],
  id: string
): T | null {
  return (
    values.find((val) => {
      return val.id === id;
    }) ?? null
  );
}

export function getItemByIndexOrThrow<T>(items: T[], index: number): T {
  const item = items[index];

  if (!item) {
    throw new Error(`Item with index "${index}" not found.`);
  }

  return item;
}
