export function normalizeSearchText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterMissionaries(missionaries, query) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return missionaries;
  }

  return missionaries.filter((missionary) =>
    [missionary.name, missionary.country].some(
      (field) => field && normalizeSearchText(field).includes(normalizedQuery),
    ),
  );
}