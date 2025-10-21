const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT user_id, username, email, created_at, is_admin FROM user');
    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
});

// del user
router.delete('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok:false, message:'Invalid id' });
    await pool.query('DELETE FROM user WHERE user_id = ?', [id]);
    res.json({ ok:true });
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
});

// manage user
router.patch('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { is_admin, banned } = req.body;
    if (typeof is_admin !== 'undefined') {
      await pool.query('UPDATE user SET is_admin = ? WHERE user_id = ?', [is_admin ? 1 : 0, id]);
    }
    res.json({ ok:true });
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
});

module.exports = router;
