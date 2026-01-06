const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const { resolveManhwa, resolveManhwaCandidates, cleanTitle } = require('../lib/resolveManhwa');

const SIMILARITY_THRESHOLD = 0.65;
const CANDIDATE_LIMIT = 20;

// POST /api/checkpoints
// body: { manhwaTitle, chapter: { raw, number, slug }, currentUrl, selectedManhwaId, allowCreate }
router.post('/', verifyToken, async (req, res) => {
  const { manhwaTitle, chapter = {}, currentUrl, selectedManhwaId, allowCreate = false } = req.body;
  const userId = req.user.user_id;

  if (!manhwaTitle || !chapter || (chapter.number == null && !chapter.raw)) {
    return res.status(400).json({ success: false, message: 'Missing parameters' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    // if frontend gave an explicit selection, use it
    let resolvedId = selectedManhwaId || null;

    if (!resolvedId) {
      // try to find best match id
      const bestId = await resolveManhwa(manhwaTitle, SIMILARITY_THRESHOLD);
      if (bestId) {
        resolvedId = bestId;
      } else {
        // no confident single match -> fetch candidates list
        const candidates = await resolveManhwaCandidates(manhwaTitle, CANDIDATE_LIMIT);
        if (!candidates || candidates.length === 0) {
          // no candidates at all
          if (allowCreate) {
            // return 'create' so extension can POST /api/manhwa to create then re-call /checkpoints with selectedManhwaId
            return res.json({ success: true, action: 'create' });
          }
          return res.json({ success: true, action: 'create' });
        }

        // if best candidate >= threshold, resolve automatically
        if (candidates[0].score >= SIMILARITY_THRESHOLD) {
          resolvedId = candidates[0].manhwa_id;
        } else {
          // return truncated list for user selection
          return res.json({
            success: true,
            action: 'select',
            candidates: candidates.slice(0, 10).map(c => ({ manhwa_id: c.manhwa_id, title: c.title, original_title: c.original_title, score: c.score }))
          });
        }
      }
    }

    // resolvedId is defined -> upsert user_manhwa
    const [existing] = await conn.execute(
      `SELECT user_manhwa_id FROM user_manhwa WHERE user_id = ? AND manhwa_id = ? LIMIT 1`,
      [userId, resolvedId]
    );

    if (existing && existing.length) {
      await conn.execute(
        `UPDATE user_manhwa
         SET chapter_raw = ?, chapter_number = ?, chapter_slug = ?, source_url = ?, updated_at = NOW()
         WHERE user_manhwa_id = ?`,
        [chapter.raw || null, chapter.number || null, chapter.slug || null, currentUrl || null, existing[0].user_manhwa_id]
      );

      return res.json({
        success: true,
        action: 'updated',
        manhwaId: resolvedId,
        chapter: chapter.raw,
        chapter_number: chapter.number
      });
    } else {
      await conn.execute(
        `INSERT INTO user_manhwa
          (user_id, manhwa_id, chapter_raw, chapter_number, chapter_slug, source_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [userId, resolvedId, chapter.raw || null, chapter.number || null, chapter.slug || null, currentUrl || null]
      );

      return res.json({
        success: true,
        action: 'created_user_manhwa',
        manhwaId: resolvedId,
        chapter: chapter.raw,
        chapter_number: chapter.number
      });
    }

  } catch (err) {
    console.error('checkpoints route error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    if (conn) conn && conn.release();
  }
});

module.exports = router;
