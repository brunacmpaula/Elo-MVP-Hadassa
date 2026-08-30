CREATE TABLE "profile_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"hidden_fields" text[] DEFAULT '{}' NOT NULL,
	"women_only_notifications" boolean DEFAULT false NOT NULL
);
