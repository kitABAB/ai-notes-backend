import authFeature from "./features/auth/auth.controller";
import { db } from "./db/index";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "./types/env";
async function bootstrap() {
  try {
    console.log("📡 [Database] 正在发射 TCP 强校验探测包...");

    // 💡 强行执行一句 SELECT 1，逼着 Drizzle 的惰性连接池立刻顺着网线拨号
    await db.execute(sql`SELECT 1`);

    console.log("⚡ [Database] 物理验证通过！Docker 锅炉已就绪。");
  } catch (error: any) {
    console.error("❌ ==========================================");
    console.error("❌ [CRITICAL ERROR] 数据库连接物理溃败！");
    console.error(`❌ 错误线索: ${error.message}`);
    console.error("❌ 请检查 Docker 是否打开、连接串是否正确！");
    console.error("❌ ==========================================");

    // 💡 绝不带病空转！直接命令操作系统中断当前进程，实现优雅的“自杀”
    process.exit(1);
  }
}

// 🔥 瞬间触发物理断言
await bootstrap();
const app = new Hono<AppEnv>();

// 健康检查接口：用于未来 K8s 或部署平台检查服务状态
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: "connected (pool initialized)",
  });
});

// 导入刚刚组装好的 auth 模块主线

// 可以在这里挂载全局的跨域 (CORS)、日志 (Logger) 等中间件
// app.use('*', cors());

// 🌍 最终拼装魔法：
// 将整个 authFeature 装甲车开入 /api/auth 主干道。
app.route("/api/auth", authFeature);

// 最终对外暴露的真实物理路径将变成：
// 🟢 POST /api/auth/register (自带 Zod 校验)
// 🟢 POST /api/auth/login    (自带 Zod 校验)
// 🔴 GET  /api/auth/me       (自带 JWT 护盾拦截)

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};
