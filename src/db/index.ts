import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
// 1. 💥 必须引入你写的所有表结构蓝图！
import * as schema from "./schema";
const queryClient = postgres({
  max: 10, // 如果你需要配置连接池大小、debug 等，直接在这里作为第一个参数传入
  debug: (connection, query, parameters) => {
    console.log(
      console.log(
        `\n============== [SQL INJECTED] ============== \nStmt: ${query}\nParams: ${JSON.stringify(parameters)}\n============================================`,
      ),
    );
  },
});

export const db = drizzle(queryClient, { schema });

console.log("⚡ [Database] 连接池初始化成功，TCP 管道已就绪。");
