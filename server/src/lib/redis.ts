import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(redisUrl, {
  retryStrategy: () => {
    return 5000
  },
  enableReadyCheck: true,
  enableOfflineQueue: true,
})

redis.on('connect', () => {
  console.log('Redis connected')
})

redis.on('error', (err: Error) => {
  console.log('Redis error: ' + err.message)
})
