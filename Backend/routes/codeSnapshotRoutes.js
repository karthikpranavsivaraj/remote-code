const express = require('express');
const db = require('../database/db');
const router = express.Router();

// Get code snapshot from database
router.post('/', async (req, res) => {
  try {
    const { projectId, filePath, startLine, endLine } = req.body;
    
    const query = `
      SELECT content, file_path FROM project_files 
      WHERE project_id = ? AND content IS NOT NULL
    `;
    
    const [rows] = await db.execute(query, [projectId]);
    
    // Find file by matching filename or path
    const fileName = filePath.split('/').pop();
    const matchedFile = rows.find(row => 
      row.file_path === filePath || 
      row.file_path.endsWith(fileName) ||
      row.file_path.includes(fileName)
    );
    
    if (!matchedFile) {
      return res.status(404).json({ 
        error: `File not found: ${filePath}`,
        availableFiles: rows.map(r => r.file_path)
      });
    }
    
    const fileContent = matchedFile.content || '';
    
    if (!fileContent.trim()) {
      return res.status(404).json({ error: `File content is empty: ${filePath}` });
    }
    const lines = fileContent.split('\n');
    const snapshot = lines.slice(startLine - 1, endLine).join('\n');
    
    res.json({ 
      success: true, 
      snapshot,
      totalLines: lines.length
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to get code snapshot: ${error.message}` });
  }
});

module.exports = router;