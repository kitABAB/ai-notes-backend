// 创建并发任务队列

export const createConcurrencyLock = (limit: number) => {
  let activeCount = 0;
  const queue: (() => void)[] = [];

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const wakeUpNext = queue.shift();
      if (wakeUpNext) wakeUpNext();
    }
  };

  return async <T>(taskFn: () => Promise<T>): Promise<T> => {
    if (activeCount >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }

    activeCount++;
    try {
      return await taskFn();
    } finally {
      next();
    }
  };
};
