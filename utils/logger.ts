
import winston from 'winston';
import fs from 'fs';


const LOG_DIRS = [
  'test-results/logs',
  'test-results/api-logs',
  'test-results/screenshots'
];
LOG_DIRS.forEach(dir => fs.mkdirSync(dir, { recursive: true }));

const { combine, timestamp, printf, colorize, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp }) => {
  const msg = typeof message === 'object' ? JSON.stringify(message) : String(message);
  return `${timestamp} [${level}]: ${msg}`;
});


export const Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), consoleFormat),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      )
    }),
    new winston.transports.File({
      filename: 'test-results/logs/run.log',
      maxsize: 5 * 1024 * 1024, 
      maxFiles: 5
    })
  ]
});


export const ApiLogger = winston.createLogger({
  level: 'info',
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.File({
      filename: 'test-results/api-logs/api-trace.json',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    })
  ]
});


if (process.env.API_LOG_CONSOLE === 'true') {
  ApiLogger.add(new winston.transports.Console({
    format: combine(timestamp(), json())
  }));
}