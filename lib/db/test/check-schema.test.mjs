import assert from "node:assert/strict";
import test from "node:test";
import { findSchemaIssues, formatSchemaFailure } from "../src/check-schema.ts";
import { profilePreferencesDatabaseSchema } from "../src/schema/profilePreferences.ts";

const validColumns = [
  {
    column_name: "user_id",
    udt_name: "text",
    is_nullable: "NO",
    column_default: null,
  },
  {
    column_name: "hidden_fields",
    udt_name: "_text",
    is_nullable: "NO",
    column_default: "'{}'::text[]",
  },
  {
    column_name: "women_only_notifications",
    udt_name: "bool",
    is_nullable: "NO",
    column_default: "false",
  },
];

function createSchemaClient(primaryKeyColumns = ["user_id"]) {
  const queries = [];
  return {
    queries,
    client: {
      async query(text) {
        queries.push(text);

        if (text.includes("information_schema.tables")) {
          return { rows: [{ table_name: "profile_preferences" }] };
        }
        if (text.includes("information_schema.columns")) {
          return { rows: validColumns };
        }

        return {
          rows: primaryKeyColumns.map((column_name) => ({ column_name })),
        };
      },
    },
  };
}

test("reports a missing profile preferences table using read-only SQL", async () => {
  const queries = [];
  const client = {
    async query(text) {
      queries.push(text);
      return { rows: [] };
    },
  };

  const issues = await findSchemaIssues(client, [profilePreferencesDatabaseSchema]);

  assert.deepEqual(issues, ["missing table public.profile_preferences"]);
  assert.equal(queries.length, 1);
  assert.ok(queries.every((query) => /^\s*SELECT\b/i.test(query)));
  assert.match(
    formatSchemaFailure(issues),
    /pnpm --filter @workspace\/db run push/,
  );
});

test("accepts the profile preferences table defined by the Drizzle schema", async () => {
  const { client, queries } = createSchemaClient();

  assert.deepEqual(
    await findSchemaIssues(client, [profilePreferencesDatabaseSchema]),
    [],
  );
  assert.ok(queries.every((query) => /^\s*SELECT\b/i.test(query)));
});

test("rejects a composite primary key that breaks the user id conflict target", async () => {
  const { client } = createSchemaClient(["user_id", "hidden_fields"]);

  assert.deepEqual(await findSchemaIssues(client, [profilePreferencesDatabaseSchema]), [
    "table profile_preferences has primary key (user_id, hidden_fields), expected (user_id)",
  ]);
});
