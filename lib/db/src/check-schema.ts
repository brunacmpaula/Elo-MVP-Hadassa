import { pathToFileURL } from "node:url";
import pg from "pg";
import { profilePreferencesDatabaseSchema } from "./schema/profilePreferences.ts";

type Queryable = {
  query: <Row extends Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ) => Promise<{ rows: Row[] }>;
};

type DatabaseColumn = {
  column_name: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
};

const APPLY_SCHEMA_COMMAND = "pnpm --filter @workspace/db run push";

function defaultMatches(
  defaultKind: (typeof profilePreferencesDatabaseSchema.columns)[keyof typeof profilePreferencesDatabaseSchema.columns]["defaultKind"],
  actualDefault: string | null,
): boolean {
  if (defaultKind === "none") {
    return actualDefault === null;
  }

  if (actualDefault === null) {
    return false;
  }

  const normalizedDefault = actualDefault.replace(/\s+/g, "").toLowerCase();
  if (defaultKind === "false") {
    return normalizedDefault.includes("false");
  }

  return (
    normalizedDefault.includes("'{}'::text[]") ||
    normalizedDefault.includes("array[]::text[]")
  );
}

export async function findSchemaIssues(client: Queryable): Promise<string[]> {
  const { tableName, columns } = profilePreferencesDatabaseSchema;
  const expectedColumns = Object.values(columns);
  const issues: string[] = [];

  const tableResult = await client.query<{ table_name: string }>(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName],
  );

  if (tableResult.rows.length === 0) {
    return [`missing table public.${tableName}`];
  }

  const columnResult = await client.query<DatabaseColumn>(
    `
      SELECT column_name, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [tableName],
  );
  const actualColumns = new Map(
    columnResult.rows.map((column) => [column.column_name, column]),
  );

  for (const expectedColumn of expectedColumns) {
    const actualColumn = actualColumns.get(expectedColumn.name);
    if (!actualColumn) {
      issues.push(`missing column ${tableName}.${expectedColumn.name}`);
      continue;
    }

    if (actualColumn.udt_name !== expectedColumn.udtName) {
      issues.push(
        `column ${tableName}.${expectedColumn.name} has type ${actualColumn.udt_name}, expected ${expectedColumn.udtName}`,
      );
    }
    if ((actualColumn.is_nullable === "YES") !== expectedColumn.nullable) {
      issues.push(
        `column ${tableName}.${expectedColumn.name} has nullable=${actualColumn.is_nullable}, expected nullable=${expectedColumn.nullable ? "YES" : "NO"}`,
      );
    }
    if (
      !defaultMatches(expectedColumn.defaultKind, actualColumn.column_default)
    ) {
      issues.push(
        `column ${tableName}.${expectedColumn.name} has an unexpected default`,
      );
    }
  }

  const expectedColumnNames = new Set<string>(
    expectedColumns.map((column) => column.name),
  );
  for (const actualColumn of columnResult.rows) {
    if (!expectedColumnNames.has(actualColumn.column_name)) {
      issues.push(`unexpected column ${tableName}.${actualColumn.column_name}`);
    }
  }

  const primaryKeyResult = await client.query<{ column_name: string }>(
    `
      SELECT key_column_usage.column_name
      FROM information_schema.table_constraints AS table_constraints
      JOIN information_schema.key_column_usage AS key_column_usage
        ON key_column_usage.constraint_name = table_constraints.constraint_name
       AND key_column_usage.table_schema = table_constraints.table_schema
       AND key_column_usage.table_name = table_constraints.table_name
      WHERE table_constraints.table_schema = 'public'
        AND table_constraints.table_name = $1
        AND table_constraints.constraint_type = 'PRIMARY KEY'
      ORDER BY key_column_usage.ordinal_position
    `,
    [tableName],
  );
  const actualPrimaryKeyColumns = primaryKeyResult.rows.map(
    (row) => row.column_name,
  );
  const expectedPrimaryKeyColumns = expectedColumns
    .filter(
      (
        column,
      ): column is (typeof expectedColumns)[number] & {
        primaryKey: true;
      } => "primaryKey" in column && column.primaryKey,
    )
    .map((column) => column.name);

  if (
    actualPrimaryKeyColumns.length !== expectedPrimaryKeyColumns.length ||
    actualPrimaryKeyColumns.some(
      (columnName, index) => columnName !== expectedPrimaryKeyColumns[index],
    )
  ) {
    const actualKey =
      actualPrimaryKeyColumns.length > 0
        ? actualPrimaryKeyColumns.join(", ")
        : "none";
    issues.push(
      `table ${tableName} has primary key (${actualKey}), expected (${expectedPrimaryKeyColumns.join(", ")})`,
    );
  }

  return issues;
}

export function formatSchemaFailure(issues: string[]): string {
  return [
    "Database schema validation failed.",
    ...issues.map((issue) => `- ${issue}`),
    `Apply the Drizzle schema with "${APPLY_SCHEMA_COMMAND}", then rerun validation.`,
  ].join("\n");
}

export async function validateDatabaseSchema(
  databaseUrl = process.env.DATABASE_URL,
): Promise<void> {
  if (!databaseUrl) {
    throw new Error(
      `DATABASE_URL must be set to validate the development database schema. Apply the schema with "${APPLY_SCHEMA_COMMAND}".`,
    );
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const issues = await findSchemaIssues(pool);
    if (issues.length > 0) {
      throw new Error(formatSchemaFailure(issues));
    }
  } finally {
    await pool.end();
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  try {
    await validateDatabaseSchema();
    console.log("Database schema matches the Drizzle schema.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
