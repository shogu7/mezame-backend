require('dotenv').config(); 
const { Sequelize, DataTypes } = require('sequelize');

// Sequelize connect with env 
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
  }
);

console.log('TEST DB_USER:', process.env.DB_USER); 

module.exports = { sequelize, Manhwa: require('./manhwa')(sequelize, DataTypes) };
