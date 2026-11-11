const { query } = require('../db/pool');

/** Normalise text for the JavaScript trigram fallback. */
function normalise(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigrams(text) {
  const s = `  ${normalise(text)} `;
  const set = new Set();
  for (let i = 0; i < s.length - 2; i += 1) set.add(s.slice(i, i + 3));
  return set;
}

/** Dice coefficient over trigram sets (used only if pg_trgm is unavailable). */
function trigramSimilarity(a, b) {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (!ta.size || !tb.size) return 0;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection += 1;
  return (2 * intersection) / (ta.size + tb.size);
}

/**
 * Find potential duplicates in the same district + category.
 * Advisory only: nothing is merged or rejected automatically.
 *
 * Uses pg_trgm when available, with a pure-JS fallback so the feature still
 * works on a database where the extension could not be enabled.
 */
async function findDuplicates({
  description,
  district,
  categoryId,
  excludeId = 0,
  limit = 3,
  minSimilarity = 0.3,
  db = { query },
}) {
  if (!description || !district || !categoryId) return [];
  try {
    const { rows } = await db.query(
      `SELECT g.id, g.ref_no, g.subject, g.status, g.created_at,
              round(similarity(g.description, $1)::numeric, 3)::float AS similarity
         FROM grievances g
        WHERE g.district = $2
          AND g.category_id = $3
          AND g.id <> $4
          AND g.created_at > now() - interval '180 days'
          AND similarity(g.description, $1) >= $5
        ORDER BY similarity DESC
        LIMIT $6`,
      [description, district, categoryId, excludeId, minSimilarity, limit],
    );
    return rows;
  } catch (err) {
    // Undefined function similarity(...) → extension missing. Fall back to JS.
    if (!/similarity|pg_trgm/i.test(err.message)) throw err;
    const { rows } = await db.query(
      `SELECT g.id, g.ref_no, g.subject, g.status, g.created_at, g.description
         FROM grievances g
        WHERE g.district = $1
          AND g.category_id = $2
          AND g.id <> $3
          AND g.created_at > now() - interval '180 days'
        ORDER BY g.created_at DESC
        LIMIT 200`,
      [district, categoryId, excludeId],
    );
    return rows
      .map((row) => ({
        id: row.id,
        ref_no: row.ref_no,
        subject: row.subject,
        status: row.status,
        created_at: row.created_at,
        similarity: Number(trigramSimilarity(description, row.description).toFixed(3)),
      }))
      .filter((row) => row.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}

/** Persist duplicate flags for human review (idempotent). */
async function recordDuplicateFlags(db, grievanceId, duplicates) {
  for (const dup of duplicates) {
    await db.query(
      `INSERT INTO grievance_duplicates (grievance_id, duplicate_of_id, similarity)
       VALUES ($1, $2, $3)
       ON CONFLICT (grievance_id, duplicate_of_id)
       DO UPDATE SET similarity = EXCLUDED.similarity`,
      [grievanceId, dup.id, dup.similarity],
    );
  }
}

module.exports = { findDuplicates, recordDuplicateFlags, trigramSimilarity };
