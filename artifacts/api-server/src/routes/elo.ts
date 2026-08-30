import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";
import {
  CreatePostCommentBody,
  CreatePostCommentResponse,
  CreateContributionAvailabilityResponse,
  CreateContributionAvailabilityFeedbackBody,
  CreateContributionAvailabilityFeedbackResponse,
  CreatePostBody,
  CreatePostResponse,
  ListPostCommentsResponse,
  ListMissionaryContributionAvailabilitiesResponse,
  FollowMissionaryResponse,
  GetMissionaryResponse,
  GetMissionaryPreferencesResponse,
  GetPostResponse,
  ListMissionariesResponse,
  ListPostsQueryParams,
  ListPostsResponse,
  LoginBody,
  LoginResponse,
  PrayForPostResponse,
  RemovePrayerResponse,
  RemoveContributionAvailabilityResponse,
  SyncOperationsBody,
  SyncOperationsResponse,
  UnfollowMissionaryResponse,
  UpdateMissionaryPreferencesBody,
  UpdateMissionaryPreferencesResponse,
  UpdatePostBody,
  UpdatePostResponse,
} from "@workspace/api-zod";
import {
  contributionAvailabilitiesTable,
  contributionAvailabilityFeedbackTable,
  db,
  postsTable,
  profilePreferencesTable,
} from "@workspace/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { dispatchMissionaryNotification } from "../lib/notifications";

type ProfileField = "email" | "location" | "bio";

type ProfilePreferences = {
  hiddenFields: ProfileField[];
  womenOnlyNotifications: boolean;
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "MISSIONARY" | "SUPPORTER";
  gender: "FEMALE" | "MALE";
  missionaryProfileId?: string;
};

type SessionTokenPayload = {
  sub: string;
  exp: number;
  jti: string;
};

type Post = {
  id: string;
  clientOperationId: string;
  missionaryId: string;
  missionaryName: string;
  missionaryCountry: string;
  type: "UPDATE" | "PRAYER_REQUEST" | "NEED";
  title: string;
  content: string;
  status: "DRAFT" | "PENDING_SYNC" | "PUBLISHED" | "SYNC_FAILED";
  createdAt: string;
  updatedAt: string;
  prayerCount: number;
  prayedByMe: boolean;
  missionarySaved: boolean;
  contributionFeedback: ContributionAvailabilityFeedback | null;
  media: PostMedia[];
  comments: Comment[];
};

type PostMedia = {
  id: string;
  clientMediaId: string;
  uri: string;
  thumbnailUri: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  width: number;
  height: number;
};

type Comment = {
  id: string;
  postId: string;
  authorName: string;
  content: string;
  createdAt: string;
  clientOperationKey?: string;
};

type ContributionAvailabilityFeedback = {
  id: string;
  availabilityId: string;
  postId: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
};

type Missionary = {
  id: string;
  userId: string;
  name: string;
  email: string;
  bio: string;
  country: string;
  initials: string;
  isFollowed: boolean;
  latestPostType: Post["type"] | null;
};

const missionaries: Missionary[] = [
  {
    id: "missionary-ana",
    userId: "user-ana",
    name: "Ana Silva",
    email: "ana@elo.demo",
    bio: "Servindo famílias e formando lideranças locais com a comunidade.",
    country: "Moçambique",
    initials: "AS",
    isFollowed: true,
    latestPostType: "PRAYER_REQUEST",
  },
  {
    id: "missionary-joao",
    userId: "user-joao",
    name: "João Santos",
    email: "joao@elo.demo",
    bio: "Apoiando projetos de educação e cuidado integral no interior.",
    country: "Brasil",
    initials: "JS",
    isFollowed: true,
    latestPostType: "UPDATE",
  },
  {
    id: "missionary-lucia",
    userId: "user-lucia",
    name: "Lúcia Nascimento",
    email: "lucia@elo.demo",
    bio: "Caminhando com mulheres e crianças em comunidades ribeirinhas.",
    country: "Peru",
    initials: "LN",
    isFollowed: false,
    latestPostType: "NEED",
  },
];

const now = new Date().toISOString();
const defaultPosts: Post[] = [
  {
    id: "post-community-kits",
    clientOperationId: "seed-post-community-kits",
    missionaryId: "missionary-ana",
    missionaryName: "Ana Silva",
    missionaryCountry: "Moçambique",
    type: "NEED",
    title: "Kits de cuidado para novas famílias",
    content:
      "Precisamos de pessoas disponíveis para conversar sobre formas de apoiar a montagem e a entrega dos próximos kits.",
    status: "PUBLISHED",
    createdAt: now,
    updatedAt: now,
    prayerCount: 7,
    prayedByMe: false,
    missionarySaved: false,
    contributionFeedback: null,
    media: [],
    comments: [],
  },
  {
    id: "post-prayer-team",
    clientOperationId: "seed-post-prayer-team",
    missionaryId: "missionary-ana",
    missionaryName: "Ana Silva",
    missionaryCountry: "Moçambique",
    type: "PRAYER_REQUEST",
    title: "Ore pela nossa equipe esta semana",
    content:
      "Estamos visitando novas comunidades e precisamos de sabedoria, saúde e boas conversas em cada encontro.",
    status: "PUBLISHED",
    createdAt: now,
    updatedAt: now,
    prayerCount: 42,
    prayedByMe: false,
    missionarySaved: false,
    contributionFeedback: null,
    media: [],
    comments: [],
  },
  {
    id: "post-school",
    clientOperationId: "seed-post-school",
    missionaryId: "missionary-joao",
    missionaryName: "João Santos",
    missionaryCountry: "Brasil",
    type: "UPDATE",
    title: "Uma nova turma começou",
    content:
      "Recebemos doze alunos para um novo ciclo de acompanhamento. Obrigado por caminhar conosco.",
    status: "PUBLISHED",
    createdAt: now,
    updatedAt: now,
    prayerCount: 18,
    prayedByMe: false,
    missionarySaved: false,
    contributionFeedback: null,
    media: [],
    comments: [],
  },
];

let posts: Post[] = [];
const processedOperations = new Map<string, string>();
const processedComments = new Map<string, string>();
const followedMissionariesByUser = new Map<string, Set<string>>([
  ["user-supporter", new Set(["missionary-ana", "missionary-joao"])],
]);
const router: IRouter = Router();
const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  hiddenFields: [],
  womenOnlyNotifications: false,
};
const demoCredentialsByEmail = new Map<
  string,
  { password: string; user: SessionUser }
>([
  [
    "ana@elo.demo",
    {
      password: "demo",
      user: {
        id: "user-ana",
        name: "Ana Silva",
        email: "ana@elo.demo",
        role: "MISSIONARY",
        gender: "FEMALE",
        missionaryProfileId: "missionary-ana",
      },
    },
  ],
  [
    "joao@elo.demo",
    {
      password: "demo",
      user: {
        id: "user-joao",
        name: "João Santos",
        email: "joao@elo.demo",
        role: "MISSIONARY",
        gender: "MALE",
        missionaryProfileId: "missionary-joao",
      },
    },
  ],
  [
    "marina@elo.demo",
    {
      password: "demo",
      user: {
        id: "user-supporter",
        name: "Marina",
        email: "marina@elo.demo",
        role: "SUPPORTER",
        gender: "MALE",
      },
    },
  ],
  [
    "bruno@elo.demo",
    {
      password: "demo",
      user: {
        id: "user-supporter-bruno",
        name: "Bruno",
        email: "bruno@elo.demo",
        role: "SUPPORTER",
        gender: "MALE",
      },
    },
  ],
]);
const sessionUsersById = new Map(
  Array.from(demoCredentialsByEmail.values(), ({ user }) => [user.id, user]),
);
const followerNotificationRecipients = [
  { id: "user-supporter", gender: "MALE" as const },
  { id: "user-supporter-female", gender: "FEMALE" as const },
];

let postsLoadPromise: Promise<void> | null = null;

function postFromRecord(record: typeof postsTable.$inferSelect): Post {
  return {
    id: record.id,
    clientOperationId: record.clientOperationId,
    missionaryId: record.missionaryId,
    missionaryName: record.missionaryName,
    missionaryCountry: record.missionaryCountry,
    type: record.type as Post["type"],
    title: record.title,
    content: record.content,
    status: record.status as Post["status"],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    prayerCount: record.prayerCount,
    prayedByMe: false,
    missionarySaved: false,
    contributionFeedback: null,
    media: record.media as PostMedia[],
    comments: record.comments as Comment[],
  };
}

function postValues(post: Post) {
  return {
    id: post.id,
    clientOperationId: post.clientOperationId,
    missionaryId: post.missionaryId,
    missionaryName: post.missionaryName,
    missionaryCountry: post.missionaryCountry,
    type: post.type,
    title: post.title,
    content: post.content,
    status: post.status,
    createdAt: new Date(post.createdAt),
    updatedAt: new Date(post.updatedAt),
    prayerCount: post.prayerCount,
    media: post.media,
    comments: post.comments,
  };
}

async function insertPost(post: Post) {
  await db.insert(postsTable).values(postValues(post));
}

async function updateStoredPost(post: Post) {
  await db
    .update(postsTable)
    .set({
      title: post.title,
      content: post.content,
      status: post.status,
      updatedAt: new Date(post.updatedAt),
      prayerCount: post.prayerCount,
      media: post.media,
      comments: post.comments,
    })
    .where(eq(postsTable.id, post.id));
}

async function ensurePostsLoaded() {
  if (postsLoadPromise) return postsLoadPromise;

  postsLoadPromise = (async () => {
    let records = await db
      .select()
      .from(postsTable)
      .orderBy(desc(postsTable.createdAt), desc(postsTable.id));

    if (records.length === 0) {
      await db
        .insert(postsTable)
        .values(defaultPosts.map(postValues))
        .onConflictDoNothing();
      records = await db
        .select()
        .from(postsTable)
        .orderBy(desc(postsTable.createdAt), desc(postsTable.id));
    }

    posts = records.map(postFromRecord);
    processedOperations.clear();
    for (const post of posts) {
      processedOperations.set(post.clientOperationId, post.id);
    for (const comment of post.comments) {
      if (comment.clientOperationKey) {
        processedComments.set(comment.clientOperationKey, comment.id);
      }
    }
    }

    for (const missionary of missionaries) {
      missionary.latestPostType =
        posts.find((post) => post.missionaryId === missionary.id)?.type ?? null;
    }
  })().catch((error) => {
    postsLoadPromise = null;
    throw error;
  });

  return postsLoadPromise;
}

function findMissionary(id: string) {
  return missionaries.find((missionary) => missionary.id === id);
}

function findMissionaryForUser(userId: string) {
  return missionaries.find((missionary) => missionary.userId === userId);
}

function getSessionSecret() {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET must be configured");
  return secret;
}

function signTokenPayload(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function issueSessionToken(user: SessionUser) {
  const payload: SessionTokenPayload = {
    sub: user.id,
    exp: Date.now() + 24 * 60 * 60 * 1000,
    jti: randomUUID(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  return `${encodedPayload}.${signTokenPayload(encodedPayload)}`;
}

function verifySessionToken(token: string) {
  const [encodedPayload, suppliedSignature, extra] = token.split(".");
  if (!encodedPayload || !suppliedSignature || extra) return null;

  const expectedSignature = signTokenPayload(encodedPayload);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SessionTokenPayload>;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Date.now() ||
      typeof payload.jti !== "string"
    ) {
      return null;
    }
    return sessionUsersById.get(payload.sub) ?? null;
  } catch {
    return null;
  }
}

function getAuthenticatedUser(req: Request) {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return verifySessionToken(authorization.slice("Bearer ".length));
}

function normalizeProfilePreferences(
  hiddenFields: string[],
  womenOnlyNotifications: boolean,
): ProfilePreferences {
  const allowedFields = new Set<ProfileField>(["email", "location", "bio"]);
  return {
    hiddenFields: hiddenFields.filter(
      (field): field is ProfileField =>
        allowedFields.has(field as ProfileField),
    ),
    womenOnlyNotifications,
  };
}

async function getProfilePreferences(userId: string) {
  const [stored] = await db
    .select()
    .from(profilePreferencesTable)
    .where(eq(profilePreferencesTable.userId, userId))
    .limit(1);

  if (stored) {
    return normalizeProfilePreferences(
      stored.hiddenFields,
      stored.womenOnlyNotifications,
    );
  }

  await db
    .insert(profilePreferencesTable)
    .values({ userId, ...DEFAULT_PROFILE_PREFERENCES })
    .onConflictDoNothing();
  return DEFAULT_PROFILE_PREFERENCES;
}

async function saveProfilePreferences(
  userId: string,
  preferences: ProfilePreferences,
) {
  await db
    .insert(profilePreferencesTable)
    .values({ userId, ...preferences })
    .onConflictDoUpdate({
      target: profilePreferencesTable.userId,
      set: preferences,
    });
  return preferences;
}

async function getContributionAvailabilityState(
  post: Post,
  viewer: SessionUser | null,
) {
  if (post.type !== "NEED") {
    return {
      postId: post.id,
      availableByMe: false,
      availabilityCount: 0,
    };
  }

  const records = await db
    .select({ supporterId: contributionAvailabilitiesTable.supporterId })
    .from(contributionAvailabilitiesTable)
    .where(eq(contributionAvailabilitiesTable.postId, post.id));

  return {
    postId: post.id,
    availableByMe:
      viewer?.role === "SUPPORTER" &&
      records.some((record) => record.supporterId === viewer.id),
    availabilityCount: records.length,
  };
}

async function getContributionFeedbackForSupporter(
  post: Post,
  viewer: SessionUser | null,
) {
  if (post.type !== "NEED" || viewer?.role !== "SUPPORTER") return null;

  const [availability] = await db
    .select({ id: contributionAvailabilitiesTable.id })
    .from(contributionAvailabilitiesTable)
    .where(
      and(
        eq(contributionAvailabilitiesTable.postId, post.id),
        eq(contributionAvailabilitiesTable.supporterId, viewer.id),
      ),
    )
    .limit(1);
  if (!availability) return null;

  const [feedback] = await db
    .select()
    .from(contributionAvailabilityFeedbackTable)
    .where(
      eq(
        contributionAvailabilityFeedbackTable.availabilityId,
        availability.id,
      ),
    )
    .limit(1);

  return feedback
    ? {
        id: feedback.id,
        availabilityId: feedback.availabilityId,
        postId: feedback.postId,
        message: feedback.message,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
      }
    : null;
}

function ensureProfileOwner(
  req: Request,
  res: Response,
  missionary: Missionary,
) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Autenticação necessária" });
    return null;
  }
  if (user.id !== missionary.userId || user.role !== "MISSIONARY") {
    res.status(403).json({ error: "Acesso restrito ao titular do perfil" });
    return null;
  }
  return user;
}

function ensureMissionaryUser(req: Request, res: Response) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Autenticação necessária" });
    return null;
  }
  if (user.role !== "MISSIONARY") {
    res.status(403).json({ error: "Acesso restrito a missionários" });
    return null;
  }
  const missionary = findMissionaryForUser(user.id);
  if (!missionary) {
    res.status(403).json({ error: "Perfil missionário não encontrado" });
    return null;
  }
  return missionary;
}

function ensureSupporterUser(req: Request, res: Response) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Autenticação necessária" });
    return null;
  }
  if (user.role !== "SUPPORTER") {
    res.status(403).json({ error: "Acesso restrito a apoiadores" });
    return null;
  }
  return user;
}

function getFollowedMissionaries(userId: string) {
  let followed = followedMissionariesByUser.get(userId);
  if (!followed) {
    followed = new Set();
    followedMissionariesByUser.set(userId, followed);
  }
  return followed;
}

const MAX_MEDIA_BYTES = 1_500_000;
const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function decodedDataUrlBytes(uri: string) {
  const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(
    uri,
  );
  if (!match) return null;
  return Buffer.from(match[1], "base64").byteLength;
}

function normalizePostMedia(
  input: Array<{
    clientMediaId: string;
    uri: string;
    thumbnailUri: string;
    mimeType: string;
    sizeBytes: number;
    width: number;
    height: number;
  }> = [],
) {
  if (input.length > 4) throw new Error("Máximo de 4 imagens por publicação");
  const seen = new Set<string>();
  return input.map((item) => {
    if (seen.has(item.clientMediaId)) {
      throw new Error("A mesma imagem foi enviada mais de uma vez");
    }
    seen.add(item.clientMediaId);
    const decodedBytes = decodedDataUrlBytes(item.uri);
    const thumbnailBytes = decodedDataUrlBytes(item.thumbnailUri);
    if (
      !ALLOWED_MEDIA_TYPES.has(item.mimeType) ||
      decodedBytes === null ||
      thumbnailBytes === null
    ) {
      throw new Error("Formato de imagem inválido");
    }
    if (
      !Number.isInteger(item.sizeBytes) ||
      item.sizeBytes !== decodedBytes ||
      decodedBytes > MAX_MEDIA_BYTES
    ) {
      throw new Error("Imagem maior que o limite de 1,5 MB");
    }
    if (
      !Number.isInteger(item.width) ||
      !Number.isInteger(item.height) ||
      item.width < 1 ||
      item.height < 1
    ) {
      throw new Error("Dimensões de imagem inválidas");
    }
    return {
      ...item,
      id: `media-${item.clientMediaId}`,
      mimeType: item.mimeType as PostMedia["mimeType"],
    };
  });
}

function ensurePostOwner(req: Request, res: Response, post: Post) {
  const missionary = ensureMissionaryUser(req, res);
  if (!missionary) return null;
  if (post.missionaryId !== missionary.id) {
    res.status(403).json({ error: "Publicação pertence a outro perfil" });
    return null;
  }
  return missionary;
}

async function toPublicMissionary(
  missionary: Missionary,
  viewer: SessionUser | null,
) {
  const preferences = await getProfilePreferences(missionary.userId);
  const isOwner = viewer?.id === missionary.userId;
  const {
    email,
    bio,
    country,
    ...alwaysPublic
  } = missionary;

  return {
    ...alwaysPublic,
    isFollowed:
      viewer?.role === "SUPPORTER"
        ? getFollowedMissionaries(viewer.id).has(missionary.id)
        : false,
    ...(isOwner || !preferences.hiddenFields.includes("email") ? { email } : {}),
    ...(isOwner || !preferences.hiddenFields.includes("bio") ? { bio } : {}),
    ...(isOwner || !preferences.hiddenFields.includes("location")
      ? { country }
      : {}),
  };
}

async function toPublicPost(post: Post, viewer: SessionUser | null) {
  const missionary = findMissionary(post.missionaryId);
  const contributionAvailability = await getContributionAvailabilityState(
    post,
    viewer,
  );
  const contributionFeedback = await getContributionFeedbackForSupporter(
    post,
    viewer,
  );
  const viewerPost = {
    ...post,
    missionarySaved:
      viewer?.role === "SUPPORTER"
        ? getFollowedMissionaries(viewer.id).has(post.missionaryId)
        : false,
    contributionAvailabilityCount:
      contributionAvailability.availabilityCount,
    contributionAvailableByMe: contributionAvailability.availableByMe,
    contributionFeedback,
  };
  if (!missionary) return viewerPost;
  const preferences = await getProfilePreferences(missionary.userId);
  if (
    viewer?.id === missionary.userId ||
    !preferences.hiddenFields.includes("location")
  ) {
    return viewerPost;
  }
  const { missionaryCountry: _hiddenCountry, ...publicPost } = viewerPost;
  return publicPost;
}

router.post("/auth/login", (req, res) => {
  const input = LoginBody.parse(req.body);
  const credentials = demoCredentialsByEmail.get(input.email.toLowerCase());
  if (!credentials || credentials.password !== input.password) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }
  const { user } = credentials;
  const token = issueSessionToken(user);
  res.json(
    LoginResponse.parse({
      user,
      token,
    }),
  );
});

router.get("/missionaries", async (req, res) => {
  await ensurePostsLoaded();
  const viewer = getAuthenticatedUser(req);
  const publicMissionaries = await Promise.all(
    missionaries.map((missionary) => toPublicMissionary(missionary, viewer)),
  );
  res.json(ListMissionariesResponse.parse(publicMissionaries));
});

router.get("/missionaries/:missionaryId", async (req, res) => {
  await ensurePostsLoaded();
  const missionary = findMissionary(req.params["missionaryId"] ?? "");
  if (!missionary) {
    res.status(404).json({ error: "Missionário não encontrado" });
    return;
  }
  const viewer = getAuthenticatedUser(req);
  const publicMissionary = await toPublicMissionary(missionary, viewer);
  const publicPosts = await Promise.all(
    posts
      .filter((post) => post.missionaryId === missionary.id)
      .map((post) => toPublicPost(post, viewer)),
  );
  res.json(
    GetMissionaryResponse.parse({
      ...publicMissionary,
      posts: publicPosts,
    }),
  );
});

router.get("/missionaries/:missionaryId/preferences", async (req, res) => {
  const missionary = findMissionary(req.params["missionaryId"] ?? "");
  if (!missionary) {
    res.status(404).json({ error: "Missionário não encontrado" });
    return;
  }
  if (!ensureProfileOwner(req, res, missionary)) return;
  const preferences = await getProfilePreferences(missionary.userId);
  res.json(GetMissionaryPreferencesResponse.parse(preferences));
});

router.get(
  "/missionaries/:missionaryId/contribution-availabilities",
  async (req, res) => {
    await ensurePostsLoaded();
    const missionary = findMissionary(req.params["missionaryId"] ?? "");
    if (!missionary) {
      res.status(404).json({ error: "Missionário não encontrado" });
      return;
    }
    if (!ensureProfileOwner(req, res, missionary)) return;

    const needPostIds = posts
      .filter(
        (post) => post.missionaryId === missionary.id && post.type === "NEED",
      )
      .map((post) => post.id);
    if (needPostIds.length === 0) {
      res.json(ListMissionaryContributionAvailabilitiesResponse.parse([]));
      return;
    }

    const records = await db
      .select()
      .from(contributionAvailabilitiesTable)
      .where(inArray(contributionAvailabilitiesTable.postId, needPostIds));
    const feedbackRecords = records.length
      ? await db
          .select()
          .from(contributionAvailabilityFeedbackTable)
          .where(
            inArray(
              contributionAvailabilityFeedbackTable.availabilityId,
              records.map((record) => record.id),
            ),
          )
      : [];
    const feedbackByAvailabilityId = new Map(
      feedbackRecords.map((feedback) => [
        feedback.availabilityId,
        {
          id: feedback.id,
          availabilityId: feedback.availabilityId,
          postId: feedback.postId,
          message: feedback.message,
          createdAt: feedback.createdAt,
          updatedAt: feedback.updatedAt,
        },
      ]),
    );
    const response = records
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map(({ id, postId, supporterName, createdAt }) => ({
        id,
        postId,
        supporterName,
        createdAt,
        feedback: feedbackByAvailabilityId.get(id) ?? null,
      }));

    res.json(ListMissionaryContributionAvailabilitiesResponse.parse(response));
  },
);

router.post(
  "/missionaries/:missionaryId/contribution-availabilities/:availabilityId/feedback",
  async (req, res) => {
    const missionary = findMissionary(req.params["missionaryId"] ?? "");
    if (!missionary) {
      res.status(404).json({ error: "Missionário não encontrado" });
      return;
    }
    if (!ensureProfileOwner(req, res, missionary)) return;

    const availabilityId = req.params["availabilityId"] ?? "";
    const [availability] = await db
      .select()
      .from(contributionAvailabilitiesTable)
      .where(eq(contributionAvailabilitiesTable.id, availabilityId))
      .limit(1);
    const post = availability
      ? posts.find((item) => item.id === availability.postId)
      : undefined;
    if (!availability || !post || post.missionaryId !== missionary.id) {
      res.status(404).json({ error: "Disponibilidade não encontrada" });
      return;
    }
    if (post.type !== "NEED") {
      res
        .status(400)
        .json({ error: "Retornos só podem ser enviados para Necessidades" });
      return;
    }

    const parsed = CreateContributionAvailabilityFeedbackBody.safeParse(
      req.body,
    );
    if (!parsed.success) {
      res.status(400).json({ error: "Retorno inválido" });
      return;
    }
    const message = parsed.data.message.trim();
    if (!message) {
      res.status(400).json({ error: "Escreva uma mensagem antes de enviar" });
      return;
    }

    const id = `feedback-${availability.id}`;
    await db
      .insert(contributionAvailabilityFeedbackTable)
      .values({
        id,
        availabilityId: availability.id,
        postId: availability.postId,
        missionaryId: missionary.id,
        supporterId: availability.supporterId,
        message,
      })
      .onConflictDoUpdate({
        target: contributionAvailabilityFeedbackTable.availabilityId,
        set: {
          message,
          updatedAt: new Date(),
        },
      });

    const [feedback] = await db
      .select()
      .from(contributionAvailabilityFeedbackTable)
      .where(
        eq(contributionAvailabilityFeedbackTable.availabilityId, availability.id),
      )
      .limit(1);
    res
      .status(201)
      .json(CreateContributionAvailabilityFeedbackResponse.parse(feedback));
  },
);

router.patch("/missionaries/:missionaryId/preferences", async (req, res) => {
  const missionary = findMissionary(req.params["missionaryId"] ?? "");
  if (!missionary) {
    res.status(404).json({ error: "Missionário não encontrado" });
    return;
  }
  if (!ensureProfileOwner(req, res, missionary)) return;

  const parsed = UpdateMissionaryPreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Preferências inválidas" });
    return;
  }
  const preferences = normalizeProfilePreferences(
    parsed.data.hiddenFields,
    parsed.data.womenOnlyNotifications,
  );
  if (preferences.hiddenFields.length !== new Set(preferences.hiddenFields).size) {
    res.status(400).json({ error: "Campos ocultos não podem ser duplicados" });
    return;
  }

  const saved = await saveProfilePreferences(missionary.userId, preferences);
  res.json(UpdateMissionaryPreferencesResponse.parse(saved));
});

router.post("/missionaries/:missionaryId/follow", (req, res) => {
  const missionary = findMissionary(req.params["missionaryId"] ?? "");
  if (!missionary) {
    res.status(404).json({ error: "Missionário não encontrado" });
    return;
  }
  const supporter = ensureSupporterUser(req, res);
  if (!supporter) return;
  getFollowedMissionaries(supporter.id).add(missionary.id);
  res.json(
    FollowMissionaryResponse.parse({
      missionaryId: missionary.id,
      isFollowed: true,
    }),
  );
});

router.delete("/missionaries/:missionaryId/follow", (req, res) => {
  const missionary = findMissionary(req.params["missionaryId"] ?? "");
  if (!missionary) {
    res.status(404).json({ error: "Missionário não encontrado" });
    return;
  }
  const supporter = ensureSupporterUser(req, res);
  if (!supporter) return;
  getFollowedMissionaries(supporter.id).delete(missionary.id);
  res.json(
    UnfollowMissionaryResponse.parse({
      missionaryId: missionary.id,
      isFollowed: false,
    }),
  );
});

router.get("/posts", async (req, res) => {
  await ensurePostsLoaded();
  const query = ListPostsQueryParams.parse(req.query);
  const filtered = query.missionaryId
    ? posts.filter((post) => post.missionaryId === query.missionaryId)
    : posts;
  const viewer = getAuthenticatedUser(req);
  const publicPosts = await Promise.all(
    filtered.map((post) => toPublicPost(post, viewer)),
  );
  res.json(ListPostsResponse.parse(publicPosts));
});

router.post("/posts", async (req, res) => {
  await ensurePostsLoaded();
  const authenticatedMissionary = ensureMissionaryUser(req, res);
  if (!authenticatedMissionary) return;
  const parsedInput = CreatePostBody.safeParse(req.body);
  if (!parsedInput.success) {
    res.status(400).json({ error: "Publicação ou imagem inválida" });
    return;
  }
  const input = parsedInput.data;
  const existingId = processedOperations.get(input.clientOperationId);
  const existing = existingId
    ? posts.find((post) => post.id === existingId)
    : undefined;
  if (existing) {
    if (existing.missionaryId !== authenticatedMissionary.id) {
      res.status(403).json({ error: "Operação pertence a outro perfil" });
      return;
    }
    res
      .status(201)
      .json(
        CreatePostResponse.parse(
          await toPublicPost(existing, getAuthenticatedUser(req)),
        ),
      );
    return;
  }

  const missionary = authenticatedMissionary;

  let media: PostMedia[];
  try {
    media = normalizePostMedia(input.media ?? []);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Imagem inválida",
    });
    return;
  }
  const timestamp = new Date().toISOString();
  const post: Post = {
    id: `post-${randomUUID()}`,
    clientOperationId: input.clientOperationId,
    missionaryId: missionary.id,
    missionaryName: missionary.name,
    missionaryCountry: missionary.country,
    type: input.type,
    title: input.title,
    content: input.content,
    status: "PUBLISHED",
    createdAt: timestamp,
    updatedAt: timestamp,
    prayerCount: 0,
    prayedByMe: false,
    missionarySaved: false,
    contributionFeedback: null,
    media,
    comments: [],
  };
  await insertPost(post);
  posts.unshift(post);
  missionary.latestPostType = post.type;
  processedOperations.set(input.clientOperationId, post.id);
  const preferences = await getProfilePreferences(missionary.userId);
  const notificationDeliveries = dispatchMissionaryNotification({
    missionaryId: missionary.id,
    postId: post.id,
    recipients: followerNotificationRecipients,
    preferences,
  });
  req.log.info(
    {
      missionaryId: missionary.id,
      recipientCount: notificationDeliveries.length,
    },
    "Queued missionary post notifications",
  );
  res
    .status(201)
    .json(
      CreatePostResponse.parse(
        await toPublicPost(post, getAuthenticatedUser(req)),
      ),
    );
});

router.get("/posts/:postId", async (req, res) => {
  await ensurePostsLoaded();
  const post = posts.find((item) => item.id === req.params["postId"]);
  if (!post) {
    res.status(404).json({ error: "Publicação não encontrada" });
    return;
  }
  const publicPost = await toPublicPost(post, getAuthenticatedUser(req));
  res.json(GetPostResponse.parse(publicPost));
});

router.patch("/posts/:postId", async (req, res) => {
  await ensurePostsLoaded();
  const post = posts.find((item) => item.id === req.params["postId"]);
  if (!post) {
    res.status(404).json({ error: "Publicação não encontrada" });
    return;
  }
  if (!ensurePostOwner(req, res, post)) return;
  const input = UpdatePostBody.parse(req.body);
  if (input.title) post.title = input.title;
  if (input.content) post.content = input.content;
  post.updatedAt = new Date().toISOString();
  await updateStoredPost(post);
  res.json(
    UpdatePostResponse.parse(
      await toPublicPost(post, getAuthenticatedUser(req)),
    ),
  );
});

router.get("/posts/:postId/comments", async (req, res) => {
  await ensurePostsLoaded();
  const post = posts.find((item) => item.id === req.params["postId"]);
  if (!post) {
    res.status(404).json({ error: "Publicação não encontrada" });
    return;
  }
  res.json(ListPostCommentsResponse.parse(post.comments));
});

router.post("/posts/:postId/comments", async (req, res) => {
  await ensurePostsLoaded();
  const post = posts.find((item) => item.id === req.params["postId"]);
  if (!post) {
    res.status(404).json({ error: "Publicação não encontrada" });
    return;
  }
  const supporter = ensureSupporterUser(req, res);
  if (!supporter) return;
  const parsed = CreatePostCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Comentário inválido" });
    return;
  }
  const content = parsed.data.content.trim();
  if (!content) {
    res.status(400).json({ error: "Escreva uma mensagem antes de enviar" });
    return;
  }
  const operationKey = `${supporter.id}:${parsed.data.clientOperationId}`;
  const existingId = processedComments.get(operationKey);
  const existing = existingId
    ? posts.flatMap((item) => item.comments).find((item) => item.id === existingId)
    : post.comments.find(
        (item) => item.clientOperationKey === operationKey,
      );
  if (existing) {
    res.status(201).json(CreatePostCommentResponse.parse(existing));
    return;
  }
  const comment: Comment = {
    id: `comment-${randomUUID()}`,
    postId: post.id,
    authorName: supporter.name,
    content,
    createdAt: new Date().toISOString(),
    clientOperationKey: operationKey,
  };
  post.comments.push(comment);
  await updateStoredPost(post);
  processedComments.set(operationKey, comment.id);
  res.status(201).json(CreatePostCommentResponse.parse(comment));
});

router.post("/posts/:postId/prayers", async (req, res) => {
  await ensurePostsLoaded();
  const post = posts.find((item) => item.id === req.params["postId"]);
  if (!post) {
    res.status(404).json({ error: "Publicação não encontrada" });
    return;
  }
  if (!post.prayedByMe) post.prayerCount += 1;
  post.prayedByMe = true;
  await updateStoredPost(post);
  res.json(
    PrayForPostResponse.parse({
      postId: post.id,
      prayedByMe: true,
      prayerCount: post.prayerCount,
    }),
  );
});

router.delete("/posts/:postId/prayers", async (req, res) => {
  await ensurePostsLoaded();
  const post = posts.find((item) => item.id === req.params["postId"]);
  if (!post) {
    res.status(404).json({ error: "Publicação não encontrada" });
    return;
  }
  if (post.prayedByMe) post.prayerCount = Math.max(0, post.prayerCount - 1);
  post.prayedByMe = false;
  await updateStoredPost(post);
  res.json(
    RemovePrayerResponse.parse({
      postId: post.id,
      prayedByMe: false,
      prayerCount: post.prayerCount,
    }),
  );
});

router.post(
  "/posts/:postId/contribution-availability",
  async (req, res) => {
    await ensurePostsLoaded();
    const post = posts.find((item) => item.id === req.params["postId"]);
    if (!post) {
      res.status(404).json({ error: "Publicação não encontrada" });
      return;
    }
    const supporter = ensureSupporterUser(req, res);
    if (!supporter) return;
    if (post.type !== "NEED") {
      res
        .status(400)
        .json({ error: "Disponibilidade só pode ser registrada em Necessidades" });
      return;
    }

    await db
      .insert(contributionAvailabilitiesTable)
      .values({
        id: `availability-${randomUUID()}`,
        postId: post.id,
        supporterId: supporter.id,
        supporterName: supporter.name,
      })
      .onConflictDoNothing();

    const state = await getContributionAvailabilityState(post, supporter);
    res
      .status(201)
      .json(CreateContributionAvailabilityResponse.parse(state));
  },
);

router.delete(
  "/posts/:postId/contribution-availability",
  async (req, res) => {
    await ensurePostsLoaded();
    const post = posts.find((item) => item.id === req.params["postId"]);
    if (!post) {
      res.status(404).json({ error: "Publicação não encontrada" });
      return;
    }
    const supporter = ensureSupporterUser(req, res);
    if (!supporter) return;
    if (post.type !== "NEED") {
      res
        .status(400)
        .json({ error: "Disponibilidade só pode ser retirada de Necessidades" });
      return;
    }

    await db
      .delete(contributionAvailabilityFeedbackTable)
      .where(
        and(
          eq(contributionAvailabilityFeedbackTable.postId, post.id),
          eq(
            contributionAvailabilityFeedbackTable.supporterId,
            supporter.id,
          ),
        ),
      );

    await db
      .delete(contributionAvailabilitiesTable)
      .where(
        and(
          eq(contributionAvailabilitiesTable.postId, post.id),
          eq(contributionAvailabilitiesTable.supporterId, supporter.id),
        ),
      );

    const state = await getContributionAvailabilityState(post, supporter);
    res.json(RemoveContributionAvailabilityResponse.parse(state));
  },
);

router.post("/sync", async (req, res) => {
  await ensurePostsLoaded();
  const authenticatedMissionary = ensureMissionaryUser(req, res);
  if (!authenticatedMissionary) return;
  const input = SyncOperationsBody.parse(req.body);
  const acks = await Promise.all(input.operations.map(async (operation) => {
    const knownEntity = processedOperations.get(operation.operationId);
    if (knownEntity) {
      const knownPost = posts.find((post) => post.id === knownEntity);
      if (knownPost && knownPost.missionaryId !== authenticatedMissionary.id) {
        return {
          operationId: operation.operationId,
          status: "FAILED" as const,
          entityId: operation.entityId,
          error: "Operação pertence a outro perfil",
        };
      }
      return {
        operationId: operation.operationId,
        status: "SYNCED" as const,
        entityId: knownEntity,
        error: null,
      };
    }

    if (operation.entityType !== "POST") {
      return {
        operationId: operation.operationId,
        status: "FAILED" as const,
        entityId: operation.entityId,
        error: "Tipo de entidade não suportado",
      };
    }

    const payload = operation.payload as {
      missionaryId?: string;
      type?: Post["type"];
      title?: string;
      content?: string;
      media?: Array<{
        clientMediaId: string;
        uri: string;
        thumbnailUri: string;
        mimeType: string;
        sizeBytes: number;
        width: number;
        height: number;
      }>;
    };
    const missionary = authenticatedMissionary;
    if (!payload.type || !payload.title || !payload.content) {
      return {
        operationId: operation.operationId,
        status: "FAILED" as const,
        entityId: operation.entityId,
        error: "Operação inválida",
      };
    }

    let media: PostMedia[];
    try {
      media = normalizePostMedia(payload.media ?? []);
    } catch (error) {
      return {
        operationId: operation.operationId,
        status: "FAILED" as const,
        entityId: operation.entityId,
        error: error instanceof Error ? error.message : "Imagem inválida",
      };
    }
    const timestamp = new Date().toISOString();
    const existing = posts.find((post) => post.id === operation.entityId);
    if (existing) {
      if (existing.missionaryId !== missionary.id) {
        return {
          operationId: operation.operationId,
          status: "FAILED" as const,
          entityId: operation.entityId,
          error: "Publicação pertence a outro perfil",
        };
      }
      existing.title = payload.title;
      existing.content = payload.content;
      existing.status = "PUBLISHED";
      existing.updatedAt = timestamp;
      existing.media = media;
      await updateStoredPost(existing);
    } else {
      const syncedPost: Post = {
        id: operation.entityId,
        clientOperationId: operation.operationId,
        missionaryId: missionary.id,
        missionaryName: missionary.name,
        missionaryCountry: missionary.country,
        type: payload.type,
        title: payload.title,
        content: payload.content,
        status: "PUBLISHED",
        createdAt: timestamp,
        updatedAt: timestamp,
        prayerCount: 0,
        prayedByMe: false,
        missionarySaved: false,
        contributionFeedback: null,
        media,
        comments: [],
      };
      await insertPost(syncedPost);
      posts.unshift(syncedPost);
    }
    processedOperations.set(operation.operationId, operation.entityId);
    return {
      operationId: operation.operationId,
      status: "SYNCED" as const,
      entityId: operation.entityId,
      error: null,
    };
  }));

  res.json(SyncOperationsResponse.parse({ acks }));
});

export default router;