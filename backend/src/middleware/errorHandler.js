export const notFoundHandler = (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred.';

  // Map PostgreSQL duplicate key violation (23505) to 409 Conflict
  if (err.code === '23505') {
    statusCode = 409;
    errorCode = 'EMAIL_ALREADY_EXISTS';
    message = 'An account with this email address already exists.';
  }

  // Map PostgreSQL connection failures to 503 Service Unavailable
  if (err.code === 'ECONNREFUSED' || err.code === '57P01' || err.code === '08006' || err.message?.includes('Connection terminated')) {
    statusCode = 503;
    errorCode = 'DATABASE_UNAVAILABLE';
    message = 'Database service is temporarily unavailable. Please try again in a moment.';
  }

  const isDev = process.env.NODE_ENV !== 'production';

  console.error(`[API Error ${statusCode}]`, {
    code: errorCode,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
  });

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(err.details && { details: err.details }),
      ...(isDev && { originalMessage: err.message }),
    },
  });
};
