const fs = require('fs');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  // connect to db
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // readin the json to fetch manhwa data
  const jsonPath = path.resolve(__dirname, '../data/manhwa.json');
  if (!fs.existsSync(jsonPath)) throw new Error(`JSON is not defined : ${jsonPath}`);

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  for (const manhwa of data) {
    const { title, original_title, description, release_date, total_chapters, total_seasons, author, genres } = manhwa;

    // already in db ?
    const [rows] = await connection.execute(
      `SELECT manhwa_id FROM manhwa WHERE title = ? OR original_title = ?`,
      [title, original_title]
    );

    if (rows.length > 0) {
      console.log(`⚠️  "${title}" already in db. Updating author/genres...`);
      await connection.execute(
        `UPDATE manhwa SET author = ?, genres = ? WHERE manhwa_id = ?`,
        [author || null, (genres || []).join(','), rows[0].manhwa_id]
      );
      continue;
    }
    await connection.execute(
      `INSERT INTO manhwa 
      (title, original_title, description, release_date, total_chapters, total_seasons, author, genres)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, original_title, description, release_date, total_chapters, total_seasons, author || null, (genres || []).join(',')]
    );
    console.log(`Added : ${title}`);
  }

  console.log('All the data got fetch and add to the database!');
  await connection.end();
}

main();
