import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260623074514 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "store_setting" ("id" text not null, "key" text not null, "scope" text not null, "title" text not null, "description" text not null, "enabled" boolean not null, "sort_order" integer not null, "payload" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_setting_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_setting_deleted_at" ON "store_setting" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "store_setting" cascade;`);
  }

}
