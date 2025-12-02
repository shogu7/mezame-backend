const express = require('express');
const router = express.Router();
const pool = require('../../db');
const auth = require('../../middleware/auth');
const multer = require('multer');
const streamifier = require('streamifier');

const cloudinary = require('../cloudinary/config/cloudinary');

// TODO: Refactor entire db, cant read this guh ;-;

if (!cloudinary || !cloudinary.uploader) {
  console.error('Cloudinary is not configured correctly. Check ../../cloudinary/config/cloudinary.js export.');
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Format non supporté. Utilisez jpg, png, gif ou webp'));
  }
});

function getCloudinaryPublicIdFromUrl(url) {
  try {
    if (!url || typeof url !== 'string') return null;
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    let after = parts[1];
    after = after.replace(/^v\d+\//, '');
    const dot = after.lastIndexOf('.');
    if (dot !== -1) after = after.substring(0, dot);
    return after;
  } catch (e) {
    return null;
  }
}

router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [rows] = await pool.query(
      'SELECT user_id, username, profilePicture, bio, pinnedManhwa, created_at FROM user WHERE user_id = ?',
      [userId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'User not found' });

    const user = rows[0];

    // Parse pinnedManhwa safely
    let parsedPinnedManhwa = [];
    if (user.pinnedManhwa) {
      if (typeof user.pinnedManhwa === 'string') {
        try {
          parsedPinnedManhwa = JSON.parse(user.pinnedManhwa);
        } catch (e) {
          console.error('Failed to parse pinnedManhwa:', e);
        }
      } else if (Array.isArray(user.pinnedManhwa)) {
        parsedPinnedManhwa = user.pinnedManhwa;
      }
    }

    res.json({
      ok: true,
      user: {
        user_id: user.user_id,
        username: user.username,
        bio: user.bio,
        created_at: user.created_at,
        avatar_url: user.profilePicture || null,
        pinnedManhwa: parsedPinnedManhwa,
      },
    });
  } catch (err) {
    console.error('GET /me error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch('/me', auth, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { username, bio } = req.body;
    let pinnedManhwa = req.body.pinnedManhwa;
    if (pinnedManhwa && typeof pinnedManhwa !== 'string') {
      pinnedManhwa = JSON.stringify(pinnedManhwa);
    }

    let uploadedUrl = null;
    let newPublicId = null;

    if (req.file) {
      if (!cloudinary || !cloudinary.uploader) {
        throw new Error('Cloudinary not available on server (check config import).');
      }

      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'mezame/avatars',
            public_id: `avatar_${userId}_${Date.now()}`,
            resource_type: 'image',
            transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'auto' }],
            overwrite: true,
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              return reject(error);
            }
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });

      uploadedUrl = uploadResult.secure_url || null;
      newPublicId = uploadResult.public_id || null;

      const [[oldRow]] = await pool.query('SELECT profilePicture FROM user WHERE user_id = ?', [userId]);
      if (oldRow && oldRow.profilePicture && oldRow.profilePicture.includes('res.cloudinary.com')) {
        const oldPublicId = getCloudinaryPublicIdFromUrl(oldRow.profilePicture);
        if (oldPublicId) {
          try {
            await cloudinary.uploader.destroy(oldPublicId);
          } catch (e) {
            console.warn('Failed to destroy old Cloudinary image:', e);
          }
        }
      }
    }

    const fields = [];
    const params = [];
    if (username) { fields.push('username = ?'); params.push(username); }
    if (bio) { fields.push('bio = ?'); params.push(bio); }
    if (typeof pinnedManhwa !== 'undefined') { fields.push('pinnedManhwa = ?'); params.push(pinnedManhwa); }
    if (uploadedUrl) { fields.push('profilePicture = ?'); params.push(uploadedUrl); }

    if (!fields.length) return res.status(400).json({ ok: false, error: 'No data to update' });

    params.push(userId);
    await pool.query(`UPDATE user SET ${fields.join(', ')} WHERE user_id = ?`, params);

    const [[updated]] = await pool.query(
      'SELECT user_id, username, profilePicture, bio, pinnedManhwa FROM user WHERE user_id = ?',
      [userId]
    );

    // Parse pinnedManhwa safely
    let parsedPinnedManhwa = [];
    if (updated.pinnedManhwa) {
      if (typeof updated.pinnedManhwa === 'string') {
        try {
          parsedPinnedManhwa = JSON.parse(updated.pinnedManhwa);
        } catch (e) {
          console.error('Failed to parse pinnedManhwa:', e);
        }
      } else if (Array.isArray(updated.pinnedManhwa)) {
        parsedPinnedManhwa = updated.pinnedManhwa;
      }
    }

    res.json({
      ok: true,
      user: {
        user_id: updated.user_id,
        username: updated.username,
        bio: updated.bio,
        avatar_url: updated.profilePicture || null,
        pinnedManhwa: parsedPinnedManhwa,
      },
    });
  } catch (err) {
    console.error('PATCH /me error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const identifier = req.params.userId;
    let [user] = [];

    if (!isNaN(Number(identifier))) {
      [user] = await pool.query(
        'SELECT user_id, username, profilePicture, bio, pinnedManhwa, created_at FROM user WHERE user_id = ? LIMIT 1',
        [identifier]
      );
    } else {
      [user] = await pool.query(
        'SELECT user_id, username, profilePicture, bio, pinnedManhwa, created_at FROM user WHERE username = ? LIMIT 1',
        [identifier]
      );
    }

    if (!user || user.length === 0) return res.status(404).json({ ok: false, error: 'User not found' });

    const u = user[0];

    // Parse pinnedManhwa safely
    let parsedPinnedManhwa = [];
    if (u.pinnedManhwa) {
      if (typeof u.pinnedManhwa === 'string') {
        try {
          parsedPinnedManhwa = JSON.parse(u.pinnedManhwa);
        } catch (e) {
          console.error('Failed to parse pinnedManhwa:', e);
        }
      } else if (Array.isArray(u.pinnedManhwa)) {
        parsedPinnedManhwa = u.pinnedManhwa;
      }
    }

    res.json({
      ok: true,
      user: {
        user_id: u.user_id,
        username: u.username,
        avatar_url: u.profilePicture || null,
        bio: u.bio,
        pinnedManhwa: parsedPinnedManhwa,
        created_at: u.created_at,
      },
    });
  } catch (err) {
    console.error('GET /:userId error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:userId/library', async (req, res) => {
  try {
    const identifier = req.params.userId;
    let user;
    if (!isNaN(Number(identifier))) {
      [user] = await pool.query(
        'SELECT user_id, username FROM user WHERE user_id = ? LIMIT 1',
        [identifier]
      );
    } else {
      [user] = await pool.query(
        'SELECT user_id, username FROM user WHERE username = ? LIMIT 1',
        [identifier]
      );
    }

    if (!user || user.length === 0) return res.status(404).json({ ok: false, error: 'User not found' });

    const actualUserId = user[0].user_id;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize || '200', 10)));
    const offset = (page - 1) * pageSize;
    const search = (req.query.search || '').trim();

    const baseWhere = search
      ? `WHERE um.user_id = ? AND m.title LIKE ?`
      : `WHERE um.user_id = ?`;

    const sqlList = `
      SELECT m.manhwa_id AS id, m.title, m.original_title, m.description, m.release_date,
             m.total_chapters, m.total_seasons, m.cover_url, m.author, m.genres,
             um.user_manhwa_id, um.personal_status, um.current_chapter, um.current_season, um.note, um.added_at
      FROM user_manhwa um
      INNER JOIN manhwa m ON m.manhwa_id = um.manhwa_id
      ${baseWhere}
      ORDER BY um.added_at DESC
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM user_manhwa um
      INNER JOIN manhwa m ON m.manhwa_id = um.manhwa_id
      ${baseWhere}
    `;

    const listParams = search ? [actualUserId, `%${search}%`, pageSize, offset] : [actualUserId, pageSize, offset];
    const countParams = search ? [actualUserId, `%${search}%`] : [actualUserId];

    const [[countRow]] = await pool.query(countSql, countParams);
    const total = countRow ? Number(countRow.total) : 0;
    const [rows] = await pool.query(sqlList, listParams);

    const mapDbToFrontendStatus = (dbStatus) => {
      if (!dbStatus) return 'plan_to_read';
      switch (dbStatus.toLowerCase()) {
        case 'finished': return 'completed';
        case 'dropped': return 'dropped';
        case 'reading': return 'reading';
        case 'on_hold': return 'on_hold';
        case 'completed': return 'completed';
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

    res.json({ ok: true, total, page, pageSize, items });
  } catch (err) {
    console.error('GET /:userId/library error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;