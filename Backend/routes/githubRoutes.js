const express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require("multer");
const db = require("../database/db");
const authMiddleware = require("../middlewares/authMiddleware");

const upload = multer({ storage: multer.memoryStorage() });

// Import files from GitHub repo
router.post("/import/:projectId", authMiddleware, async (req, res) => {
  const { projectId } = req.params;
  const { github_token, github_url } = req.body;

  try {
    // Check if user is admin of the project
    const [adminCheck] = await db.execute(
      "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'admin'",
      [projectId, req.user.userId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ error: "Only admin can import files" });
    }

    let repoUrl;
    if (github_url) {
      // Use provided URL
      repoUrl = github_url;
    } else {
      // Get project GitHub repo
      const [project] = await db.execute(
        "SELECT github_repo FROM projects WHERE id = ?",
        [projectId]
      );
      
      if (!project[0]?.github_repo) {
        return res.status(400).json({ error: "No GitHub repo URL provided" });
      }
      
      repoUrl = project[0].github_repo;
    }

    const repoPath = repoUrl.replace("https://github.com/", "");

    // Fetch repository contents
    const response = await axios.get(
      `https://api.github.com/repos/${repoPath}/contents`,
      {
        headers: github_token ? { Authorization: `token ${github_token}` } : {}
      }
    );

    console.log(`Fetching files from: ${repoPath}`);
    const files = await fetchAllFiles(repoPath, "", github_token);
    
    if (files.length === 0) {
      return res.status(400).json({ 
        error: "No files found. Repository might be private (requires token) or empty." 
      });
    }
    
    console.log(`Found ${files.length} files, saving to database...`);
    
    // Save files to database
    for (const file of files) {
      const moduleType = determineModuleType(file.path);
      
      await db.execute(
        `INSERT INTO project_files (project_id, file_path, content, module_type, last_edited_by) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE content = VALUES(content), updated_at = NOW()`,
        [projectId, file.path, file.content, moduleType, req.user.userId]
      );
    }
    
    console.log('Files saved successfully');

    res.json({ 
      message: `Imported ${files.length} files successfully`,
      filesCount: files.length 
    });

  } catch (error) {
    console.error("GitHub import error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Recursively fetch all files from GitHub
async function fetchAllFiles(repoPath, path = "", token = null) {
  const files = [];
  
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${repoPath}/contents/${path}`,
      {
        headers: token ? { Authorization: `token ${token}` } : {}
      }
    );

    for (const item of response.data) {
      if (item.type === "file" && isCodeFile(item.name)) {
        // Fetch file content
        const fileResponse = await axios.get(item.download_url);
        files.push({
          path: item.path,
          content: fileResponse.data
        });
      } else if (item.type === "dir") {
        // Recursively fetch directory contents
        const subFiles = await fetchAllFiles(repoPath, item.path, token);
        files.push(...subFiles);
      }
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`Path not found: ${path}`);
    } else if (error.response?.status === 403) {
      console.error(`Access denied for ${path} - may need GitHub token for private repo`);
    } else {
      console.error(`Error fetching ${path}:`, error.message);
    }
  }

  return files;
}

// Determine module type based on file path
function determineModuleType(filePath) {
  const path = filePath.toLowerCase();
  
  if (path.includes("frontend") || path.includes("client") || path.includes("ui") || 
      path.endsWith(".jsx") || path.endsWith(".tsx") || path.endsWith(".vue")) {
    return "frontend";
  }
  
  if (path.includes("backend") || path.includes("server") || path.includes("api") ||
      path.endsWith(".py") || path.endsWith(".java") || path.endsWith(".php")) {
    return "backend";
  }
  
  if (path.includes("database") || path.includes("db") || path.includes("migration") ||
      path.endsWith(".sql") || path.endsWith(".mongodb")) {
    return "database";
  }
  
  return "shared";
}

// Check if file is a code file
function isCodeFile(filename) {
  const codeExtensions = [
    ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".php", ".rb", ".go",
    ".cpp", ".c", ".cs", ".sql", ".html", ".css", ".scss", ".vue", ".json",
    ".xml", ".yaml", ".yml", ".md", ".txt", ".env"
  ];
  
  return codeExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

// Import local files
router.post("/import-local/:projectId", authMiddleware, upload.array('files'), async (req, res) => {
  const { projectId } = req.params;
  const files = req.files;

  try {
    // Check if user is admin of the project
    const [adminCheck] = await db.execute(
      "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'admin'",
      [projectId, req.user.userId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ error: "Only admin can import files" });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    console.log(`Importing ${files.length} local files...`);
    
    // Save files to database
    for (const file of files) {
      if (!isCodeFile(file.originalname)) {
        continue; // Skip non-code files
      }
      
      const content = file.buffer.toString('utf8');
      const moduleType = determineModuleType(file.originalname);
      
      await db.execute(
        `INSERT INTO project_files (project_id, file_path, content, module_type, last_edited_by) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE content = VALUES(content), updated_at = NOW()`,
        [projectId, file.originalname, content, moduleType, req.user.userId]
      );
    }
    
    const codeFiles = files.filter(f => isCodeFile(f.originalname));
    console.log(`Imported ${codeFiles.length} code files successfully`);

    res.json({ 
      message: `Imported ${codeFiles.length} files successfully`,
      filesCount: codeFiles.length 
    });

  } catch (error) {
    console.error("Local import error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;