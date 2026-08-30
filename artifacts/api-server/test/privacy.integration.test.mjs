import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import {
  dispatchMissionaryNotification,
  getQueuedNotificationDeliveries,
} from "../dist/notifications.mjs";

const port = 41000 + (process.pid % 10000);
const baseUrl = `http://127.0.0.1:${port}/api`;

async function waitForServer(process) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (process.exitCode !== null) {
      throw new Error(`API server exited with code ${process.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return;
    } catch {
      // The child process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for the API server");
}

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { response, body };
}

async function login(email) {
  const { response, body } = await jsonRequest("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "demo" }),
  });
  assert.equal(response.status, 200);
  return body.token;
}

test("women-only notifications are queued only for female recipients", () => {
  const before = getQueuedNotificationDeliveries().length;
  const deliveries = dispatchMissionaryNotification({
    missionaryId: "missionary-ana",
    postId: "notification-policy-test",
    recipients: [
      { id: "female-supporter", gender: "FEMALE" },
      { id: "male-supporter", gender: "MALE" },
    ],
    preferences: { womenOnlyNotifications: true },
  });

  assert.deepEqual(
    deliveries.map((delivery) => delivery.recipientId),
    ["female-supporter"],
  );
  assert.equal(getQueuedNotificationDeliveries().length, before + 1);
});

test("preferences persist and redact public profile data", async (t) => {
  const server = spawn(process.execPath, ["dist/index.mjs"], {
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "test",
      SESSION_SECRET:
        process.env.SESSION_SECRET ?? "integration-test-session-secret",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => server.kill("SIGTERM"));
  await waitForServer(server);

  const arbitraryLogin = await jsonRequest("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "ana+attacker@example.com", password: "demo" }),
  });
  assert.equal(arbitraryLogin.response.status, 401);

  const wrongPassword = await jsonRequest("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "ana@elo.demo", password: "incorrect" }),
  });
  assert.equal(wrongPassword.response.status, 401);

  const missionaryToken = await login("ana@elo.demo");
  const secondMissionaryToken = await login("ana@elo.demo");
  assert.notEqual(missionaryToken, secondMissionaryToken);
  const otherMissionaryToken = await login("joao@elo.demo");
  const supporterToken = await login("marina@elo.demo");
    const secondSupporterToken = await login("bruno@elo.demo");
  const missionaryHeaders = {
    authorization: `Bearer ${missionaryToken}`,
    "content-type": "application/json",
  };
  const supporterHeaders = {
    authorization: `Bearer ${supporterToken}`,
    "content-type": "application/json",
  };

  const forgedToken = `${missionaryToken.slice(0, -1)}${
    missionaryToken.endsWith("a") ? "b" : "a"
  }`;
  const forgedRead = await jsonRequest(
    "/missionaries/missionary-ana/preferences",
    { headers: { authorization: `Bearer ${forgedToken}` } },
  );
  assert.equal(forgedRead.response.status, 401);

  const forgedMutation = await jsonRequest(
    "/missionaries/missionary-ana/preferences",
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${forgedToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        hiddenFields: [],
        womenOnlyNotifications: false,
      }),
    },
  );
  assert.equal(forgedMutation.response.status, 401);

  const otherMissionaryRead = await jsonRequest(
    "/missionaries/missionary-ana/preferences",
    { headers: { authorization: `Bearer ${otherMissionaryToken}` } },
  );
  assert.equal(otherMissionaryRead.response.status, 403);

  const original = await jsonRequest(
    "/missionaries/missionary-ana/preferences",
    { headers: missionaryHeaders },
  );
  assert.equal(original.response.status, 200);

  try {
    const visiblePreferences = {
      hiddenFields: [],
      womenOnlyNotifications: false,
    };
    const secondSupporterHeaders = {
      authorization: `Bearer ${secondSupporterToken}`,
      "content-type": "application/json",
    };
    const madeVisible = await jsonRequest(
      "/missionaries/missionary-ana/preferences",
      {
        method: "PATCH",
        headers: missionaryHeaders,
        body: JSON.stringify(visiblePreferences),
      },
    );
    assert.equal(madeVisible.response.status, 200);

    const supporterCachedProfile = await jsonRequest(
      "/missionaries/missionary-ana",
      { headers: supporterHeaders },
    );
    assert.equal(supporterCachedProfile.body.email, "ana@elo.demo");
    assert.equal(supporterCachedProfile.body.country, "Moçambique");
    assert.equal(typeof supporterCachedProfile.body.bio, "string");

    const updatedPreferences = {
      hiddenFields: ["email", "location", "bio"],
      womenOnlyNotifications: true,
    };
    const updated = await jsonRequest(
      "/missionaries/missionary-ana/preferences",
      {
        method: "PATCH",
        headers: missionaryHeaders,
        body: JSON.stringify(updatedPreferences),
      },
    );
    assert.equal(updated.response.status, 200);
    assert.deepEqual(updated.body, updatedPreferences);

    const secondDevice = await jsonRequest(
      "/missionaries/missionary-ana/preferences",
      { headers: missionaryHeaders },
    );
    assert.deepEqual(secondDevice.body, updatedPreferences);

    const publicProfile = await jsonRequest(
      "/missionaries/missionary-ana",
      { headers: supporterHeaders },
    );
    assert.equal(publicProfile.response.status, 200);
    assert.equal("email" in publicProfile.body, false);
    assert.equal("country" in publicProfile.body, false);
    assert.equal("bio" in publicProfile.body, false);
    assert.equal(
      publicProfile.body.posts.some(
        (post) => "missionaryCountry" in post,
      ),
      false,
    );

    const ownerProfile = await jsonRequest(
      "/missionaries/missionary-ana",
      { headers: missionaryHeaders },
    );
    assert.equal(ownerProfile.body.email, "ana@elo.demo");
    assert.equal(ownerProfile.body.country, "Moçambique");
    assert.equal(typeof ownerProfile.body.bio, "string");

    const unauthenticatedCreate = await jsonRequest("/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        missionaryId: "missionary-ana",
        type: "UPDATE",
        title: "Tentativa sem autenticação",
        content: "Não deve ser criada",
        clientOperationId: "privacy-test-unauthenticated",
      }),
    });
    assert.equal(unauthenticatedCreate.response.status, 401);
    assert.equal(
      "missionaryCountry" in unauthenticatedCreate.body,
      false,
    );

    const crossProfileCreate = await jsonRequest("/posts", {
      method: "POST",
      headers: supporterHeaders,
      body: JSON.stringify({
        missionaryId: "missionary-ana",
        type: "UPDATE",
        title: "Tentativa de outro perfil",
        content: "Não deve ser criada",
        clientOperationId: "privacy-test-cross-profile",
      }),
    });
    assert.equal(crossProfileCreate.response.status, 403);
    assert.equal("missionaryCountry" in crossProfileCreate.body, false);

    const ownerCreate = await jsonRequest("/posts", {
      method: "POST",
      headers: missionaryHeaders,
      body: JSON.stringify({
        missionaryId: "missionary-joao",
        type: "NEED",
        title: "Necessidade do perfil autenticado",
        content: "Esta necessidade deve aparecer no feed do apoiador",
        clientOperationId: "privacy-test-owner-create",
      }),
    });
    assert.equal(ownerCreate.response.status, 201);
    assert.equal(ownerCreate.body.missionaryId, "missionary-ana");
    assert.deepEqual(
      ownerCreate.body.media,
      [],
      "a publication saved without images must return an empty media payload",
    );
    const ownerFeed = await jsonRequest("/posts?mine=true", {
      headers: missionaryHeaders,
    });
    const supporterFeed = await jsonRequest("/posts", {
      headers: supporterHeaders,
    });
    const otherMissionaryFeed = await jsonRequest("/posts?mine=true", {
      headers: {
        authorization: `Bearer ${otherMissionaryToken}`,
      },
    });
    assert.equal(
      ownerFeed.body.some((post) => post.id === ownerCreate.body.id),
      true,
    );
    assert.equal(
      supporterFeed.body.some((post) => post.id === ownerCreate.body.id),
      true,
    );
    assert.equal(
      supporterFeed.body.find((post) => post.id === ownerCreate.body.id)?.type,
      "NEED",
    );
    assert.equal(
      otherMissionaryFeed.body.some((post) => post.id === ownerCreate.body.id),
      false,
    );

    const saveMissionary = await jsonRequest(
      "/missionaries/missionary-lucia/follow",
      { method: "POST", headers: supporterHeaders },
    );
    assert.equal(saveMissionary.response.status, 200);
    const marinaMissionaries = await jsonRequest("/missionaries", {
      headers: supporterHeaders,
    });
    const brunoMissionaries = await jsonRequest("/missionaries", {
      headers: secondSupporterHeaders,
    });
    assert.equal(
      marinaMissionaries.body.find((item) => item.id === "missionary-lucia")
        .isFollowed,
      true,
    );
    assert.equal(
      brunoMissionaries.body.find((item) => item.id === "missionary-lucia")
        .isFollowed,
      false,
    );

    const missionaryComment = await jsonRequest(
      "/posts/post-school/comments",
      {
        method: "POST",
        headers: missionaryHeaders,
        body: JSON.stringify({
          content: "Tentativa indevida",
          clientOperationId: "comment-role-test",
        }),
      },
    );
    assert.equal(missionaryComment.response.status, 403);
    const commentPayload = {
      content: "Estamos juntos nesta missão.",
      clientOperationId: "supporter-comment-idempotency",
    };
    const firstComment = await jsonRequest("/posts/post-school/comments", {
      method: "POST",
      headers: supporterHeaders,
      body: JSON.stringify(commentPayload),
    });
    const duplicateComment = await jsonRequest("/posts/post-school/comments", {
      method: "POST",
      headers: supporterHeaders,
      body: JSON.stringify(commentPayload),
    });
    assert.equal(firstComment.response.status, 201);
    assert.equal(duplicateComment.body.id, firstComment.body.id);
    const comments = await jsonRequest("/posts/post-school/comments");
    assert.equal(
      comments.body.filter((item) => item.id === firstComment.body.id).length,
      1,
    );

    await jsonRequest(
      "/posts/post-community-kits/contribution-availability",
      { method: "DELETE", headers: supporterHeaders },
    );
    await jsonRequest(
      "/posts/post-community-kits/contribution-availability",
      { method: "DELETE", headers: secondSupporterHeaders },
    );

    const nonNeedAvailability = await jsonRequest(
      "/posts/post-school/contribution-availability",
      { method: "POST", headers: supporterHeaders },
    );
    assert.equal(nonNeedAvailability.response.status, 400);

    const missionaryAvailability = await jsonRequest(
      "/posts/post-community-kits/contribution-availability",
      { method: "POST", headers: missionaryHeaders },
    );
    assert.equal(missionaryAvailability.response.status, 403);

    const firstAvailability = await jsonRequest(
      "/posts/post-community-kits/contribution-availability",
      { method: "POST", headers: supporterHeaders },
    );
    const duplicateAvailability = await jsonRequest(
      "/posts/post-community-kits/contribution-availability",
      { method: "POST", headers: supporterHeaders },
    );
    assert.equal(firstAvailability.response.status, 201);
    assert.deepEqual(firstAvailability.body, {
      postId: "post-community-kits",
      availableByMe: true,
      availabilityCount: 1,
    });
    assert.equal(duplicateAvailability.body.availabilityCount, 1);

    const secondAvailability = await jsonRequest(
      "/posts/post-community-kits/contribution-availability",
      { method: "POST", headers: secondSupporterHeaders },
    );
    assert.equal(secondAvailability.body.availabilityCount, 2);

    const supporterAvailabilityList = await jsonRequest(
      "/missionaries/missionary-ana/contribution-availabilities",
      { headers: supporterHeaders },
    );
    assert.equal(supporterAvailabilityList.response.status, 403);
    const otherMissionaryAvailabilityList = await jsonRequest(
      "/missionaries/missionary-ana/contribution-availabilities",
      { headers: { authorization: `Bearer ${otherMissionaryToken}` } },
    );
    assert.equal(otherMissionaryAvailabilityList.response.status, 403);

    const ownerAvailabilityList = await jsonRequest(
      "/missionaries/missionary-ana/contribution-availabilities",
      { headers: missionaryHeaders },
    );
    assert.equal(ownerAvailabilityList.response.status, 200);
    assert.deepEqual(
      ownerAvailabilityList.body
        .filter((item) => item.postId === "post-community-kits")
        .map((item) => item.supporterName)
        .sort(),
      ["Bruno", "Marina"],
    );

    const removedAvailability = await jsonRequest(
      "/posts/post-community-kits/contribution-availability",
      { method: "DELETE", headers: supporterHeaders },
    );
    assert.deepEqual(removedAvailability.body, {
      postId: "post-community-kits",
      availableByMe: false,
      availabilityCount: 1,
    });
    const supporterNeed = await jsonRequest("/posts/post-community-kits", {
      headers: supporterHeaders,
    });
    assert.equal(supporterNeed.body.contributionAvailableByMe, false);
    assert.equal(supporterNeed.body.contributionAvailabilityCount, 1);

    await jsonRequest(
      "/posts/post-community-kits/contribution-availability",
      { method: "DELETE", headers: secondSupporterHeaders },
    );

    const mediaPayload = {
      clientMediaId: "privacy-media-1",
      uri: "data:image/jpeg;base64,aGVsbG8=",
      thumbnailUri: "data:image/jpeg;base64,aGVsbG8=",
      mimeType: "image/jpeg",
      sizeBytes: 5,
      width: 20,
      height: 20,
    };
    const mediaPostInput = {
      missionaryId: "missionary-joao",
      type: "UPDATE",
      title: "Publicação com imagem",
      content: "Imagem preparada no dispositivo.",
      clientOperationId: "media-post-idempotency",
      media: [mediaPayload],
    };
    const firstMediaPost = await jsonRequest("/posts", {
      method: "POST",
      headers: missionaryHeaders,
      body: JSON.stringify(mediaPostInput),
    });
    const duplicateMediaPost = await jsonRequest("/posts", {
      method: "POST",
      headers: missionaryHeaders,
      body: JSON.stringify(mediaPostInput),
    });
    assert.equal(firstMediaPost.response.status, 201);
    assert.deepEqual(firstMediaPost.body.media, [
      {
        ...mediaPayload,
        id: "media-privacy-media-1",
      },
    ]);
    assert.equal(duplicateMediaPost.body.id, firstMediaPost.body.id);
    const invalidMediaPost = await jsonRequest("/posts", {
      method: "POST",
      headers: missionaryHeaders,
      body: JSON.stringify({
        ...mediaPostInput,
        clientOperationId: "invalid-media-size",
        media: [{ ...mediaPayload, sizeBytes: 6 }],
      }),
    });
    assert.equal(invalidMediaPost.response.status, 400);
    const needWithMedia = await jsonRequest("/posts", {
      method: "POST",
      headers: missionaryHeaders,
      body: JSON.stringify({
        ...mediaPostInput,
        type: "NEED",
        clientOperationId: "invalid-need-media",
      }),
    });
    assert.equal(needWithMedia.response.status, 400);
    assert.equal(
      needWithMedia.body.error,
      "Apenas atualizações podem conter imagens",
    );

    const unauthenticatedUpdate = await jsonRequest("/posts/post-school", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Alteração indevida" }),
    });
    assert.equal(unauthenticatedUpdate.response.status, 401);
    assert.equal("missionaryCountry" in unauthenticatedUpdate.body, false);

    const crossProfileUpdate = await jsonRequest("/posts/post-school", {
      method: "PATCH",
      headers: missionaryHeaders,
      body: JSON.stringify({ title: "Alteração indevida" }),
    });
    assert.equal(crossProfileUpdate.response.status, 403);
    assert.equal("missionaryCountry" in crossProfileUpdate.body, false);

    const unauthenticatedSync = await jsonRequest("/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operations: [] }),
    });
    assert.equal(unauthenticatedSync.response.status, 401);

    const supporterSync = await jsonRequest("/sync", {
      method: "POST",
      headers: supporterHeaders,
      body: JSON.stringify({ operations: [] }),
    });
    assert.equal(supporterSync.response.status, 403);

    const ownerSync = await jsonRequest("/sync", {
      method: "POST",
      headers: missionaryHeaders,
      body: JSON.stringify({
        operations: [
          {
            operationId: "privacy-test-owner-sync",
            entityType: "POST",
            entityId: "privacy-test-synced-post",
            operationType: "CREATE",
            payload: {
              missionaryId: "missionary-joao",
              type: "UPDATE",
              title: "Sincronizada pelo perfil autenticado",
              content: "A identidade vem do token",
            },
          },
        ],
      }),
    });
    assert.equal(ownerSync.response.status, 200);
    assert.equal(ownerSync.body.acks[0].status, "SYNCED");
    const invalidNeedSync = await jsonRequest("/sync", {
      method: "POST",
      headers: missionaryHeaders,
      body: JSON.stringify({
        operations: [
          {
            operationId: "invalid-need-media-sync",
            entityType: "POST",
            entityId: "invalid-need-media-sync-post",
            operationType: "CREATE",
            payload: {
              type: "NEED",
              title: "Necessidade sem imagem",
              content: "Imagens não são aceitas em necessidades.",
              media: [mediaPayload],
            },
          },
        ],
      }),
    });
    assert.equal(invalidNeedSync.response.status, 200);
    assert.equal(invalidNeedSync.body.acks[0].status, "FAILED");
    assert.equal(
      invalidNeedSync.body.acks[0].error,
      "Apenas atualizações podem conter imagens",
    );

    const syncedPublicPost = await jsonRequest(
      "/posts/privacy-test-synced-post",
      { headers: supporterHeaders },
    );
    assert.equal(syncedPublicPost.body.missionaryId, "missionary-ana");
    assert.equal("missionaryCountry" in syncedPublicPost.body, false);

    const forbidden = await jsonRequest(
      "/missionaries/missionary-ana/preferences",
      {
        method: "PATCH",
        headers: supporterHeaders,
        body: JSON.stringify({
          hiddenFields: [],
          womenOnlyNotifications: false,
        }),
      },
    );
    assert.equal(forbidden.response.status, 403);

    const invalid = await jsonRequest(
      "/missionaries/missionary-ana/preferences",
      {
        method: "PATCH",
        headers: missionaryHeaders,
        body: JSON.stringify({
          hiddenFields: ["bio", "bio"],
          womenOnlyNotifications: false,
        }),
      },
    );
    assert.equal(invalid.response.status, 400);
  } finally {
    await jsonRequest("/missionaries/missionary-ana/preferences", {
      method: "PATCH",
      headers: missionaryHeaders,
      body: JSON.stringify(original.body),
    });
  }
});