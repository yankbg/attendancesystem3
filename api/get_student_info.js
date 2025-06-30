const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 13662,
};

module.exports = async (req, res) => {
  // CORS headers for browser/app access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ status: 'error', message: 'Only POST requests allowed' });
    return;
  }

  try {
    // Retrieve student_id and student_name from JSON body
    const studentIdRaw = req.body.student_id;
    const studentNameRaw = req.body.student_name;

    // Validate inputs
    if (!studentIdRaw || isNaN(Number(studentIdRaw)) || !studentNameRaw) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid or missing student_id or student_name',
      });
      return;
    }

    const studentId = Number(studentIdRaw);
    const studentName = studentNameRaw.toLowerCase();

    // Connect to database
    const conn = await mysql.createConnection(dbConfig);

    // Prepare and execute query with case-insensitive name comparison
    const [rows] = await conn.execute(
      'SELECT image_path FROM students WHERE id = ? AND LOWER(name) = ?',
      [studentId, studentName]
    );

    await conn.end();

    if (rows.length > 0) {
      res.status(200).json({
        status: 'success',
        image_path: rows[0].image_path,
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'Image not found',
      });
    }
  } catch (error) {
    console.error('Error in /get_student_info:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};
