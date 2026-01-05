// src/lib/resolveManhwa.js
const slugify = require('slugify');
const stringSimilarity = require('string-similarity');
const pool = require('../db');

const STOPWORDS = new Set([
    'the', 'a', 'an', 'of', 'in', 'on', 'at', 'and', 'or', 'to', 'for', 'with', 'by', 'after', 'before', 'from', 'is', 'are', 'was', 'were', 'this', 'that'
]);

function cleanTitle(raw) {
    if (!raw) return null;
    let s = String(raw);

    s = s.replace(/(?:chapter|chapitre|ch|ep|episode)[\s.:_-]*\d+(?:\.\d+)?/ig, '');
    s = s.replace(/\b(asura[-\s]*scans|asurascans|asura[-\s]*scan|mangadex|webtoons|raw|scanlation|scan|scans|chapterhub)\b/ig, '');
    s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
    s = s.replace(/[\/_]+/g, ' ');
    s = s.replace(/[^\p{L}\p{N}\s'\-]+/gu, ' ');
    s = s.replace(/\s{2,}/g, ' ').trim();

    return s || null;
}

function normalizeText(s) {
    return s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function tokenize(s) {
    if (!s) return [];
    return normalizeText(s)
        .split(/\s+/)
        .map(t => t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
        .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

function extractNumbers(s) {
    if (!s) return [];
    const nums = [];
    const re = /\d{1,3}(?:[,\u00A0]\d{3})*(?:\.\d+)?|\d+/g;
    let m;
    while ((m = re.exec(s)) !== null) {
        nums.push(m[0].replace(/[,\s\u00A0]/g, ''));
    }
    return nums;
}

function tokenJaccard(aTokens, bTokens) {
    const A = new Set(aTokens);
    const B = new Set(bTokens);
    if (!A.size && !B.size) return 1;
    if (!A.size || !B.size) return 0;
    let inter = 0;
    for (const t of A) if (B.has(t)) inter++;
    return inter / new Set([...A, ...B]).size;
}

function tokenFuzzyScore(aTokens, bTokens, threshold = 0.7) {
    if (!aTokens.length || !bTokens.length) return 0;
    let matches = 0;
    for (const a of aTokens) {
        let best = 0;
        for (const b of bTokens) best = Math.max(best, stringSimilarity.compareTwoStrings(a, b));
        if (best >= threshold) matches++;
    }
    return matches / Math.max(aTokens.length, bTokens.length);
}

async function fetchCandidates(conn, limit = 500) {
    const safeLimit = Number(limit) || 500;
    const [rows] = await conn.execute('SELECT manhwa_id, title, original_title FROM manhwa LIMIT ?', [safeLimit]);
    return rows || [];
}

function computeScoreForPair(cleanA, cleanB) {
    const seqScore = stringSimilarity.compareTwoStrings(cleanA.toLowerCase(), cleanB.toLowerCase());
    const slugScore = stringSimilarity.compareTwoStrings(
        slugify(cleanA, { lower: true, strict: true }),
        slugify(cleanB, { lower: true, strict: true })
    );

    const tokensA = tokenize(cleanA);
    const tokensB = tokenize(cleanB);
    const jaccard = tokenJaccard(tokensA, tokensB);
    const fuzzyTokens = tokenFuzzyScore(tokensA, tokensB, 0.68);

    const numsA = extractNumbers(cleanA).map(n => n.replace(/^0+/, '') || '0');
    const numsB = extractNumbers(cleanB).map(n => n.replace(/^0+/, '') || '0');
    let numericBoost = 0;
    if (numsA.length && numsB.length && numsA.some(n => numsB.includes(n))) numericBoost = 0.15;

    const final = Math.min(1, Math.max(seqScore, slugScore, jaccard, fuzzyTokens) + numericBoost);
    return { final, breakdown: { seqScore, slugScore, jaccard, fuzzyTokens, numericBoost } };
}

async function resolveManhwa(rawTitle, similarityThreshold = 0.65) {
    if (!rawTitle) return null;
    const cleanedTitle = cleanTitle(rawTitle);
    if (!cleanedTitle) return null;

    let conn;
    try {
        conn = await pool.getConnection();
        const candidates = await fetchCandidates(conn, 500);
        if (!candidates.length) return null;

        let best = { manhwa_id: null, score: 0 };
        for (const c of candidates) {
            const cleanedCand = cleanTitle(c.title || c.original_title || '');
            if (!cleanedCand) continue;
            const { final } = computeScoreForPair(cleanedTitle, cleanedCand);
            if (final > best.score) best = { manhwa_id: c.manhwa_id, score: final };
        }
        return best.score >= similarityThreshold ? best.manhwa_id : null;
    } catch (err) {
        console.error('resolveManhwa error', err);
        return null;
    } finally {
        conn?.release();
    }
}

async function resolveManhwaCandidates(rawTitle, limit = 50) {
    if (!rawTitle) return [];
    const cleanedTitle = cleanTitle(rawTitle);
    if (!cleanedTitle) return [];

    let conn;
    try {
        conn = await pool.getConnection();
        const candidates = await fetchCandidates(conn, Math.max(200, limit * 4));
        const matches = [];

        for (const c of candidates) {
            const cleanedCand = cleanTitle(c.title || c.original_title || '');
            if (!cleanedCand) continue;
            const { final } = computeScoreForPair(cleanedTitle, cleanedCand);
            matches.push({ manhwa_id: c.manhwa_id, title: c.title, original_title: c.original_title, score: final });
        }

        matches.sort((a, b) => b.score - a.score);
        return matches.slice(0, limit);
    } catch (err) {
        console.error('resolveManhwaCandidates error', err);
        return [];
    } finally {
        conn?.release();
    }
}

module.exports = { resolveManhwa, resolveManhwaCandidates, cleanTitle, tokenize, extractNumbers };
