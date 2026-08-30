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

export function hideCachedPostFields(post) {
  const { missionaryCountry: _country, ...safePost } = post;
  return safePost;
}

export function hideCachedMissionaryProfileFields(profile) {
  return {
    ...hideCachedMissionaryFields(profile),
    posts: profile.posts.map(hideCachedPostFields),
  };
}