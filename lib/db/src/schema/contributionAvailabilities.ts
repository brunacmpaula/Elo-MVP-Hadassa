import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { postsTable } from "./posts.ts";

export const contributionAvailabilitiesDatabaseSchema = {
  tableName: "contribution_availabilities",
  foreignKeys: [
    {
      constraintName: "contribution_availabilities_post_id_posts_id_fk",
      columnName: "post_id",
      referencedTable: "posts",
      referencedColumn: "id",
    },
  ],
  columns: {
    id: {
      name: "id",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
      primaryKey: true,
    },
    postId: {
      name: "post_id",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
    },
    supporterId: {
      name: "supporter_id",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
    },
    supporterName: {
      name: "supporter_name",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
    },
    createdAt: {
      name: "created_at",
      udtName: "timestamptz",
      nullable: false,
      defaultKind: "now",
    },
  },
} as const;

export const contributionAvailabilitiesTable = pgTable(
  contributionAvailabilitiesDatabaseSchema.tableName,
  {
    id: text(contributionAvailabilitiesDatabaseSchema.columns.id.name).primaryKey(),
    postId: text(contributionAvailabilitiesDatabaseSchema.columns.postId.name)
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    supporterId: text(
      contributionAvailabilitiesDatabaseSchema.columns.supporterId.name,
    ).notNull(),
    supporterName: text(
      contributionAvailabilitiesDatabaseSchema.columns.supporterName.name,
    ).notNull(),
    createdAt: timestamp(
      contributionAvailabilitiesDatabaseSchema.columns.createdAt.name,
      { withTimezone: true },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    postSupporterUnique: uniqueIndex(
      "contribution_availabilities_post_supporter_idx",
    ).on(table.postId, table.supporterId),
  }),
);

export type ContributionAvailabilityRecord =
  typeof contributionAvailabilitiesTable.$inferSelect;