/**
 * Structured server-side logger utility for Hydrogen actions, loaders, and Oxygen runtime.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  action?: string;
  route?: string;
  durationMs?: number;
  requestId?: string;
  status?: number;
  [key: string]: unknown;
}

class ServerLogger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[MONTS ${level.toUpperCase()}] [${timestamp}]`;
    const details = context ? ` | Context: ${JSON.stringify(this.sanitize(context))}` : '';
    return `${prefix} ${message}${details}`;
  }

  private sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('password')
      ) {
        sanitized[key] = '***REDACTED***';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  info(message: string, context?: LogContext) {
    console.info(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: unknown, context?: LogContext) {
    const errorDetails = error instanceof Error
      ? { errorMessage: error.message, stack: error.stack }
      : { rawError: error };

    console.error(
      this.formatMessage('error', message, {
        ...context,
        ...errorDetails,
      }),
    );
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Performance timing wrapper for async actions and loaders.
   */
  async time<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: LogContext,
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const durationMs = Math.round(performance.now() - start);
      this.info(`${operationName} completed in ${durationMs}ms`, {
        ...context,
        durationMs,
      });
      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      this.error(`${operationName} failed after ${durationMs}ms`, err, {
        ...context,
        durationMs,
      });
      throw err;
    }
  }
}

export const logger = new ServerLogger();
