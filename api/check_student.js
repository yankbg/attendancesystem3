const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 3306,
};

module.exports = async (req, res) => {
  // CORS headers for browser/app access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request (CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ status: 'error', message: 'Only POST requests are allowed' });
    return;
  }

  try {
    // Accept both JSON and URL-encoded data (Vercel parses JSON automatically)
    const studentIdRaw = req.body.studentId;
    const fullnameRaw = req.body.fullname;

    // Validate inputs
    if (!studentIdRaw || !fullnameRaw) {
      res.status(400).json({
        status: 'error',
        message: 'Missing studentId or fullname',
      });
      return;
    }

    // Validate studentId is numeric
    const studentId = Number(studentIdRaw);
    if (isNaN(studentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid studentId',
      });
      return;
    }

    const fullname = fullnameRaw.toLowerCase();

    // Connect to database
    const conn = await mysql.createConnection(dbConfig);

    // Prepare and execute query (case-insensitive search on name)
    const [rows] = await conn.execute(
      'SELECT id, image_path FROM students WHERE id = ? AND LOWER(name) = ?',
      [studentId, fullname]
    );

    await conn.end();

    if (rows.length > 0) {
      res.status(200).json({
        status: 'success',
        exists: true,
        image_path: rows[0].image_path,
      });
    } else {
      res.status(404).json({
        status: 'error',
        exists: false,
        message: 'Student not found',
      });
    }
  } catch (error) {
    console.error('Error in /check_student:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};
