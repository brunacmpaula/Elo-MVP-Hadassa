import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";
import {
  CreatePostBody,
  CreatePostResponse,
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
  SyncOperationsBody,
  SyncOperationsResponse,
  UnfollowMissionaryResponse,
  UpdateMissionaryPreferencesBody,
  UpdateMissionaryPreferencesResponse,
  UpdatePostBody,
  UpdatePostResponse,
} from "@workspace/api-zod";
import { db, profilePreferencesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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
const posts: Post[] = [
  {
    id: "post-prayer-team",
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
  },
  {
    id: "post-school",
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
  },
];

const processedOperations = new Map<string, string>();
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
]);
const sessionUsersById = new Map(
  Array.from(demoCredentialsByEmail.values(), ({ user }) => [user.id, user]),
);
const followerNotificationRecipients = [
  { id: "user-supporter", gender: "MALE" as const },
  { id: "user-supporter-female", gender: "FEMALE" as const },
];

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
    ...(isOwner || !preferences.hiddenFields.includes("email") ? { email } : {}),
    ...(isOwner || !preferences.hiddenFields.includes("bio") ? { bio } : {}),
    ...(isOwner || !preferences.hiddenFields.includes("location")
      ? { country }
      : {}),
  };
}

async function toPublicPost(post: Post, viewer: SessionUser | null) {
  const missionary = findMissionary(post.missionaryId);
  if (!missionary) return post;
  const preferences = await getProfilePreferences(missionary.userId);
  if (
    viewer?.id === missionary.userId ||
    !preferences.hiddenFields.includes("location")
  ) {
    return post;
  }
  const { missionaryCountry: _hiddenCountry, ...publicPost } = post;
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
  const viewer = getAuthenticatedUser(req);
  const publicMissionaries = await Promise.all(
    missionaries.map((missionary) => toPublicMissionary(missionary, viewer)),
  );
  res.json(ListMissionariesResponse.parse(publicMissionaries));
});

router.get("/missionaries/:missionaryId", async (req, res) => {
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
  missionary.isFollowed = true;
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
  missionary.isFollowed = false;
  res.json(
    UnfollowMissionaryResponse.parse({
      missionaryId: missionary.id,
      isFollowed: false,
    }),
  );
});

router.get("/posts", async (req, res) => {
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
  const authenticatedMissionary = ensureMissionaryUser(req, res);
  if (!authenticatedMissionary) return;
  const input = CreatePostBody.parse(req.body);
  const existingId = processedOperations.get(input.clientOperationId);
  const existing = existingId
    ? posts.find((post) => post.id === existingId)
    : undefined;
  if (existing) {
    if (existing.missionaryId !== authenticatedMissionary.id) {
      res.status(403).json({ error: "Operação pertence a outro perfil" });
      return;
    }
    res.status(201).json(CreatePostResponse.parse(existing));
    return;
  }

  const missionary = authenticatedMissionary;

  const timestamp = new Date().toISOString();
  const post: Post = {
    id: `post-${Date.now()}`,
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
  };
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
  res.status(201).json(CreatePostResponse.parse(post));
});

router.get("/posts/:postId", async (req, res) => {
  const post = posts.find((item) => item.id === req.params["postId"]);
  if (!post) {
    res.status(404).json({ error: "Publicação não encontrada" });
    return;
  }
  const publicPost = await toPublicPost(post, getAuthenticatedUser(req));
  res.json(GetPostResponse.parse(publicPost));
});

router.patch("/posts/:postId", (req, res) => {
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
  res.json(UpdatePostResponse.parse(post));
});

router.post("/posts/:postId/prayers", (req, res) => {
  const post = posts.find((item) => item.id === req.params["postId"]);
  if (!post) {
    res.status(404).json({ error: "Publicação não encontrada" });
    return;
  }
  if (!post.prayedByMe) post.prayerCount += 1;
  post.prayedByMe = true;
  res.json(
    PrayForPostResponse.parse({
      postId: post.id,
      prayedByMe: true,
      prayerCount: post.prayerCount,
    }),
  );
});

router.delete("/posts/:postId/prayers", (req, res) => {
  const post = posts.find((item) => item.id === req.params["postId"]);
  if (!post) {
    res.status(404).json({ error: "Publicação não encontrada" });
    return;
  }
  if (post.prayedByMe) post.prayerCount = Math.max(0, post.prayerCount - 1);
  post.prayedByMe = false;
  res.json(
    RemovePrayerResponse.parse({
      postId: post.id,
      prayedByMe: false,
      prayerCount: post.prayerCount,
    }),
  );
});

router.post("/sync", (req, res) => {
  const authenticatedMissionary = ensureMissionaryUser(req, res);
  if (!authenticatedMissionary) return;
  const input = SyncOperationsBody.parse(req.body);
  const acks = input.operations.map((operation) => {
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
    } else {
      posts.unshift({
        id: operation.entityId,
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
      });
    }
    processedOperations.set(operation.operationId, operation.entityId);
    return {
      operationId: operation.operationId,
      status: "SYNCED" as const,
      entityId: operation.entityId,
      error: null,
    };
  });

  res.json(SyncOperationsResponse.parse({ acks }));
});

export default router;