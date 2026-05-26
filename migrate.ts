// 📂 migrate.ts
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./src/db"; // 确保指向你真实的 db 实例文件

async function runMigrations() {
  console.log("🚀 抛弃 CLI，开始通过底层 API 执行物理迁移...");
  try {
    // 强制读取 drizzle 文件夹下的 SQL 和 _journal.json 进行迁移
    // 如果你的 sql 文件生成在别的文件夹，请把 './drizzle' 改掉
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ 迁移完美执行完毕！表和枚举全部就位！");
  } catch (error: any) {
    console.error("❌ 迁移报错啦：", error.message);
  }

  console.log("🎉 结束进程");
  process.exit(0);
}

runMigrations();
