// 📂 fix-enum.ts
import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function pureBlankSlate() {
  console.log("🧹 正在把数据库擦得一尘不染...");
  try {
    // 仅仅只做一件事：把数据库炸成完全的虚无
    await db.execute(sql`DROP SCHEMA public CASCADE;`);
    await db.execute(sql`CREATE SCHEMA public;`);
    console.log("✅ 数据库现在是 100% 纯粹的白纸！没有任何表，没有任何枚举！");
  } catch (error: any) {
    console.error("⚠️ 发生错误:", error.message);
  }

  process.exit(0);
}

pureBlankSlate();
