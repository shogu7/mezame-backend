const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');


router.post('/', auth, async (req, res) => {
  const user_id = req.user.user_id;
  const { manhwa_id, current_chapter = 0, current_season = 1, personal_status = 'Neutral', note = null } = req.body;
  const [r] = await pool.query(
    `INSERT INTO user_manhwa (user_id, manhwa_id, current_chapter, current_season, personal_status, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, manhwa_id, current_chapter, current_season, personal_status, note]
  );
  res.status(201).json({ ok:true, user_manhwa_id: r.insertId });
});

router.put('/:id', auth, async (req, res) => {
  const user_id = req.user.user_id;
  const id = req.params.id;
  const { current_chapter, personal_status, current_season, note } = req.body;

  const [rows] = await pool.query('SELECT * FROM user_manhwa WHERE user_manhwa_id = ? AND user_id = ?', [id, user_id]);
  if (!rows.length) return res.status(404).json({ ok:false, message:'Not found' });

  await pool.query(
    `UPDATE user_manhwa SET current_chapter = COALESCE(?, current_chapter),
                            current_season = COALESCE(?, current_season),
                            personal_status = COALESCE(?, personal_status),
                            note = COALESCE(?, note)
     WHERE user_manhwa_id = ?`,
    [current_chapter, current_season, personal_status, note, id]
  );
  res.json({ ok:true });
});

router.get('/me', auth, async (req, res) => {
  const user_id = req.user.user_id;
  const [rows] = await pool.query(
    `SELECT um.user_manhwa_id, m.manhwa_id, m.title, um.current_chapter, um.current_season, um.personal_status, um.note
     FROM user_manhwa um
     JOIN manhwa m ON um.manhwa_id = m.manhwa_id
     WHERE um.user_id = ?`,
    [user_id]
  );
  res.json(rows);
});

router.get('/', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT user_id, username, email, is_admin, created_at FROM user'); // sendin back all info for admin panel
    res.json({ ok: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
