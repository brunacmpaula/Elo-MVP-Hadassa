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
        type: "UPDATE",
        title: "Publicação do perfil autenticado",
        content: "O payload não pode trocar a identidade da missão",
        clientOperationId: "privacy-test-owner-create",
      }),
    });
    assert.equal(ownerCreate.response.status, 201);
    assert.equal(ownerCreate.body.missionaryId, "missionary-ana");

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