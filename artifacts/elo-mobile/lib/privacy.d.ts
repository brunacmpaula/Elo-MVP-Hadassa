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

export function getVisibleMissionaries(
  missionaries: Missionary[] | undefined,
  isFetching: boolean,
): Missionary[] | undefined;

export function hideCachedPostFields(post: Post): Post;

export function hideCachedMissionaryProfileFields(
  profile: MissionaryProfile,
): MissionaryProfile;