const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const JSON_PATH = path.resolve(__dirname, '../data/manhwa.json');
const BATCH_SIZE = 25;

function safeStrArray(v) {
    if (!v) return null;
    if (Array.isArray(v)) return v.join(',');
    if (typeof v === 'string') return v;
    return String(v);
}

function toDateOrNull(d) {
    if (!d) return null;
    const dt = new Date(d);
    if (isNaN(dt)) return null;
    return dt.toISOString().slice(0, 10);
}

async function upsertBatch(conn, batch) {
    await conn.beginTransaction();
    try {
        for (const m of batch) {
            const title = m.title || null;
            const original_title = m.original_title || null;
            const description = m.description || null;
            const release_date = toDateOrNull(m.release_date);
            const total_chapters = Number.isInteger(m.total_chapters) ? m.total_chapters : (m.total_chapters ? Number(m.total_chapters) : null);
            const total_seasons = Number.isInteger(m.total_seasons) ? m.total_seasons : (m.total_seasons ? Number(m.total_seasons) : null);
            const cover_url = m.cover_url || null;
            const author = m.author || null;
            const genres = safeStrArray(m.genres);
            const source_name = m.source_name || null;
            const source_id = m.source_id ? String(m.source_id) : null;
            const status = m.status || null;
            const updated_at = m.updated_at ? new Date(m.updated_at).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ');

            let existing = null;
            if (source_name && source_id) {
                const [rows] = await conn.execute(
                    `SELECT manhwa_id FROM manhwa WHERE source_name = ? AND source_id = ? LIMIT 1`,
                    [source_name, source_id]
                );
                if (rows.length) existing = rows[0];
            }
            if (!existing) {
                const [rows] = await conn.execute(
                    `SELECT manhwa_id FROM manhwa WHERE title = ? OR original_title = ? LIMIT 1`,
                    [title, original_title]
                );
                if (rows.length) existing = rows[0];
            }

            if (existing && existing.manhwa_id) {
                await conn.execute(
                    `UPDATE manhwa SET
            title = ?,
            original_title = ?,
            description = ?,
            release_date = ?,
            total_chapters = ?,
            total_seasons = ?,
            cover_url = ?,
            author = ?,
            genres = ?,
            source_name = ?,
            source_id = ?,
            status = ?,
            updated_at = ?
          WHERE manhwa_id = ?`,
                    [title, original_title, description, release_date, total_chapters, total_seasons, cover_url, author, genres, source_name, source_id, status, updated_at, existing.manhwa_id]
                );
            } else {
                await conn.execute(
                    `INSERT INTO manhwa
            (title, original_title, description, release_date, total_chapters, total_seasons, cover_url, author, genres, source_name, source_id, status, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [title, original_title, description, release_date, total_chapters, total_seasons, cover_url, author, genres, source_name, source_id, status, updated_at]
                );
            }
        }
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    }
}

async function main() {
    if (!fs.existsSync(JSON_PATH)) {
        console.error('manhwa.json introuvable:', JSON_PATH);
        process.exit(1);
    }
    if (!process.env.DB_NAME) {
        console.error('ERREUR: DB_NAME non défini dans .env');
        process.exit(1);
    }
    const raw = fs.readFileSync(JSON_PATH, 'utf-8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (err) {
        console.error('JSON invalide:', err.message);
        process.exit(1);
    }
    if (!Array.isArray(data)) {
        console.error('Le JSON doit être un tableau de manhwa');
        process.exit(1);
    }
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME,
        charset: 'utf8mb4'
    });
    console.log(`Connected to DB: ${process.env.DB_NAME}. Importing ${data.length} entries in batches of ${BATCH_SIZE}`);
    try {
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            await upsertBatch(conn, batch);
            console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} (${i}..${i + batch.length - 1}) committed`);
        }
        console.log('Import terminé.');
    } catch (err) {
        console.error('Import fatal:', err);
        process.exit(1);
    } finally {
        await conn.end();
    }
}

main().catch((e) => {
    console.error('Unhandled import error:', e);
    process.exit(1);
});
