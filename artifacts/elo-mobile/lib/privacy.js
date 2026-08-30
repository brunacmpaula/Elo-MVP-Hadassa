export const PUBLIC_PRIVACY_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnMount: 'always',
  refetchInterval: 15_000,
};

export function hideCachedMissionaryFields(missionary) {
  const {
    email: _email,
    country: _country,
    bio: _bio,
    ...safeMissionary
  } = missionary;
  return safeMissionary;
}

export function getVisibleMissionaries(missionaries, isFetching) {
  if (!missionaries) return missionaries;
  return isFetching ? missionaries.map(hideCachedMissionaryFields) : missionaries;
}

export function hideCachedPostFields(post) {
  const {
    missionaryCountry: _country,
    contributionFeedback: _contributionFeedback,
    ...safePost
  } = post;
  return safePost;
}

export function hideCachedMissionaryProfileFields(profile) {
  return {
    ...hideCachedMissionaryFields(profile),
    posts: profile.posts.map(hideCachedPostFields),
  };
}