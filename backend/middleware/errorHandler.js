/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorType = err.name || 'ServerError';

  // Log error for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle different types of errors
  switch (err.name) {
    case 'ValidationError':
      statusCode = 400;
      message = 'Validation Error';
      errorType = 'VALIDATION_ERROR';
      break;
    
    case 'JsonWebTokenError':
      statusCode = 401;
      message = 'Invalid token';
      errorType = 'INVALID_TOKEN';
      break;
    
    case 'TokenExpiredError':
      statusCode = 401;
      message = 'Token expired';
      errorType = 'TOKEN_EXPIRED';
      break;
    
    case 'CastError':
      statusCode = 400;
      message = 'Invalid ID format';
      errorType = 'INVALID_ID';
      break;
    
    case 'MongoError':
      if (err.code === 11000) {
        statusCode = 400;
        message = 'Duplicate field value';
        errorType = 'DUPLICATE_FIELD';
      }
      break;
    
    default:
      // Keep the original status code and message for other errors
      break;
  }

  // Don't expose sensitive error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    success: false,
    error: {
      type: errorType,
      message: message,
      statusCode: statusCode
    },
    ...(isDevelopment && {
      stack: err.stack,
      details: err
    })
  };

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      type: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      statusCode: 404
    }
  });
};

/**
 * Async error wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function that catches async errors
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class
 */
export class CustomError extends Error {
  constructor(message, statusCode = 500, errorType = 'SERVER_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.name = errorType;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}