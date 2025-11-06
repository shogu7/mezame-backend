const express = require('express');
const router = express.Router();
const pool = require('../../db');
const auth = require('../../middleware/auth');

router.use(auth);

function mapDbToFrontendStatus(dbStatus) {
  if (!dbStatus) return 'plan_to_read';
  switch (dbStatus) {
    case 'Finished': return 'completed';
    case 'Dropped':  return 'dropped';
    case 'reading':  return 'reading';
    case 'on_hold':  return 'on_hold';
    case 'plan_to_read':
    default:         return 'plan_to_read';
  }
}

function mapFrontendToDbStatus(front) {
  if (!front) return 'plan_to_read';
  switch (front) {
    case 'completed': return 'completed';
    case 'dropped': return 'dropped';
    case 'reading': return 'reading';
    case 'on_hold': return 'on_hold';
    case 'plan_to_read':
    default: return 'plan_to_read';
  }
}

function getUserIdFromReq(req) {
  return req.user?.user_id ?? req.user?.userId ?? req.user?.id ?? null;
}

/**
 * GET /api/user/library
 * Query params:
 *  - page (default 1)
 *  - pageSize (default 50, max 200)
 *  - search (optional, searches title)
 *
 * Returns: { ok: true, total, page, pageSize, items: [...] }
 */
router.get('/', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ ok: false, error: 'No user id in token' });

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize || '50', 10)));
    const offset = (page - 1) * pageSize;
    const search = (req.query.search || '').trim();

    // WHERE clause
    const baseWhere = search
      ? `WHERE (um.user_id IS NOT NULL OR uf.user_id IS NOT NULL) AND m.title LIKE ?`
      : `WHERE (um.user_id IS NOT NULL OR uf.user_id IS NOT NULL)`;

    // SQL pour la liste des manhwa
    const sqlList = `
    SELECT
        m.manhwa_id AS id,
        m.title,
        m.original_title,
        m.description,
        m.release_date,
        m.total_chapters,
        m.total_seasons,
        m.cover_url,
        m.author,        -- <-- ajouté
        m.genres,        -- <-- ajouté
        ANY_VALUE(um.user_manhwa_id) AS user_manhwa_id,
        ANY_VALUE(um.personal_status) AS personal_status,
        ANY_VALUE(um.current_chapter) AS current_chapter,
        ANY_VALUE(um.current_season) AS current_season,
        ANY_VALUE(um.note) AS note,
        CASE WHEN MAX(uf.user_follow_id) IS NULL THEN 0 ELSE 1 END AS is_following,
        COALESCE(MAX(um.added_at), MAX(uf.created_at), m.manhwa_id) AS linked_at
    FROM manhwa m
    LEFT JOIN user_manhwa um ON um.manhwa_id = m.manhwa_id AND um.user_id = ?
    LEFT JOIN user_follow uf ON uf.manhwa_id = m.manhwa_id AND uf.user_id = ?
    ${baseWhere}
    GROUP BY m.manhwa_id
    ORDER BY linked_at DESC, m.title ASC
    LIMIT ? OFFSET ?
    `;


    // SQL pour compter le total
    const countSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT m.manhwa_id
        FROM manhwa m
        LEFT JOIN user_manhwa um ON um.manhwa_id = m.manhwa_id AND um.user_id = ?
        LEFT JOIN user_follow uf ON uf.manhwa_id = m.manhwa_id AND uf.user_id = ?
        ${baseWhere}
        GROUP BY m.manhwa_id
      ) t
    `;

    // Paramètres
    const listParams = [];
    const countParams = [];

    if (search) {
      const like = `%${search}%`;
      listParams.push(userId, userId, like, pageSize, offset);
      countParams.push(userId, userId, like);
    } else {
      listParams.push(userId, userId, pageSize, offset);
      countParams.push(userId, userId);
    }

    const [[countRow]] = await pool.query(countSql, countParams);
    const total = countRow ? Number(countRow.total) : 0;

    const [rows] = await pool.query(sqlList, listParams);

    const items = rows.map(r => {
      const inLibrary = r.user_manhwa_id != null;
      const currentChapter = r.current_chapter != null ? Number(r.current_chapter) : 0;
      return {
        id: r.id,
        title: r.title,
        originalTitle: r.original_title,
        description: r.description,
        releaseDate: r.release_date,
        totalChapters: r.total_chapters != null ? Number(r.total_chapters) : null,
        totalSeasons: r.total_seasons != null ? Number(r.total_seasons) : null,
        coverUrl: r.cover_url,
        inLibrary: Boolean(inLibrary),
        isFollowing: Boolean(r.is_following),
        status: mapDbToFrontendStatus(r.personal_status),
        currentChapter,
        currentSeason: r.current_season != null ? Number(r.current_season) : 1,
        rating: r.note != null ? Number(r.note) : null,
        linkedAt: r.linked_at,
        raw: r,
        author: r.author,      
        genres: r.genres ? r.genres.split(',').map(g => g.trim()) : [],
      };
    });

    return res.json({ ok: true, total, page, pageSize, items });
  } catch (err) {
    console.error('GET /api/user/library error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Existing endpoint: get single manhwa status
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
    console.error('GET /api/user/library/:manhwaId error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Add or update library entry
router.post('/', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ ok: false, error: 'No user id in token' });

    const manhwaId = parseInt(req.body.manhwa_id, 10);
    if (Number.isNaN(manhwaId)) return res.status(400).json({ ok: false, error: 'Invalid manhwa_id' });

    const frontendStatus = String(req.body.status ?? 'plan_to_read');
    const dbStatus = mapFrontendToDbStatus(frontendStatus);
    const currentChapter = req.body.current_chapter != null ? parseInt(req.body.current_chapter, 10) : 0;
    const currentSeason = req.body.current_season != null ? parseInt(req.body.current_season, 10) : 1;
    const note = req.body.rating != null && req.body.rating !== '' ? parseInt(req.body.rating, 10) : null;

    // check existing
    const [existing] = await pool.query(
      'SELECT user_manhwa_id FROM user_manhwa WHERE user_id = ? AND manhwa_id = ? LIMIT 1',
      [userId, manhwaId]
    );

    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO user_manhwa (user_id, manhwa_id, personal_status, current_chapter, current_season, note, added_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [userId, manhwaId, dbStatus, isNaN(currentChapter) ? 0 : currentChapter, isNaN(currentSeason) ? 1 : currentSeason, note]
      );
    } else {
      await pool.query(
        'UPDATE user_manhwa SET personal_status = ?, current_chapter = ?, current_season = ?, note = ?, added_at = NOW() WHERE user_manhwa_id = ?',
        [dbStatus, isNaN(currentChapter) ? 0 : currentChapter, isNaN(currentSeason) ? 1 : currentSeason, note, existing[0].user_manhwa_id]
      );
    }

    return res.json({
      ok: true,
      status: frontendStatus,
      currentChapter: isNaN(currentChapter) ? 0 : currentChapter,
      currentSeason: isNaN(currentSeason) ? 1 : currentSeason,
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

// DELETE library entry
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
    console.error('DELETE /api/user/library/:manhwaId error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Follow (idempotent)
router.post('/follow', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ ok: false, error: 'No user id in token' });

    const manhwaId = parseInt(req.body.manhwa_id, 10);
    if (Number.isNaN(manhwaId)) return res.status(400).json({ ok: false, error: 'Invalid manhwa_id' });

    await pool.query('INSERT IGNORE INTO user_follow (user_id, manhwa_id) VALUES (?, ?)', [userId, manhwaId]);
    return res.json({ ok: true, isFollowing: true });
  } catch (err) {
    console.error('POST /api/user/library/follow error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Unfollow
router.delete('/follow/:manhwaId', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ ok: false, error: 'No user id in token' });

    const manhwaId = parseInt(req.params.manhwaId, 10);
    if (Number.isNaN(manhwaId)) return res.status(400).json({ ok: false, error: 'Invalid manhwa id' });

    await pool.query('DELETE FROM user_follow WHERE user_id = ? AND manhwa_id = ?', [userId, manhwaId]);
    return res.json({ ok: true, isFollowing: false });
  } catch (err) {
    console.error('DELETE /api/user/library/follow/:manhwaId error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
