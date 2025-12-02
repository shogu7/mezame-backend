const express = require('express');
const router = express.Router();
const pool = require('../../db');
const auth = require('../../middleware/auth');

router.use(auth);

// frontend "plan_to_read" (neutral) -> store NULL in DB
function mapFrontendToDbStatus(front) {
  if (front === null || front === undefined) return null;
  const s = String(front).trim().toLowerCase();
  switch (s) {
    case 'completed':
    case 'completed':
      return 'Finished';
    case 'dropped':
      return 'Dropped';
    case 'reading':
      return 'Reading';
    case 'on_hold':
    case 'on hold':
    case 'onhold':
      return 'On_Hold';
    case 'plan_to_read':
    case 'plan to read':
    case 'plan':
    case '':
      return null; // neutral -> null in DB
    default:
      if (s === 'finished') return 'Finished';
      if (s === 'dropped') return 'Dropped';
      if (s === 'reading') return 'Reading';
      return null;
  }
}

// db -> frontend
function mapDbToFrontendStatus(dbStatus) {
  if (dbStatus === null || dbStatus === undefined) return 'plan_to_read';
  const s = String(dbStatus).trim().toLowerCase();
  if (s === '' || s === 'null' || s === 'neutral') return 'plan_to_read';

  if (s === 'finished') return 'completed';
  if (s === 'dropped') return 'dropped';
  if (s === 'reading') return 'reading';
  if (s === 'plan_to_read' || s === 'plan to read') return 'plan_to_read';
  if (s === 'on_hold' || s === 'on hold') return 'on_hold';

  if (s === 'finished') return 'completed';
  if (s === 'on_hold') return 'on_hold';

  return 'plan_to_read';
}

function getUserIdFromReq(req) {
  // accept payloads : { user_id }, { userId }, { id }
  return req.user?.user_id ?? req.user?.userId ?? req.user?.id ?? null;
}

// GET single manhwa details with user library info
router.get('/:manhwaId', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ ok: false, error: 'No user id in token' });

    const manhwaId = parseInt(req.params.manhwaId, 10);
    if (Number.isNaN(manhwaId)) return res.status(400).json({ ok: false, error: 'Invalid manhwa id' });

    const [rows] = await pool.query(
      `SELECT m.manhwa_id, m.title, m.original_title, m.description, m.release_date, m.total_chapters,
              m.total_seasons, m.cover_url, m.author, m.genres,
              um.personal_status, um.current_chapter, um.note
       FROM manhwa m
       LEFT JOIN user_manhwa um ON um.manhwa_id = m.manhwa_id AND um.user_id = ?
       WHERE m.manhwa_id = ? LIMIT 1`,
      [userId, manhwaId]
    );

    if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Manhwa not found' });

    const row = rows[0];

    // treat 'neutral' or empty as null
    const raw = row.personal_status;
    const normalizedDbStatus = raw && String(raw).trim().toLowerCase() !== 'neutral' ? raw : null;

    return res.json({
      ok: true,
      id: row.manhwa_id,
      title: row.title,
      originalTitle: row.original_title,
      description: row.description,
      releaseDate: row.release_date,
      totalChapters: row.total_chapters,
      totalSeasons: row.total_seasons,
      coverUrl: row.cover_url,
      author: row.author,
      genres: row.genres ? row.genres.split(',').map(g => g.trim()) : [],
      inLibrary: normalizedDbStatus !== null,
      status: mapDbToFrontendStatus(normalizedDbStatus),
      currentChapter: row.current_chapter ?? 0,
      rating: row.note ?? null
    });
  } catch (err) {
    console.error('GET /api/user/library/:manhwaId error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST create/update user's library entry
router.post('/', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ ok: false, error: 'No user id in token' });

    const manhwaId = parseInt(req.body.manhwa_id, 10);
    if (Number.isNaN(manhwaId)) return res.status(400).json({ ok: false, error: 'Invalid manhwa_id' });

    const frontendStatus = req.body.status ?? 'plan_to_read';
    const dbStatus = mapFrontendToDbStatus(frontendStatus);
    const currentChapter = req.body.current_chapter != null ? parseInt(req.body.current_chapter, 10) : 0;
    const note = req.body.rating != null && req.body.rating !== '' ? parseInt(req.body.rating, 10) : null;

    const [existing] = await pool.query(
      'SELECT user_manhwa_id FROM user_manhwa WHERE user_id = ? AND manhwa_id = ? LIMIT 1',
      [userId, manhwaId]
    );

    const isNeutralNoData = dbStatus === null && (isNaN(currentChapter) ? 0 : currentChapter) === 0 && note == null;

    if (existing.length === 0) {
      if (isNeutralNoData) {
        // nothing to store (user wants plan_to_read with no data)
        return res.json({
          ok: true,
          status: mapDbToFrontendStatus(null),
          currentChapter: 0,
          rating: null,
          message: 'No entry created for neutral status'
        });
      }

      await pool.query(
        'INSERT INTO user_manhwa (user_id, manhwa_id, personal_status, current_chapter, note, added_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, manhwaId, dbStatus, isNaN(currentChapter) ? 0 : currentChapter, note]
      );

      return res.json({
        ok: true,
        status: mapDbToFrontendStatus(dbStatus),
        currentChapter: isNaN(currentChapter) ? 0 : currentChapter,
        rating: note
      });
    } else {
      const userManhwaId = existing[0].user_manhwa_id;

      if (isNeutralNoData) {
        // remove entry if user goes back to neutral and there's no data to keep
        await pool.query('DELETE FROM user_manhwa WHERE user_manhwa_id = ?', [userManhwaId]);
        return res.json({
          ok: true,
          status: mapDbToFrontendStatus(null),
          currentChapter: 0,
          rating: null,
          message: 'Removed from library'
        });
      }

      await pool.query(
        'UPDATE user_manhwa SET personal_status = ?, current_chapter = ?, note = ?, added_at = NOW() WHERE user_manhwa_id = ?',
        [dbStatus, isNaN(currentChapter) ? 0 : currentChapter, note, userManhwaId]
      );

      return res.json({
        ok: true,
        status: mapDbToFrontendStatus(dbStatus),
        currentChapter: isNaN(currentChapter) ? 0 : currentChapter,
        rating: note
      });
    }
  } catch (err) {
    console.error('POST /api/user/library error', err);
    if (err && err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ ok: false, error: 'Foreign key constraint: user or manhwa does not exist' });
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
});

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
