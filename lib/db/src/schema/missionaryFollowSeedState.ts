import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const missionaryFollowSeedStateDatabaseSchema = {
  tableName: "missionary_follow_seed_state",
  columns: {
    id: {
      name: "id",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
      primaryKey: true,
    },
    initializedAt: {
      name: "initialized_at",
      udtName: "timestamptz",
      nullable: false,
      defaultKind: "now",
    },
  },
} as const;

export const missionaryFollowSeedStateTable = pgTable(
  missionaryFollowSeedStateDatabaseSchema.tableName,
  {
    id: text(
      missionaryFollowSeedStateDatabaseSchema.columns.id.name,
    ).primaryKey(),
    initializedAt: timestamp(
      missionaryFollowSeedStateDatabaseSchema.columns.initializedAt.name,
      { withTimezone: true },
    )
      .notNull()
      .defaultNow(),
  },
);

export type MissionaryFollowSeedStateRecord =
  typeof missionaryFollowSeedStateTable.$inferSelect;
