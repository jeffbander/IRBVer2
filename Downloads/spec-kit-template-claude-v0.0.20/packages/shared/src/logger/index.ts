import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

// Custom format for structured logging
const structuredFormat = winston.format.printf(({ level, message, timestamp, service, requestId, userId, ...meta }) => {
  return JSON.stringify({
    timestamp,
    level,
    service,
    requestId,
    userId,
    message,
    organization: 'Mount Sinai Health System',
    ...meta,
  });
});

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? structuredFormat
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'research-study-management',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.Console(),
  ],
});

export const createLogger = (service: string) => {
  return winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    defaultMeta: {
      service,
    },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
    ],
  });
};