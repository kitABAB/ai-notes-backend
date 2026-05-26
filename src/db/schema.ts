// 建表
import {
  pgTable,
  primaryKey,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
  varchar,
} from "drizzle-orm/pg-core";
import { aiStatusEnum, materialTypeEnum } from "./enum";
import { relations } from "drizzle-orm";
// ==========================================
// 1. 用户表 (users)
// ==========================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // email 做用户名
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // 密码的加密密文
  role: text("role").default("USER").notNull(), // 角色：USER / VIP_USER / ADMIN
  aiQuota: integer("ai_quota").default(10).notNull(), // 每日 AI 额度，默认 10 次
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 2. 笔记表 (notes)
// ==========================================

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(), // 外键关联用户
  title: varchar("title", { length: 255 }),
  content: text("content"),
  aiStatus: aiStatusEnum("ai_status").default("gathering").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. 物料表 (碎料筐)
// ==========================================
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id")
    .references(() => notes.id)
    .notNull(), // 外键关联笔记
  type: materialTypeEnum("type").notNull(),
  rawContent: text("raw_content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notesRelations = relations(notes, ({ many }) => ({
  materials: many(materials), // 一篇笔记有多个物料
}));

export const materialsRelations = relations(materials, ({ one }) => ({
  note: one(notes, {
    fields: [materials.noteId],
    references: [notes.id], // 一个物料属于一篇笔记
  }),
}));

// ==========================================
// 4. 标签表 (tags)
// ==========================================

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // 标签名不能重复，比如不能有两个叫做 "AI" 的标签
});

// ==========================================
// 5. 笔记与标签的「多对多中间连接表」 (notes_to_tags)
// ==========================================
export const notesToTags = pgTable(
  "notes_to_tags",
  {
    // 桥梁列 A：指向笔记
    noteId: integer("note_id")
      .references(() => notes.id, { onDelete: "cascade" })
      .notNull(),

    // 桥梁列 B：指向标签
    tagId: integer("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    // 直接平铺返回你的联合主键约束
    primaryKey({ columns: [table.noteId, table.tagId] }),
  ],
);
