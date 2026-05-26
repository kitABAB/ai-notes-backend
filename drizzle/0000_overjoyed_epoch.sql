CREATE TYPE "public"."ai_status" AS ENUM('idle', 'gathering', 'processing', 'completed', 'failed');
--> statement-breakpoint
CREATE TYPE "public"."material_type" AS ENUM('text', 'image', 'file', 'url');
--> statement-breakpoint
CREATE TABLE "materials" (
    "id" serial PRIMARY KEY NOT NULL,
    "note_id" integer NOT NULL,
    "type" "material_type" NOT NULL,
    "raw_content" text NOT NULL,
    "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notes" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "title" varchar(255),
    "content" text,
    "ai_status" "ai_status" DEFAULT 'gathering' NOT NULL,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notes_to_tags" (
    "note_id" integer NOT NULL,
    "tag_id" integer NOT NULL,
    CONSTRAINT "notes_to_tags_note_id_tag_id_pk" PRIMARY KEY ("note_id", "tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    CONSTRAINT "tags_name_unique" UNIQUE ("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "email" text NOT NULL,
    "password_hash" text NOT NULL,
    "role" text DEFAULT 'USER' NOT NULL,
    "ai_quota" integer DEFAULT 10 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "users_email_unique" UNIQUE ("email")
);
--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notes_to_tags" ADD CONSTRAINT "notes_to_tags_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notes_to_tags" ADD CONSTRAINT "notes_to_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;