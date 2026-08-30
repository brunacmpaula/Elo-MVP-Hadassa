CREATE TABLE "contribution_availability_feedback" (
"id" text PRIMARY KEY NOT NULL,
"availability_id" text NOT NULL,
"post_id" text NOT NULL,
"missionary_id" text NOT NULL,
"supporter_id" text NOT NULL,
"message" text NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "contribution_availability_feedback_availability_idx" ON "contribution_availability_feedback" USING btree ("availability_id");