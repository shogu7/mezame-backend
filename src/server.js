require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const allowedOrigins = [
  'http://151.80.145.253:3000',
  'http://mezame.cloud-ip.cc',
  'https://mezame.cloud-ip.cc'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

console.log('Importing routes...');

try {
  //#region: Setup all routes required
  const authRoutes = require('./router/auth.js');
  console.log('authRoutes loaded');
  // TODO: Find why i import that thing??? guh? muh? nuh?

  const manhwaRoutes = require('./router/manhwa');
  console.log('manhwaRoutes loaded');
  console.log('manhwaRoutes type:', typeof manhwaRoutes);

  const userManhwaRoutes = require('./router/userManhwa');
  console.log('userManhwaRoutes loaded');

  const admin = require('./router/admin');
  console.log('admin loaded');

  const uploadRoutes = require('./router/cloudinary/upload');
  console.log('uploadRoutes loaded');

  const userLibraryRoutes = require('./router/user/userLibrary');
  console.log('userLibrary loaded');

  const userManhwaLibraryRoutes = require('./router/user/user_manhwa');
  console.log('user_manhwa loaded');

  const userProfileRoutes = require('./router/user/userProfile');
  console.log('user_Profile loaded')

  const path = require('path');
  console.log('path for avatar loaded')

  //#endregion

  //#region: use this router for all /api/manhwa routes
  console.log('UP routes...');
  app.use('/api/auth', authRoutes);
  app.use('/api/manhwa', manhwaRoutes);
  app.use('/api/user-manhwa', userManhwaRoutes);
  app.use('/api/admin', admin);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/user', userProfileRoutes);
  app.use('/api/user/lib', userLibraryRoutes);
  app.use('/api/user/library', userManhwaLibraryRoutes);
  app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));

  console.log('All routes mounted!');
  //#endregion
} catch (err) {
  console.error('Error loading routes:', err.message);
  process.exit(1);
}


//#region: debug display all the routes mounted
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
//#endregion

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

// console.log('DB_USER:', process.env.DB_USER);
// console.log('DB_PASSWORD:', process.env.DB_PASSWORD);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\nMezame API running on port ${PORT}`);
  console.log(`Test: http://localhost:${PORT}/api/test`);
  console.log(`Manhwa: http://localhost:${PORT}/api/manhwa/latest?limit=6`);
  console.log(`\nWatching for requests...\n`);
});