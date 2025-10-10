// Request logging utilities for API routes

export interface LogContext {
  method?: string;
  path?: string;
  userId?: string;
  ip?: string;
  duration?: number;
  status?: number;
  error?: string;
  [key: string]: any;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured logger for API requests
 */
export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Add context to logger
   */
  addContext(context: LogContext): Logger {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, data?: any): void {
    const errorData = {
      ...data,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    };
    this.log('error', message, errorData);
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...this.context,
      ...data,
    };

    // In production, send to logging service (e.g., Datadog, CloudWatch)
    if (process.env.NODE_ENV === 'production') {
      // Example: datadogLogger.log(logEntry);
    }

    // Console output with color coding
    const color = this.getColor(level);
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (level === 'error') {
      console.error(color, prefix, message, data || '', '\x1b[0m');
    } else if (level === 'warn') {
      console.warn(color, prefix, message, data || '', '\x1b[0m');
    } else {
      console.log(color, prefix, message, data || '', '\x1b[0m');
    }
  }

  /**
   * Get ANSI color code for log level
   */
  private getColor(level: LogLevel): string {
    switch (level) {
      case 'debug':
        return '\x1b[36m'; // Cyan
      case 'info':
        return '\x1b[32m'; // Green
      case 'warn':
        return '\x1b[33m'; // Yellow
      case 'error':
        return '\x1b[31m'; // Red
      default:
        return '\x1b[0m'; // Reset
    }
  }
}

/**
 * Log API request
 */
export function logRequest(request: Request, options: {
  userId?: string;
  startTime?: number;
} = {}): void {
  const { userId, startTime } = options;
  const url = new URL(request.url);

  const logger = new Logger({
    method: request.method,
    path: url.pathname,
    userId,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  });

  if (startTime) {
    const duration = Date.now() - startTime;
    logger.addContext({ duration });
  }

  logger.info(`${request.method} ${url.pathname}`);
}

/**
 * Log API response
 */
export function logResponse(
  request: Request,
  status: number,
  options: {
    userId?: string;
    startTime?: number;
    error?: Error;
  } = {}
): void {
  const { userId, startTime, error } = options;
  const url = new URL(request.url);
  const duration = startTime ? Date.now() - startTime : 0;

  const logger = new Logger({
    method: request.method,
    path: url.pathname,
    userId,
    status,
    duration,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  });

  if (error) {
    logger.error(`${request.method} ${url.pathname} - ${status}`, error);
  } else if (status >= 500) {
    logger.error(`${request.method} ${url.pathname} - ${status}`);
  } else if (status >= 400) {
    logger.warn(`${request.method} ${url.pathname} - ${status}`);
  } else {
    logger.info(`${request.method} ${url.pathname} - ${status}`);
  }
}

/**
 * Request logging middleware
 * Wraps API handler to log requests and responses
 *
 * @example
 * ```typescript
 * export const GET = withLogging(async (request: NextRequest) => {
 *   // ... handler logic
 *   return NextResponse.json({ data });
 * });
 * ```
 */
export function withLogging(
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const startTime = Date.now();

    // Log incoming request
    logRequest(request, { startTime });

    try {
      const response = await handler(request);

      // Log successful response
      logResponse(request, response.status, { startTime });

      return response;
    } catch (error) {
      // Log error response
      logResponse(request, 500, { startTime, error: error as Error });

      throw error;
    }
  };
}

/**
 * Create logger instance with context
 */
export function createLogger(context: LogContext = {}): Logger {
  return new Logger(context);
}

/**
 * Default logger instance
 */
export const logger = new Logger();
