module.exports = {
  apps: [
    {
      name: 'regi-server',
      script: './qa-assistant/server/dist/index.js',
      cwd: '/home/deploy/regi',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/home/deploy/logs/regi-error.log',
      out_file: '/home/deploy/logs/regi-out.log',
      log_file: '/home/deploy/logs/regi-combined.log',
    },
  ],
}
