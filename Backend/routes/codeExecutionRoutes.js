const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const authMiddleware = require("../middlewares/authMiddleware");

// Execute code
router.post("/execute", authMiddleware, async (req, res) => {
  const { code, language, filename } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: "Code and language are required" });
  }

  try {
    let result;
    
    if (language === "javascript") {
      result = await executeJavaScript(code);
    } else if (language === "java") {
      result = await executeJava(code, filename);
    } else {
      return res.status(400).json({ error: "Unsupported language" });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

const executeJavaScript = (code) => {
  return new Promise((resolve) => {
    const tempFile = path.join(__dirname, `../temp/temp_${Date.now()}.js`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempFile);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(tempFile, code);

    exec(`node "${tempFile}"`, { timeout: 10000 }, (error, stdout, stderr) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}

      if (error) {
        resolve({
          success: false,
          error: stderr || error.message
        });
      } else {
        resolve({
          success: true,
          output: stdout || "Code executed successfully (no output)"
        });
      }
    });
  });
};

const executeJava = (code, filename) => {
  return new Promise((resolve) => {
    // Extract class name from filename or code
    const className = filename ? 
      path.basename(filename, '.java') : 
      extractJavaClassName(code) || 'Main';

    const tempDir = path.join(__dirname, `../temp/java_${Date.now()}`);
    const javaFile = path.join(tempDir, `${className}.java`);

    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(javaFile, code);

    // Compile Java code
    exec(`javac "${javaFile}"`, { cwd: tempDir, timeout: 10000 }, (compileError, compileStdout, compileStderr) => {
      if (compileError) {
        // Clean up
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {}

        resolve({
          success: false,
          error: `Compilation Error:\n${compileStderr || compileError.message}`
        });
        return;
      }

      // Run Java code
      exec(`java ${className}`, { cwd: tempDir, timeout: 10000 }, (runError, runStdout, runStderr) => {
        // Clean up
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {}

        if (runError) {
          resolve({
            success: false,
            error: `Runtime Error:\n${runStderr || runError.message}`
          });
        } else {
          resolve({
            success: true,
            output: runStdout || "Code executed successfully (no output)"
          });
        }
      });
    });
  });
};

const extractJavaClassName = (code) => {
  const match = code.match(/public\s+class\s+(\w+)/);
  return match ? match[1] : null;
};

module.exports = router;