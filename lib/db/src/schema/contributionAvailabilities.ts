import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const contributionAvailabilitiesTable = pgTable(
  "contribution_availabilities",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    supporterId: text("supporter_id").notNull(),
    supporterName: text("supporter_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
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