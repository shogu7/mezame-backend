const express = require('express');
const router = express.Router();
const pool = require('../../db');
const auth = require('../../middleware/auth'); 


// get user profile information
router.get('/:userId', async (req, res) => {
  try {
    const identifier = req.params.userId;
    let user;

    if (!isNaN(Number(identifier))) {
      [user] = await pool.query(
        'SELECT user_id, username, created_at FROM user WHERE user_id = ? LIMIT 1',
        [identifier]
      );
    } else {
      [user] = await pool.query(
        'SELECT user_id, username, created_at FROM user WHERE username = ? LIMIT 1',
        [identifier]
      );
    }

    if (!user || user.length === 0) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const u = user[0];

    return res.json({
      ok: true,
      user: {
        user_id: u.user_id,
        username: u.username,
        created_at: u.created_at,
        avatar_url: null, // TODO: Add avatar_url column to user table
      },
    });
  } catch (err) {
    console.error('GET /api/user/:userId error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// get a specific user's manhwa library
router.get('/:userId/library', async (req, res) => {
  try {
    const identifier = req.params.userId;
    let user;

    if (!isNaN(Number(identifier))) {
      [user] = await pool.query(
        'SELECT user_id, username, created_at FROM user WHERE user_id = ? LIMIT 1',
        [identifier]
      );
    } else {
      [user] = await pool.query(
        'SELECT user_id, username, created_at FROM user WHERE username = ? LIMIT 1',
        [identifier]
      );
    }

    if (!user || user.length === 0) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const actualUserId = user[0].user_id;

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize || '200', 10)));
    const offset = (page - 1) * pageSize;
    const search = (req.query.search || '').trim();

    const baseWhere = search
      ? `WHERE um.user_id = ? AND m.title LIKE ?`
      : `WHERE um.user_id = ?`;

    // SQL for manhwa list
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
        m.author,
        m.genres,
        um.user_manhwa_id,
        um.personal_status,
        um.current_chapter,
        um.current_season,
        um.note,
        um.added_at
      FROM user_manhwa um
      INNER JOIN manhwa m ON m.manhwa_id = um.manhwa_id
      ${baseWhere}
      ORDER BY um.added_at DESC
      LIMIT ? OFFSET ?
    `;

    // SQL for count
    const countSql = `
      SELECT COUNT(*) AS total
      FROM user_manhwa um
      INNER JOIN manhwa m ON m.manhwa_id = um.manhwa_id
      ${baseWhere}
    `;

    // Parameters
    const listParams = search
      ? [actualUserId, `%${search}%`, pageSize, offset]
      : [actualUserId, pageSize, offset];

    const countParams = search ? [actualUserId, `%${search}%`] : [actualUserId];

    const [[countRow]] = await pool.query(countSql, countParams);
    const total = countRow ? Number(countRow.total) : 0;

    const [rows] = await pool.query(sqlList, listParams);

    const mapDbToFrontendStatus = (dbStatus) => {
      switch (dbStatus) {
        case 'Finished': return 'completed';
        case 'Dropped': return 'dropped';
        case 'reading': return 'reading';
        case 'on_hold': return 'on_hold';
        case 'completed': return 'completed';
        case 'plan_to_read':
        default: return 'plan_to_read';
      }
    };

    const items = rows.map(r => ({
      id: r.id,
      title: r.title,
      originalTitle: r.original_title,
      description: r.description,
      releaseDate: r.release_date,
      totalChapters: r.total_chapters != null ? Number(r.total_chapters) : null,
      totalSeasons: r.total_seasons != null ? Number(r.total_seasons) : null,
      coverUrl: r.cover_url,
      status: mapDbToFrontendStatus(r.personal_status),
      currentChapter: r.current_chapter != null ? Number(r.current_chapter) : 0,
      currentSeason: r.current_season != null ? Number(r.current_season) : 1,
      rating: r.note != null ? Number(r.note) : null,
      addedAt: r.added_at,
      author: r.author,
      genres: r.genres ? r.genres.split(',').map(g => g.trim()) : [],
    }));

    return res.json({ ok: true, total, page, pageSize, items });
  } catch (err) {
    console.error('GET /api/user/:userId/library error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
