import { boolean, pgTable, text } from "drizzle-orm/pg-core";

export const profilePreferencesTable = pgTable("profile_preferences", {
  userId: text("user_id").primaryKey(),
  hiddenFields: text("hidden_fields").array().notNull().default([]),
  womenOnlyNotifications: boolean("women_only_notifications")
    .notNull()
    .default(false),
});

export type ProfilePreferencesRecord =
  typeof profilePreferencesTable.$inferSelect;