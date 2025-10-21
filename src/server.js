require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const app = express();

app.use(express.json());
app.use(cors()); 

const authRoutes = require('./router/auth');
const manhwaRoutes = require('./router/manhwa');
const userManhwaRoutes = require('./router/userManhwa');
const admin = require('./router/admin'); // intialise admin api part

app.use('/api/auth', authRoutes);
app.use('/api/manhwa', manhwaRoutes);
app.use('/api/user-manhwa', userManhwaRoutes);
app.use('/api/admin', admin);


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Mezame API running on ${PORT}`));
