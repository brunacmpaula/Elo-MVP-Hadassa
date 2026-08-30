import type { Missionary } from '@workspace/api-client-react';

export function normalizeSearchText(value: string): string;

export function filterMissionaries(
  missionaries: Missionary[],
  query: string,
): Missionary[];