const express = require('express');
const router = express.Router();
const pool = require('../db'); 

// GET /api/manhwa/latest - Récupère les derniers manhwa ajoutés
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

// GET /api/manhwa - Récupère tous les manhwa
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM manhwa ORDER BY manhwa_id DESC LIMIT 100');
    res.json({ ok: true, manhwa: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/manhwa/:id - Récupère un manhwa par ID
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

// POST /api/manhwa - Crée un nouveau manhwa
router.post('/', async (req, res) => {
  try {
    const { 
      title, 
      original_title, 
      description, 
      release_date, 
      total_chapters, 
      total_seasons,
      cover_url  // ← Nouveau champ
    } = req.body;

    // Validation basique
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

// PUT /api/manhwa/:id - Met à jour un manhwa
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

// DELETE /api/manhwa/:id - Supprime un manhwa
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

module.exports = router;