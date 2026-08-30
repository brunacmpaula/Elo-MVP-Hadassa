import pg from "pg";

const DEMO_FOLLOWS_SEED_ID = "demo-missionary-follows-v1";
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query("BEGIN");

  const existingSeed = await pool.query(
    `
      SELECT 1
      FROM missionary_follow_seed_state
      WHERE id = $1
      LIMIT 1
    `,
    [DEMO_FOLLOWS_SEED_ID],
  );

  if (existingSeed.rowCount === 0) {
    await pool.query(
      `
        INSERT INTO missionary_follows (supporter_id, missionary_id)
        VALUES ($1, $2), ($1, $3)
        ON CONFLICT DO NOTHING
      `,
      ["user-supporter", "missionary-ana", "missionary-joao"],
    );
    await pool.query(
      `
        INSERT INTO missionary_follow_seed_state (id)
        VALUES ($1)
        ON CONFLICT DO NOTHING
      `,
      [DEMO_FOLLOWS_SEED_ID],
    );
  }

  await pool.query("COMMIT");
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
