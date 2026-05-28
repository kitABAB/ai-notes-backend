ALTER TABLE "materials" ALTER COLUMN "raw_content" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "oss_url" text;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "file_size" integer;