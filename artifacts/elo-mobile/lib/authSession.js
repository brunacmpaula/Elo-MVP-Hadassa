export const SESSION_STORAGE_KEYS = [
  '@elo:user',
  '@elo:token',
  '@elo:profile-preferences',
];

export async function clearPersistedSession(storage) {
  const results = await Promise.allSettled(
    SESSION_STORAGE_KEYS.map((key) => storage.removeItem(key)),
  );
  const failed = results.find((result) => result.status === 'rejected');

  if (failed) {
    throw new Error('Unable to clear the persisted session');
  }
}