require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); // CORS THING L^-^L
app.use(express.json());

const authRoutes = require('./router/auth');
const manhwaRoutes = require('./router/manhwa');
const userManhwaRoutes = require('./router/userManhwa');
const admin = require('./router/admin'); 

app.use('/api/auth', authRoutes);
app.use('/api/manhwa', manhwaRoutes);
app.use('/api/user-manhwa', userManhwaRoutes);
app.use('/api/admin', admin);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Mezame API running on ${PORT}`));