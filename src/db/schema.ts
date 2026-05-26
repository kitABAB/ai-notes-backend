// 建表
import {
  pgTable,
  primaryKey,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
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
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"), // AI 自动生成的摘要，允许先为空

  // 物理外键：通过 .references() 强行绑定到 users 表的 id 列
  // onDelete: 'cascade' 代表如果这个用户被注销了，他名下的所有笔记自动被数据库连带删除，不留垃圾数据
  authorId: integer("author_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 3. 标签表 (tags)
// ==========================================

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // 标签名不能重复，比如不能有两个叫做 "AI" 的标签
});

// ==========================================
// 4. 笔记与标签的「多对多中间连接表」 (notes_to_tags)
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
