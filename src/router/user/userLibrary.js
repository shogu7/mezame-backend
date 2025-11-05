const express = require('express');
const router = express.Router();
const pool = require('../../db');
const auth = require('../../middleware/auth');

router.use(auth);

function mapFrontendToDbStatus(front) {
  if (!front) return 'Neutral';
  switch (front) {
    case 'completed': return 'Finished';
    case 'dropped': return 'Dropped';
    case 'reading':
    case 'plan_to_read':
    case 'on_hold':
    default: return 'Neutral';
  }
}
function mapDbToFrontendStatus(dbStatus) {
  switch (dbStatus) {
    case 'Finished': return 'completed';
    case 'Dropped': return 'dropped';
    default: return 'plan_to_read';
  }
}
function getUserIdFromReq(req) {
  // accept payloads : { user_id }, { userId }, { id }
  return req.user?.user_id ?? req.user?.userId ?? req.user?.id ?? null;
}

router.get('/:manhwaId', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ ok: false, error: 'No user id in token' });

    const manhwaId = parseInt(req.params.manhwaId, 10);
    if (Number.isNaN(manhwaId)) return res.status(400).json({ ok: false, error: 'Invalid manhwa id' });

    const [rows] = await pool.query(
      'SELECT personal_status, current_chapter, note FROM user_manhwa WHERE user_id = ? AND manhwa_id = ? LIMIT 1',
      [userId, manhwaId]
    );

    if (rows.length === 0) return res.json({ ok: true, inLibrary: false });

    const row = rows[0];
    return res.json({
      ok: true,
      inLibrary: true,
      status: mapDbToFrontendStatus(row.personal_status),
      currentChapter: row.current_chapter ?? 0,
      rating: row.note ?? null
    });
  } catch (err) {
    console.error('GET /api/user/library error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ ok: false, error: 'No user id in token' });

    const manhwaId = parseInt(req.body.manhwa_id, 10);
    if (Number.isNaN(manhwaId)) return res.status(400).json({ ok: false, error: 'Invalid manhwa_id' });

    const frontendStatus = String(req.body.status ?? 'plan_to_read');
    const dbStatus = mapFrontendToDbStatus(frontendStatus);
    const currentChapter = req.body.current_chapter != null ? parseInt(req.body.current_chapter, 10) : 0;
    const note = req.body.rating != null && req.body.rating !== '' ? parseInt(req.body.rating, 10) : null;

    // check existing
    const [existing] = await pool.query(
      'SELECT user_manhwa_id FROM user_manhwa WHERE user_id = ? AND manhwa_id = ? LIMIT 1',
      [userId, manhwaId]
    );

    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO user_manhwa (user_id, manhwa_id, personal_status, current_chapter, note, added_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, manhwaId, dbStatus, isNaN(currentChapter) ? 0 : currentChapter, note]
      );
    } else {
      await pool.query(
        'UPDATE user_manhwa SET personal_status = ?, current_chapter = ?, note = ?, added_at = NOW() WHERE user_manhwa_id = ?',
        [dbStatus, isNaN(currentChapter) ? 0 : currentChapter, note, existing[0].user_manhwa_id]
      );
    }

    return res.json({
      ok: true,
      status: frontendStatus,
      currentChapter: isNaN(currentChapter) ? 0 : currentChapter,
      rating: note
    });
  } catch (err) {
    console.error('POST /api/user/library error', err);
    if (err && err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ ok: false, error: 'Foreign key constraint: user or manhwa does not exist' });
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE
router.delete('/:manhwaId', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ ok: false, error: 'No user id in token' });

    const manhwaId = parseInt(req.params.manhwaId, 10);
    if (Number.isNaN(manhwaId)) return res.status(400).json({ ok: false, error: 'Invalid manhwa id' });

    const [result] = await pool.query('DELETE FROM user_manhwa WHERE user_id = ? AND manhwa_id = ?', [userId, manhwaId]);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, error: 'Not in library' });

    return res.json({ ok: true, message: 'Removed from library' });
  } catch (err) {
    console.error('DELETE /api/user/library error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
