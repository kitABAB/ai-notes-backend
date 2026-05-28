import Redis from "ioredis";

// 确保你本地 Docker 的 6379 端口是通的
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// 1. 默认客户端：用于执行普通的 GET/SET/APPEND，以及存取 Buffer
export const redis = new Redis(REDIS_URL);

// 2. 订阅专用客户端工厂：每当有前端连入 SSE 监听流，我们就给它单独生成一个监听通道
export const createSubClient = () => new Redis(REDIS_URL);

redis.on("connect", () => console.log("🟢 Redis 默认客户端已连接"));
redis.on("error", (err) => console.error("🔴 Redis 连接错误:", err));
