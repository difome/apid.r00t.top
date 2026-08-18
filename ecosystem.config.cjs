module.exports = {
  apps: [
    {
      name: 'apid-backend',
      cwd: './backend',
      script: 'node_modules/.bin/tsx',
      args: 'src/index.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'apid-frontend',
      cwd: './frontend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        INTERNAL_API_URL: 'http://127.0.0.1:3000/api/v2',
        VITE_API_URL: '/api/v2',
      },
    },
  ],
}
