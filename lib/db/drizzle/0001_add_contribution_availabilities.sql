CREATE TABLE "contribution_availabilities" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"supporter_id" text NOT NULL,
	"supporter_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "contribution_availabilities_post_supporter_idx" ON "contribution_availabilities" USING btree ("post_id","supporter_id");