module.exports = {
  apps: [
    {
      name: 'apid-backend',
      cwd: './backend',
      script: 'dist/index.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5008,
      },
    },
    {
      name: 'apid-frontend',
      cwd: './frontend',
      script: 'server.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5009,
        INTERNAL_API_URL: 'http://127.0.0.1:5008/api/v2',
        VITE_API_URL: '/api/v2',
      },
    },
  ],
}
