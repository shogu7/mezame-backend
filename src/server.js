require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

console.log('Importing routes...');

try {
  const authRoutes = require('./router/auth');
  console.log('authRoutes loaded');

  const manhwaRoutes = require('./router/manhwa');
  console.log('manhwaRoutes loaded');
  console.log('manhwaRoutes type:', typeof manhwaRoutes);

  const userManhwaRoutes = require('./router/userManhwa');
  console.log('userManhwaRoutes loaded');

  const admin = require('./router/admin');
  console.log('admin loaded');

  const uploadRoutes = require('./router/cloudinary/upload');
  console.log('uploadRoutes loaded');


  app.use('/api/auth', authRoutes);
  app.use('/api/manhwa', manhwaRoutes);
  app.use('/api/user-manhwa', userManhwaRoutes);
  app.use('/api/admin', admin);
  app.use('/api/upload', uploadRoutes);

  console.log('All routes mounted!');

} catch (err) {
  console.error('Error loading routes:', err.message);
  process.exit(1);
}

if (app._router && app._router.stack) {
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      console.log('Route:', middleware.route.path);
    } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          console.log('Mounted route:', handler.route.path);
        }
      });
    }
  });
}


app.get('/api/test', (req, res) => {
  res.json({ ok: true, message: 'API works!' });
});


app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.path);
  res.status(404).json({
    ok: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\nMezame API running on port ${PORT}`);
  console.log(`Test: http://localhost:${PORT}/api/test`);
  console.log(`Manhwa: http://localhost:${PORT}/api/manhwa/latest?limit=6`);
  console.log(`\nWatching for requests...\n`);
});