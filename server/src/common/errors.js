// 自定义错误类型
class AppError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource}未找到: ${id}`, 'NOT_FOUND', 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '未登录或登录已过期') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = '无权限执行此操作') {
    super(message, 'FORBIDDEN', 403);
  }
}

class ValidationError extends AppError {
  constructor(errors) {
    super('数据验证失败', 'VALIDATION_ERROR', 422);
    this.errors = errors;
  }
}

// 全局错误处理中间件
function globalErrorHandler(err, req, res, next) {
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      errors: err.errors || undefined,
    });
  }

  // 未知错误
  console.error('[ERROR]', err.message, err.stack);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: '服务器内部错误，请稍后重试',
  });
}

module.exports = {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  globalErrorHandler,
};
