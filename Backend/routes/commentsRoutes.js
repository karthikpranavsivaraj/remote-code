const express = require("express");
const router = express.Router();
const db = require("../database/db");
const authMiddleware = require("../middlewares/authMiddleware");

// Get comments for a file
router.get("/file/:fileId", authMiddleware, async (req, res) => {
  try {
    const [comments] = await db.execute(`
      SELECT c.*, u.username as author_name, 
             DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') as formatted_date
      FROM code_comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.file_id = ?
      ORDER BY c.line_number, c.created_at
    `, [req.params.fileId]);

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment to file
router.post("/", authMiddleware, async (req, res) => {
  const { file_id, line_number, comment, subtasks } = req.body;

  try {
    const [result] = await db.execute(
      "INSERT INTO code_comments (file_id, line_number, comment, author_id, subtasks) VALUES (?, ?, ?, ?, ?)",
      [file_id, line_number, comment, req.user.userId, JSON.stringify(subtasks || [])]
    );

    res.status(201).json({ 
      message: "Comment added successfully", 
      commentId: result.insertId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update comment status
router.put("/:id", authMiddleware, async (req, res) => {
  const { status } = req.body;

  try {
    await db.execute(
      "UPDATE code_comments SET status = ? WHERE id = ?",
      [status, req.params.id]
    );

    res.json({ message: "Comment updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;