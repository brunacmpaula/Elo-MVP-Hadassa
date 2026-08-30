import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const postsDatabaseSchema = {
  tableName: "posts",
  columns: {
    id: {
      name: "id",
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
    },
    missionaryName: {
      name: "missionary_name",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
    },
    missionaryCountry: {
      name: "missionary_country",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
    },
    type: {
      name: "type",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
    },
    title: {
      name: "title",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
    },
    content: {
      name: "content",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
    },
    status: {
      name: "status",
      udtName: "text",
      nullable: false,
      defaultKind: "none",
    },
    clientOperationId: {
      name: "client_operation_id",
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
    updatedAt: {
      name: "updated_at",
      udtName: "timestamptz",
      nullable: false,
      defaultKind: "now",
    },
    prayerCount: {
      name: "prayer_count",
      udtName: "int4",
      nullable: false,
      defaultKind: "zero",
    },
    media: {
      name: "media",
      udtName: "jsonb",
      nullable: false,
      defaultKind: "empty-json-array",
    },
    comments: {
      name: "comments",
      udtName: "jsonb",
      nullable: false,
      defaultKind: "empty-json-array",
    },
  },
} as const;

export const postsTable = pgTable(
  postsDatabaseSchema.tableName,
  {
    id: text(postsDatabaseSchema.columns.id.name).primaryKey(),
    missionaryId: text(postsDatabaseSchema.columns.missionaryId.name).notNull(),
    missionaryName: text(
      postsDatabaseSchema.columns.missionaryName.name,
    ).notNull(),
    missionaryCountry: text(
      postsDatabaseSchema.columns.missionaryCountry.name,
    ).notNull(),
    type: text(postsDatabaseSchema.columns.type.name).notNull(),
    title: text(postsDatabaseSchema.columns.title.name).notNull(),
    content: text(postsDatabaseSchema.columns.content.name).notNull(),
    status: text(postsDatabaseSchema.columns.status.name).notNull(),
    clientOperationId: text(
      postsDatabaseSchema.columns.clientOperationId.name,
    ).notNull(),
    createdAt: timestamp(postsDatabaseSchema.columns.createdAt.name, {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp(postsDatabaseSchema.columns.updatedAt.name, {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    prayerCount: integer(postsDatabaseSchema.columns.prayerCount.name)
      .notNull()
      .default(0),
    media: jsonb(postsDatabaseSchema.columns.media.name)
      .$type<unknown[]>()
      .notNull()
      .default([]),
    comments: jsonb(postsDatabaseSchema.columns.comments.name)
      .$type<unknown[]>()
      .notNull()
      .default([]),
  },
  (table) => ({
    clientOperationUnique: uniqueIndex("posts_client_operation_id_idx").on(
      table.clientOperationId,
    ),
  }),
);

export type PostRecord = typeof postsTable.$inferSelect;