import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

const port = 42000 + (process.pid % 10000);
const baseUrl = `http://127.0.0.1:${port}/api`;

async function waitForServer(server) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`API server exited with code ${server.exitCode}`);
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

function startServer() {
  return spawn(process.execPath, ["dist/index.mjs"], {
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "test",
      SESSION_SECRET:
        process.env.SESSION_SECRET ?? "integration-test-session-secret",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function stopServer(server) {
  if (server.exitCode !== null) return;
  await new Promise((resolve) => {
    server.once("exit", resolve);
    server.kill("SIGTERM");
  });
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

test("a need and its availability survive an API restart", async (t) => {
  let server = startServer();
  t.after(async () => stopServer(server));
  await waitForServer(server);

  const missionaryToken = await login("ana@elo.demo");
  const supporterToken = await login("bruno@elo.demo");
  const missionaryHeaders = {
    authorization: `Bearer ${missionaryToken}`,
    "content-type": "application/json",
  };
  const supporterHeaders = {
    authorization: `Bearer ${supporterToken}`,
    "content-type": "application/json",
  };
  const clientOperationId = `persistence-${process.pid}-${Date.now()}`;

  const created = await jsonRequest("/posts", {
    method: "POST",
    headers: missionaryHeaders,
    body: JSON.stringify({
      missionaryId: "missionary-ana",
      type: "NEED",
      title: "Necessidade persistente",
      content: "Esta necessidade deve continuar disponível após o reinício.",
      clientOperationId,
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.type, "NEED");
  const postId = created.body.id;

  const availability = await jsonRequest(
    `/posts/${postId}/contribution-availability`,
    { method: "POST", headers: supporterHeaders },
  );
  assert.equal(availability.response.status, 201);
  assert.equal(availability.body.postId, postId);
  assert.equal(availability.body.availabilityCount, 1);

  const follow = await jsonRequest("/missionaries/missionary-ana/follow", {
    method: "POST",
    headers: supporterHeaders,
  });
  assert.equal(follow.response.status, 200);
  assert.equal(follow.body.isFollowed, true);

  const commentPayload = {
    content: "Vou acompanhar esta necessidade em oração.",
    clientOperationId: `${clientOperationId}-comment`,
  };
  const createdComment = await jsonRequest(`/posts/${postId}/comments`, {
    method: "POST",
    headers: supporterHeaders,
    body: JSON.stringify(commentPayload),
  });
  assert.equal(createdComment.response.status, 201);

  await stopServer(server);
  server = startServer();
  await waitForServer(server);

  const restoredPost = await jsonRequest(`/posts/${postId}`, {
    headers: supporterHeaders,
  });
  assert.equal(restoredPost.response.status, 200);
  assert.equal(restoredPost.body.id, postId);
  assert.equal(restoredPost.body.title, "Necessidade persistente");
  assert.equal(restoredPost.body.type, "NEED");
  assert.equal(restoredPost.body.missionarySaved, true);
  assert.equal(restoredPost.body.contributionAvailabilityCount, 1);
  assert.equal(restoredPost.body.contributionAvailableByMe, true);

  const restoredMissionaries = await jsonRequest("/missionaries", {
    headers: supporterHeaders,
  });
  assert.equal(restoredMissionaries.response.status, 200);
  assert.equal(
    restoredMissionaries.body.find((item) => item.id === "missionary-ana")
      .isFollowed,
    true,
  );

  const retriedComment = await jsonRequest(`/posts/${postId}/comments`, {
    method: "POST",
    headers: supporterHeaders,
    body: JSON.stringify(commentPayload),
  });
  assert.equal(retriedComment.response.status, 201);
  assert.equal(retriedComment.body.id, createdComment.body.id);

  const restoredComments = await jsonRequest(`/posts/${postId}/comments`);
  assert.equal(
    restoredComments.body.filter((item) => item.id === createdComment.body.id)
      .length,
    1,
  );

  const restoredAvailabilities = await jsonRequest(
    "/missionaries/missionary-ana/contribution-availabilities",
    { headers: missionaryHeaders },
  );
  assert.equal(restoredAvailabilities.response.status, 200);
  assert.deepEqual(
    restoredAvailabilities.body
      .filter((item) => item.postId === postId)
      .map((item) => item.supporterName),
    ["Bruno"],
  );

  const unfollow = await jsonRequest("/missionaries/missionary-ana/follow", {
    method: "DELETE",
    headers: supporterHeaders,
  });
  assert.equal(unfollow.response.status, 200);
  assert.equal(unfollow.body.isFollowed, false);

  await stopServer(server);
  server = startServer();
  await waitForServer(server);

  const afterUnfollow = await jsonRequest(`/posts/${postId}`, {
    headers: supporterHeaders,
  });
  assert.equal(afterUnfollow.response.status, 200);
  assert.equal(afterUnfollow.body.missionarySaved, false);

  const missionariesAfterUnfollow = await jsonRequest("/missionaries", {
    headers: supporterHeaders,
  });
  assert.equal(missionariesAfterUnfollow.response.status, 200);
  assert.equal(
    missionariesAfterUnfollow.body.find((item) => item.id === "missionary-ana")
      .isFollowed,
    false,
  );
});
