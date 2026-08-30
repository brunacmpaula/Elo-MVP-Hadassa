import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import test from "node:test";

const { Client } = pg;
const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const seedId = "demo-missionary-follows-v1";

async function withDatabase(callback) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function runPush() {
  execFileSync("pnpm", ["--filter", "@workspace/db", "run", "push"], {
    cwd: workspaceRoot,
    env: process.env,
    stdio: "pipe",
  });
}

test("database push seeds legacy follows once and respects later unfollows", async () => {
  const original = await withDatabase(async (client) => {
    const follows = await client.query(
      `
        SELECT supporter_id, missionary_id
        FROM missionary_follows
        WHERE supporter_id = $1
          AND missionary_id IN ($2, $3)
        ORDER BY missionary_id
      `,
      ["user-supporter", "missionary-ana", "missionary-joao"],
    );
    const seedState = await client.query(
      `
        SELECT id
        FROM missionary_follow_seed_state
        WHERE id = $1
      `,
      [seedId],
    );

    await client.query(
      `
        DELETE FROM missionary_follows
        WHERE supporter_id = $1
          AND missionary_id IN ($2, $3)
      `,
      ["user-supporter", "missionary-ana", "missionary-joao"],
    );
    await client.query(
      "DELETE FROM missionary_follow_seed_state WHERE id = $1",
      [seedId],
    );

    return {
      follows: follows.rows,
      hasSeedState: seedState.rowCount > 0,
    };
  });

  try {
    await runPush();

    const seededFollows = await withDatabase(async (client) => {
      const result = await client.query(
        `
          SELECT supporter_id, missionary_id
          FROM missionary_follows
          WHERE supporter_id = $1
            AND missionary_id IN ($2, $3)
          ORDER BY missionary_id
        `,
        ["user-supporter", "missionary-ana", "missionary-joao"],
      );
      return result.rows;
    });
    assert.deepEqual(seededFollows, [
      { supporter_id: "user-supporter", missionary_id: "missionary-ana" },
      { supporter_id: "user-supporter", missionary_id: "missionary-joao" },
    ]);

    await withDatabase(async (client) => {
      await client.query(
        `
          DELETE FROM missionary_follows
          WHERE supporter_id = $1
            AND missionary_id = $2
        `,
        ["user-supporter", "missionary-ana"],
      );
    });
    await runPush();

    const afterSecondPush = await withDatabase(async (client) => {
      const result = await client.query(
        `
          SELECT missionary_id
          FROM missionary_follows
          WHERE supporter_id = $1
            AND missionary_id IN ($2, $3)
          ORDER BY missionary_id
        `,
        ["user-supporter", "missionary-ana", "missionary-joao"],
      );
      return result.rows.map((row) => row.missionary_id);
    });
    assert.deepEqual(afterSecondPush, ["missionary-joao"]);
  } finally {
    await withDatabase(async (client) => {
      await client.query(
        `
          DELETE FROM missionary_follows
          WHERE supporter_id = $1
            AND missionary_id IN ($2, $3)
        `,
        ["user-supporter", "missionary-ana", "missionary-joao"],
      );
      if (original.follows.length > 0) {
        for (const follow of original.follows) {
          await client.query(
            `
              INSERT INTO missionary_follows (supporter_id, missionary_id)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING
            `,
            [follow.supporter_id, follow.missionary_id],
          );
        }
      }
      if (original.hasSeedState) {
        await client.query(
          `
            INSERT INTO missionary_follow_seed_state (id)
            VALUES ($1)
            ON CONFLICT DO NOTHING
          `,
          [seedId],
        );
      } else {
        await client.query(
          "DELETE FROM missionary_follow_seed_state WHERE id = $1",
          [seedId],
        );
      }
    });
  }
});
