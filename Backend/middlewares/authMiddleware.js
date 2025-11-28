const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  console.log('Auth header:', authHeader);
  console.log('Extracted token:', token ? 'Present' : 'Missing');
  
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('JWT Error:', err.message);
      console.log('JWT Secret being used:', JWT_SECRET);
      return res.status(403).json({ error: "Invalid token identified" });
    }
    console.log('Token verified successfully for user:', user.userId);
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
