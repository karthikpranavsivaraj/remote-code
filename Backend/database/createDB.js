const mysql = require("mysql2");
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "karthik2005",
  database: process.env.DB_NAME || "livedevhub"
};

const createDatabase = async () => {
  console.log('🔄 Creating database...');
  
  // Connect without specifying database
  const conn = mysql.createConnection({
    host: DB_CONFIG.host,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password
  });

  try {
    await conn.promise().execute(`CREATE DATABASE IF NOT EXISTS ${DB_CONFIG.database}`);
    console.log(`✅ Database '${DB_CONFIG.database}' created`);
    
    // Now connect to the database and create tables
    conn.changeUser({ database: DB_CONFIG.database });
    
    await conn.promise().execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');
    
    console.log('🎉 Database setup complete!');
  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    conn.end();
  }
};

createDatabase();