const express = require('express');
const router = express.Router();
const pool = require('../db'); 

router.get('/latest', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '6', 10)));
    const query = `
      SELECT *
      FROM manhwa
      ORDER BY COALESCE(release_date, created_at, id) DESC
      LIMIT ?
    `;
    const [rows] = await pool.query(query, [limit]);

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    return res.json({ items: rows });
  } catch (err) {
    console.error('GET /api/manhwas/latest error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM manhwa LIMIT 100');
    res.json({ ok: true, manhwa: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { title, original_title, description, release_date, total_chapters, total_seasons } = req.body;
  const [r] = await pool.query(
    `INSERT INTO manhwa (title, original_title, description, release_date, total_chapters, total_seasons)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, original_title, description, release_date, total_chapters, total_seasons]
  );
  res.status(201).json({ ok:true, manhwa_id: r.insertId });
});

module.exports = router;
