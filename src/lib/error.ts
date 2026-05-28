// 📂 src/utils/errors.ts
export class BusinessError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "BusinessError";
    // 维持原型链 (TypeScript 继承内置类的标准操作)
    Object.setPrototypeOf(this, BusinessError.prototype);
  }
}
