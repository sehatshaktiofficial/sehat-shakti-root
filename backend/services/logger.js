const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'telemedicine-auth',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'auth-error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'auth-combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Security logs
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'auth-security.log'),
      level: 'warn',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Security-specific logging methods
logger.security = (message, meta = {}) => {
  logger.warn(message, { ...meta, type: 'security' });
};

logger.audit = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'audit' });
};

module.exports = logger;
