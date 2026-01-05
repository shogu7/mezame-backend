const express = require('express');
const router = express.Router();
const pool = require('../db');
const { resolveManhwaCandidates } = require('../lib/resolveManhwa');

// get lasted manhwa added
router.get('/latest', async (req, res) => {
  console.log('🔍 /latest endpoint hit!');
  console.log('Query params:', req.query);

  try {
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '6', 10)));
    console.log('📊 Using limit:', limit);

    const query = `
      SELECT *
      FROM manhwa
      ORDER BY manhwa_id DESC
      LIMIT ?
    `;
    const [rows] = await pool.query(query, [limit]);

    console.log('✅ Found rows:', rows.length);

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    return res.json({ items: rows });
  } catch (err) {
    console.error('❌ GET /api/manhwa/latest error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// get all the manhwa
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM manhwa ORDER BY manhwa_id DESC LIMIT 100');
    res.json({ ok: true, manhwa: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// get the manhwa with an id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM manhwa WHERE manhwa_id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Manhwa not found' });
    }
    res.json({ ok: true, manhwa: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// create a new manhwa, mainly work with the ../script/loadManhwa.js using which using a static json to work 
router.post('/', async (req, res) => {
  try {
    const {
      title,
      original_title,
      description,
      release_date,
      total_chapters,
      total_seasons,
      cover_url
    } = req.body;

    if (!title) {
      return res.status(400).json({ ok: false, error: 'Title is required' });
    }

    const [result] = await pool.query(
      `INSERT INTO manhwa 
       (title, original_title, description, release_date, total_chapters, total_seasons, cover_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, original_title, description, release_date, total_chapters, total_seasons, cover_url]
    );

    res.status(201).json({
      ok: true,
      manhwa_id: result.insertId,
      message: 'Manhwa created successfully'
    });
  } catch (err) {
    console.error('❌ POST /api/manhwa error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// put: update information of a manhwa mainly work with /script/uploadCover.js. 
// Plan to integrate it in the front
router.put('/:id', async (req, res) => {
  try {
    const {
      title,
      original_title,
      description,
      release_date,
      total_chapters,
      total_seasons,
      cover_url
    } = req.body;

    const [result] = await pool.query(
      `UPDATE manhwa 
       SET title = ?, 
           original_title = ?, 
           description = ?, 
           release_date = ?, 
           total_chapters = ?, 
           total_seasons = ?,
           cover_url = ?
       WHERE manhwa_id = ?`,
      [title, original_title, description, release_date, total_chapters, total_seasons, cover_url, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Manhwa not found' });
    }

    res.json({ ok: true, message: 'Manhwa updated successfully' });
  } catch (err) {
    console.error('❌ PUT /api/manhwa/:id error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// delete an manhwa in the database mainly work in the admin panel -> library
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM manhwa WHERE manhwa_id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Manhwa not found' });
    }

    res.json({ ok: true, message: 'Manhwa deleted successfully' });
  } catch (err) {
    console.error('❌ DELETE /api/manhwa/:id error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/manhwa/resolve?q=...
// Retourne candidats fuzzy pour un titre

router.get('/resolve', async (req, res) => {
  try {
    const q = (req.query.q || req.query.query || '').toString().trim();
    if (!q) return res.status(400).json({ ok: false, error: 'Query parameter q is required' });

    const candidates = await resolveManhwaCandidates(q, 50);
    // map to lighter shape
    const out = candidates.map(c => ({ manhwa_id: c.manhwa_id, title: c.title, original_title: c.original_title, score: c.score }));
    return res.json({ ok: true, candidates: out });
  } catch (err) {
    console.error('GET /api/manhwa/resolve error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;