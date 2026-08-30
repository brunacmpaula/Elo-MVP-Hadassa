import { Router, type IRouter } from "express";
import {
  CreatePostBody,
  CreatePostResponse,
  FollowMissionaryResponse,
  GetMissionaryResponse,
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
  UpdatePostBody,
  UpdatePostResponse,
} from "@workspace/api-zod";

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

function findMissionary(id: string) {
  return missionaries.find((missionary) => missionary.id === id);
}

router.post("/auth/login", (req, res) => {
  const input = LoginBody.parse(req.body);
  const missionary = input.email.toLowerCase().includes("ana");
  res.json(
    LoginResponse.parse({
      user: missionary
        ? {
            id: "user-ana",
            name: "Ana Silva",
            email: input.email,
            role: "MISSIONARY",
          }
        : {
            id: "user-supporter",
            name: "Marina",
            email: input.email,
            role: "SUPPORTER",
          },
      token: missionary ? "demo-missionary" : "demo-supporter",
    }),
  );
});

router.get("/missionaries", (_req, res) => {
  res.json(ListMissionariesResponse.parse(missionaries));
});

router.get("/missionaries/:missionaryId", (req, res) => {
  const missionary = findMissionary(req.params["missionaryId"] ?? "");
  if (!missionary) {
    res.status(404).json({ error: "Missionário não encontrado" });
    return;
  }
  res.json(
    GetMissionaryResponse.parse({
      ...missionary,
      posts: posts.filter((post) => post.missionaryId === missionary.id),
    }),
  );
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

router.get("/posts", (req, res) => {
  const query = ListPostsQueryParams.parse(req.query);
  const filtered = query.missionaryId
    ? posts.filter((post) => post.missionaryId === query.missionaryId)
    : posts;
  res.json(ListPostsResponse.parse(filtered));
});

router.post("/posts", (req, res) => {
  const input = CreatePostBody.parse(req.body);
  const existingId = processedOperations.get(input.clientOperationId);
  const existing = existingId
    ? posts.find((post) => post.id === existingId)
    : undefined;
  if (existing) {
    res.status(201).json(CreatePostResponse.parse(existing));
    return;
  }

  const missionary = findMissionary(input.missionaryId);
  if (!missionary) {
    res.status(404).json({ error: "Missionário não encontrado" });
    return;
  }

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
  res.status(201).json(CreatePostResponse.parse(post));
});

router.get("/posts/:postId", (req, res) => {
  const post = posts.find((item) => item.id === req.params["postId"]);
  if (!post) {
    res.status(404).json({ error: "Publicação não encontrada" });
    return;
  }
  res.json(GetPostResponse.parse(post));
});

router.patch("/posts/:postId", (req, res) => {
  const input = UpdatePostBody.parse(req.body);
  const post = posts.find((item) => item.id === req.params["postId"]);
  if (!post) {
    res.status(404).json({ error: "Publicação não encontrada" });
    return;
  }
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
  const input = SyncOperationsBody.parse(req.body);
  const acks = input.operations.map((operation) => {
    const knownEntity = processedOperations.get(operation.operationId);
    if (knownEntity) {
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
    const missionary = findMissionary(payload.missionaryId ?? "");
    if (!missionary || !payload.type || !payload.title || !payload.content) {
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