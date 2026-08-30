CREATE TABLE "missionary_follows" (
"supporter_id" text NOT NULL,
"missionary_id" text NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT "missionary_follows_supporter_id_missionary_id_pk" PRIMARY KEY("supporter_id","missionary_id")
);

INSERT INTO "missionary_follows" ("supporter_id", "missionary_id")
VALUES
('user-supporter', 'missionary-ana'),
('user-supporter', 'missionary-joao')
ON CONFLICT DO NOTHING;
