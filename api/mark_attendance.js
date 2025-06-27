const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 3306,
};

module.exports = async (req, res) => {
  // CORS headers (for browser/app access)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      status: 'info',
      message: 'This endpoint expects POST requests with attendance data',
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ status: 'error', message: 'Only POST requests are allowed' });
    return;
  }

  try {
    const data = req.body;

    if (!data || !data.qr_data) {
      res.status(400).json({ status: 'error', message: "Missing 'qr_data' in request" });
      return;
    }

    let qrInfo;
    try {
      qrInfo = typeof data.qr_data === 'string' ? JSON.parse(data.qr_data) : data.qr_data;
    } catch (err) {
      res.status(400).json({ status: 'error', message: "Invalid JSON format in 'qr_data'" });
      return;
    }

    const requiredFields = ['studentId', 'fullname', 'Date', 'time'];
    for (const field of requiredFields) {
      if (!qrInfo[field]) {
        res.status(400).json({ status: 'error', message: `Missing required field: ${field}` });
        return;
      }
    }

    const studentId = parseInt(qrInfo.studentId, 10);
    const studentName = qrInfo.fullname;
    const date = qrInfo.Date;
    const time = qrInfo.time;

    const conn = await mysql.createConnection(dbConfig);

    // Create attendance table if not exists
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_attendance (student_id, date)
      )
    `;
    await conn.execute(createTableSQL);

    // Check for existing attendance
    const [existing] = await conn.execute(
      'SELECT id FROM attendance WHERE student_id = ? AND date = ?',
      [studentId, date]
    );

    if (existing.length > 0) {
      await conn.end();
      res.status(409).json({
        status: 'error',
        message: `Attendance already marked for this student on ${date}`,
      });
      return;
    }

    // Insert attendance record
    await conn.execute(
      'INSERT INTO attendance (student_id, student_name, date, time) VALUES (?, ?, ?, ?)',
      [studentId, studentName, date, time]
    );

    await conn.end();

    res.status(200).json({
      status: 'success',
      message: `Attendance marked successfully for student ${studentName}`,
      data: {
        studentId,
        fullname: studentName,
        Date: date,
        time,
        marked_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      },
    });
  } catch (error) {
    console.error('Error in /mark_attendance:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to mark attendance',
    });
  }
};
