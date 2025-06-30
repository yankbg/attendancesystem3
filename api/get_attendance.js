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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ status: 'error', message: 'Only GET requests are allowed' });
    return;
  }

  try {
    const conn = await mysql.createConnection(dbConfig);

    // Query attendance records ordered by date and time descending
    const [rows] = await conn.execute(
      'SELECT student_name, student_id, date, time FROM attendance ORDER BY date DESC, time DESC'
    );

    await conn.end();

    if (rows.length === 0) {
      res.status(200).json({
        status: 'success',
        message: 'No attendance records found',
        data: [],
        count: 0,
      });
      return;
    }

    // Map results and convert student_id to integer
    const attendanceRecords = rows.map(row => ({
      student_name: row.student_name,
      student_id: Number(row.student_id),
      date: row.date,
      time: row.time,
    }));

    res.status(200).json({
      status: 'success',
      message: 'Attendance records retrieved successfully',
      data: attendanceRecords,
      count: attendanceRecords.length,
    });
  } catch (error) {
    console.error('Error in /get_attendance:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
    });
  }
};
