// src/middlewares/errorHandler.js

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized access") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Forbidden access") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errorType = err.name || "InternalError";

  // Handle specific error types
  if (err.code === "P2002") {
    // Prisma unique constraint violation
    statusCode = 409;
    message = "A record with this value already exists";
    errorType = "DuplicateError";
  }

  if (err.code === "P2025") {
    // Prisma record not found
    statusCode = 404;
    message = "Record not found";
    errorType = "NotFoundError";
  }

  if (err.name === "ZodError") {
    // Zod validation error
    statusCode = 400;
    message =
      err.errors?.map((e) => e.message).join(", ") || "Validation failed";
    errorType = "ValidationError";
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    errorType = "UnauthorizedError";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    errorType = "UnauthorizedError";
  }

  if (err.code === "ECONNREFUSED") {
    statusCode = 503;
    message = "Service unavailable";
    errorType = "ConnectionError";
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    error: {
      type: errorType,
      message: message,
      statusCode: statusCode,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};

// Async wrapper to catch errors in async route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      type: "NotFoundError",
      message: `Cannot ${req.method} ${req.url}`,
      statusCode: 404,
    },
  });
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
