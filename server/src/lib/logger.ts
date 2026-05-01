import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format:
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.colorize(),
          winston.format.printf(
            ({ timestamp, level, message }) =>
              `[${timestamp}] ${level} ${message}`
          )
        ),
  transports: [new winston.transports.Console()],
})

export default logger
