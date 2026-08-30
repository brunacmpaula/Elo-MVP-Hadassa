import type {
  Missionary,
  MissionaryProfile,
  Post,
} from '@workspace/api-client-react';

export const PUBLIC_PRIVACY_QUERY_OPTIONS: {
  staleTime: 0;
  refetchOnMount: 'always';
  refetchInterval: 15000;
};

export function hideCachedMissionaryFields(
  missionary: Missionary,
): Missionary;

export function hideCachedPostFields(post: Post): Post;

export function hideCachedMissionaryProfileFields(
  profile: MissionaryProfile,
): MissionaryProfile;