import { defineConfig } from "drizzle-kit";

// 1. 强力校验防御：如果发现环境变量没加载进来，在编译期直接报错，防止 CLI 工具连入虚无
if (!process.env.PGHOST) {
  // 💡 提示：Bun 在执行 drizzle-kit 时，会自动帮我们加载根目录下的 .env 文件
  throw new Error(
    "❌ [Drizzle Config] 未检测到数据库环境变量，请确保根目录下存在 .env 文件！",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    // 2. 核心报错点解决：如果没有读到，抛出字符串兜底，或者直接加 "!"
    database: process.env.PGDATABASE!,
    ssl: false,
  },
});
