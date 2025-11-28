const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../database/db");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const [existingUser] = await db.execute("SELECT * FROM users WHERE email = ? OR username = ?", [email, username]);
    if (existingUser.length > 0)
      return res.status(400).json({ error: "User already exists" });

    await db.execute("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hashedPassword]);
    res.status(201).json({ success: true, message: "User created successfully" });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  console.log('Login request received:', req.body);
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    console.log('Users found:', users.length);
    
    if (users.length === 0) {
      console.log('No user found with email:', email);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = users[0];
    console.log('Received password:', password);
    console.log('Received password length:', password.length);
    console.log('Stored hash exists:', !!user.password);
    
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('Password valid:', validPassword);
    
    if (!validPassword) {
      console.log('Invalid password for user:', email);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: "1h",
    });

    console.log('Login successful for user:', email);
    res.json({ 
      token, 
      user: { id: user.id, username: user.username, email: user.email } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

// Test route to check user data
router.post("/test-user", async (req, res) => {
  try {
    const { email } = req.body;
    const [users] = await db.execute("SELECT id, username, email, created_at FROM users WHERE email = ?", [email]);
    res.json({ users, count: users.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
