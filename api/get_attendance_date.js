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
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let date = null;
  if (req.method === 'POST') {
    date = req.body.date;
  } else if (req.method === 'GET') {
    date = req.query.date;
  }

  if (!date) {
    res.status(400).json({
      status: 'error',
      message: 'Missing date parameter',
    });
    return;
  }

  // Validate date format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    res.status(400).json({
      status: 'error',
      message: 'Invalid date format. Expected YYYY-MM-DD.',
    });
    return;
  }

  try {
    // Connect to database
    const conn = await mysql.createConnection(dbConfig);

    // Prepare and execute query
    const [rows] = await conn.execute(
      'SELECT student_id, student_name, time FROM attendance WHERE date = ?',
      [date]
    );

    await conn.end();

    res.status(200).json({
      status: 'success',
      date,
      data: rows,
    });
  } catch (error) {
    console.error('Error in /get_attendance_date:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
    });
  }
};
