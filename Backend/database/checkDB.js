const mysql = require("mysql2");
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "karthik2005",
  database: process.env.DB_NAME || "livedevhub"
};

const checkDatabase = async () => {
  console.log('🔍 Checking database status...');
  console.log('📋 Configuration:', {
    host: DB_CONFIG.host,
    user: DB_CONFIG.user,
    database: DB_CONFIG.database
  });

  try {
    // Test connection
    const conn = mysql.createConnection(DB_CONFIG);
    await conn.promise().execute('SELECT 1');
    console.log('✅ Database connection: SUCCESS');

    // Check users table
    const [tables] = await conn.promise().execute(
      "SHOW TABLES LIKE 'users'"
    );
    
    if (tables.length > 0) {
      console.log('✅ Users table: EXISTS');
      
      // Check table structure
      const [columns] = await conn.promise().execute('DESCRIBE users');
      console.log('📊 Table structure:');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type}`);
      });
      
      // Check record count
      const [rows] = await conn.promise().execute('SELECT COUNT(*) as count FROM users');
      console.log(`📈 Total users: ${rows[0].count}`);
    } else {
      console.log('❌ Users table: NOT FOUND');
    }

    conn.end();
    console.log('🎉 Database check complete!');
  } catch (error) {
    console.error('💥 Database check failed:', error.message);
  }
};

checkDatabase();