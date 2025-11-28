const mysql = require("mysql2");

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "karthik2005",
  database: process.env.DB_NAME || "livedevhub"
};

const initDB = async () => {
  console.log('Initializing database...');
  
  // First connect without database to create it
  const conn = mysql.createConnection({
    host: DB_CONFIG.host,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password
  });

  try {
    await conn.promise().execute(`CREATE DATABASE IF NOT EXISTS ${DB_CONFIG.database}`);
    console.log(`Database '${DB_CONFIG.database}' ready`);
  } catch (error) {
    console.error('Error creating database:', error.message);
    throw error;
  } finally {
    conn.end();
  }

  // Test connection to the database
  const testPool = mysql.createPool({
    ...DB_CONFIG,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    // Test connection
    await testPool.promise().execute('SELECT 1');
    console.log('Database connection successful');
    
    // Create users table
    await testPool.promise().execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table ready');
    
    // Create projects table
    await testPool.promise().execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        github_repo VARCHAR(255),
        admin_id INT NOT NULL,
        live_room_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Add live_room_active column if it doesn't exist (for existing databases)
    try {
      await testPool.promise().execute(`
        ALTER TABLE projects ADD COLUMN live_room_active BOOLEAN DEFAULT FALSE
      `);
      console.log('Added live_room_active column to projects table');
    } catch (error) {
      // Column already exists, ignore error
      if (!error.message.includes('Duplicate column name')) {
        console.log('⚠️ Could not add live_room_active column:', error.message);
      }
    }
    console.log('Projects table ready');
    
    // Create project members table
    await testPool.promise().execute(`
      CREATE TABLE IF NOT EXISTS project_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('admin', 'frontend', 'backend', 'database', 'viewer') NOT NULL,
        assigned_modules JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_project_user (project_id, user_id)
      )
    `);
    console.log('Project members table ready');
    
    // Create project files table
    await testPool.promise().execute(`
      CREATE TABLE IF NOT EXISTS project_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        content LONGTEXT,
        module_type ENUM('frontend', 'backend', 'database', 'shared') NOT NULL,
        last_edited_by INT,
        version INT DEFAULT 1,
        is_committed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_project_file (project_id, file_path)
      )
    `);
    console.log('Project files table ready');
    
    // Create tasks table
    await testPool.promise().execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        assigned_to INT,
        created_by INT NOT NULL,
        status ENUM('todo', 'in_progress', 'review', 'done') DEFAULT 'todo',
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tasks table ready');
    
    // Create file permissions table
    await testPool.promise().execute(`
      CREATE TABLE IF NOT EXISTS file_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT NOT NULL,
        user_id INT NOT NULL,
        permission ENUM('read', 'write', 'admin') DEFAULT 'read',
        granted_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES project_files(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_file_user (file_id, user_id)
      )
    `);
    console.log('File permissions table ready');
    
    // Create code comments table
    await testPool.promise().execute(`
      CREATE TABLE IF NOT EXISTS code_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT NOT NULL,
        line_number INT NOT NULL,
        comment TEXT NOT NULL,
        author_id INT NOT NULL,
        subtasks JSON,
        status ENUM('open', 'resolved', 'closed') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES project_files(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Code comments table ready');
    
    // Check if table has data
    const [rows] = await testPool.promise().execute('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Users table has ${rows[0].count} records`);
    
    console.log('🎉 Database initialization complete!');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  } finally {
    testPool.end();
  }
};

const pool = mysql.createPool({
  ...DB_CONFIG,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database on startup with error handling
initDB().catch(error => {
  console.error('💥 Failed to initialize database:', error.message);
  process.exit(1);
});

module.exports = pool.promise();
