import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const missionaryFollowsDatabaseSchema = {
  tableName: "missionary_follows",
  columns: {
    supporterId: {
      name: "supporter_id",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
      primaryKey: true,
    },
    missionaryId: {
      name: "missionary_id",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
      primaryKey: true,
    },
    createdAt: {
      name: "created_at",
      udtName: "timestamptz",
      nullable: false,
      defaultKind: "now",
    },
  },
} as const;

export const missionaryFollowsTable = pgTable(
  missionaryFollowsDatabaseSchema.tableName,
  {
    supporterId: text(
      missionaryFollowsDatabaseSchema.columns.supporterId.name,
    ).notNull(),
    missionaryId: text(
      missionaryFollowsDatabaseSchema.columns.missionaryId.name,
    ).notNull(),
    createdAt: timestamp(
      missionaryFollowsDatabaseSchema.columns.createdAt.name,
      { withTimezone: true },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({
      columns: [table.supporterId, table.missionaryId],
    }),
  }),
);

export type MissionaryFollowRecord = typeof missionaryFollowsTable.$inferSelect;
