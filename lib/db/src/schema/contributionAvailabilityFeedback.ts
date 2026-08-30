import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const contributionAvailabilityFeedbackTable = pgTable(
  "contribution_availability_feedback",
  {
    id: text("id").primaryKey(),
    availabilityId: text("availability_id").notNull(),
    postId: text("post_id").notNull(),
    missionaryId: text("missionary_id").notNull(),
    supporterId: text("supporter_id").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    availabilityUnique: uniqueIndex(
      "contribution_availability_feedback_availability_idx",
    ).on(table.availabilityId),
  }),
);

export type ContributionAvailabilityFeedbackRecord =
  typeof contributionAvailabilityFeedbackTable.$inferSelect;