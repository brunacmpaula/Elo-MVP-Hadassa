import { boolean, pgTable, text } from "drizzle-orm/pg-core";

export const profilePreferencesDatabaseSchema = {
  tableName: "profile_preferences",
  columns: {
    userId: {
      name: "user_id",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
      primaryKey: true,
    },
    hiddenFields: {
      name: "hidden_fields",
      udtName: "_text",
      nullable: false,
      defaultKind: "empty-text-array",
    },
    womenOnlyNotifications: {
      name: "women_only_notifications",
      udtName: "bool",
      nullable: false,
      defaultKind: "false",
    },
  },
} as const;

export const profilePreferencesTable = pgTable(
  profilePreferencesDatabaseSchema.tableName,
  {
    userId: text(
      profilePreferencesDatabaseSchema.columns.userId.name,
    ).primaryKey(),
    hiddenFields: text(
      profilePreferencesDatabaseSchema.columns.hiddenFields.name,
    )
      .array()
      .notNull()
      .default([]),
    womenOnlyNotifications: boolean(
      profilePreferencesDatabaseSchema.columns.womenOnlyNotifications.name,
    )
      .notNull()
      .default(false),
  },
);

export type ProfilePreferencesRecord =
  typeof profilePreferencesTable.$inferSelect;
