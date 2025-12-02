const express = require('express');
const router = express.Router();
// const pool = require('../db');
const pool = require('../db.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';


// register the user, avoid dupe and invalid things 
router.post('/register', async (req, res) => {
  console.log('Register request received:', req.body);
    try {
    const { username, email, password } = req.body;
    const [existing] =  await pool.query( // NO DUPE CHECK
        'SELECT user_id FROM user WHERE username = ? OR email = ?',
        [username, email]
        );
    if (existing.length > 0) {
        return res.status(400).json({ ok: false, error: 'Username or email already exists' });
        }
    const hash = await bcrypt.hash(password, 10);
    const [resInsert] = await pool.query(
      'INSERT INTO user (username, email, password) VALUES (?, ?, ?)',
      [username, email, hash]
    );
    res.status(201).json({ ok: true, user_id: resInsert.insertId });
  } catch (err) {
    console.error(err);
    res.status(400).json({ ok: false, error: err.code || err.message });
  }
});

// login part, request to the db username and password 
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const [rows] = await pool.query(
      'SELECT user_id, username, password, is_admin FROM user WHERE email = ? OR username = ?',
      [identifier, identifier]
    ); // request to email and username
    if (!rows.length) {
        console.log("Username/email not found in the db"); // debug
        return res.status(401).json({ ok:false, message:'User not found' });    
    }   

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        console.log("Wrong password access deny"); // debug
        return res.status(401).json({ ok:false, message:'Wrong password'} );
    }

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ ok: true, token });
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
});

module.exports = router;
