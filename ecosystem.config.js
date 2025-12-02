module.exports = {
  apps : [{
    name: 'mezame-backend',
    script: 'src/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development' 
    },
    env_production: {
      NODE_ENV: 'production'
    },
    env_file: '.env'
  }]
};
