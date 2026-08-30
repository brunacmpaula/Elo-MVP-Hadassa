CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"missionary_id" text NOT NULL,
	"missionary_name" text NOT NULL,
	"missionary_country" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"status" text NOT NULL,
	"client_operation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"prayer_count" integer DEFAULT 0 NOT NULL,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"comments" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "posts_client_operation_id_idx" ON "posts" USING btree ("client_operation_id");--> statement-breakpoint
INSERT INTO "posts" (
	"id",
	"missionary_id",
	"missionary_name",
	"missionary_country",
	"type",
	"title",
	"content",
	"status",
	"client_operation_id",
	"prayer_count",
	"media",
	"comments"
) VALUES
	(
		'post-community-kits',
		'missionary-ana',
		'Ana Silva',
		'Moçambique',
		'NEED',
		'Kits de cuidado para novas famílias',
		'Precisamos de pessoas disponíveis para conversar sobre formas de apoiar a montagem e a entrega dos próximos kits.',
		'PUBLISHED',
		'seed-post-community-kits',
		7,
		'[]'::jsonb,
		'[]'::jsonb
	),
	(
		'post-prayer-team',
		'missionary-ana',
		'Ana Silva',
		'Moçambique',
		'PRAYER_REQUEST',
		'Ore pela nossa equipe esta semana',
		'Estamos visitando novas comunidades e precisamos de sabedoria, saúde e boas conversas em cada encontro.',
		'PUBLISHED',
		'seed-post-prayer-team',
		42,
		'[]'::jsonb,
		'[]'::jsonb
	),
	(
		'post-school',
		'missionary-joao',
		'João Santos',
		'Brasil',
		'UPDATE',
		'Uma nova turma começou',
		'Recebemos doze alunos para um novo ciclo de acompanhamento. Obrigado por caminhar conosco.',
		'PUBLISHED',
		'seed-post-school',
		18,
		'[]'::jsonb,
		'[]'::jsonb
	)
ON CONFLICT DO NOTHING;--> statement-breakpoint
DELETE FROM "contribution_availabilities"
WHERE NOT EXISTS (
	SELECT 1
	FROM "posts"
	WHERE "posts"."id" = "contribution_availabilities"."post_id"
);--> statement-breakpoint
ALTER TABLE "contribution_availabilities" ADD CONSTRAINT "contribution_availabilities_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;