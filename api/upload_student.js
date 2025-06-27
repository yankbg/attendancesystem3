// /api/upload_student.js (for Vercel API route)
// or as an Express route handler (adjust exports as needed)

const mysql = require('mysql2/promise');
const { v2: cloudinary } = require('cloudinary');

// Cloudinary configuration (use environment variables for security)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dq4p0a6x1',
  api_key: process.env.CLOUDINARY_API_KEY || '823294593735767',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your_cloudinary_secret',
});

// MySQL config (use environment variables in production)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'attendancesystem',
  port: 3306,
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ status: 'error', message: 'Only POST requests are allowed' });
    return;
  }

  try {
    const data = req.body;

    // Validate JSON input
    if (!data) {
      res.status(400).json({ status: 'error', message: 'Invalid JSON input' });
      return;
    }

    const { id, name, image } = data;
    if (!id || !name || !image) {
      res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: id, name, or image',
      });
      return;
    }

    // Clean and decode Base64 image data
    let imageData = image;
    if (imageData.includes('base64,')) {
      imageData = imageData.split('base64,')[1];
    }
    imageData = imageData.replace(/ /g, '+');

    // Upload to Cloudinary
    let uploadResult;
    try {
      uploadResult = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${imageData}`,
        {
          public_id: `student_${id}_${Date.now()}`,
          folder: 'students',
        }
      );
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      res.status(500).json({ status: 'error', message: 'Failed to upload image to Cloudinary' });
      return;
    }

    const imageUrl = uploadResult.secure_url;

    // Connect to database
    const conn = await mysql.createConnection(dbConfig);

    // Create students table if not exists
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        image_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await conn.execute(createTableSQL);

    // Check for duplicate student by id or name
    const [rows] = await conn.execute(
      'SELECT COUNT(*) as count FROM students WHERE id = ? OR name = ?',
      [id, name]
    );
    if (rows[0].count > 0) {
      await conn.end();
      res.status(409).json({
        status: 'error',
        message: 'Student with this ID or name already registered',
      });
      return;
    }

    // Insert student data into database
    await conn.execute(
      'INSERT INTO students (id, name, image_path) VALUES (?, ?, ?)',
      [id, name, imageUrl]
    );

    await conn.end();

    res.json({
      status: 'success',
      message: 'Student registered successfully',
      image_path: imageUrl,
    });
  } catch (error) {
    console.error('Error in /upload_student:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};
