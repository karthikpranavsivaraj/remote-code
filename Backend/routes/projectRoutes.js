const express = require("express");
const router = express.Router();
const db = require("../database/db");
const authMiddleware = require("../middlewares/authMiddleware");
const { Notification } = require('../database/mongodb');

// Create project (Admin only)
router.post("/", authMiddleware, async (req, res) => {
  const { name, description, github_repo } = req.body;
  const admin_id = req.user.userId;

  console.log('Creating project:', { name, description, github_repo, admin_id });

  try {
    // Try with live_room_active column first, fallback if column doesn't exist
    let result;
    try {
      [result] = await db.execute(
        "INSERT INTO projects (name, description, github_repo, admin_id, live_room_active) VALUES (?, ?, ?, ?, FALSE)",
        [name, description, github_repo || null, admin_id]
      );
    } catch (columnError) {
      // Fallback for databases without live_room_active column
      console.log('Falling back to basic project creation');
      [result] = await db.execute(
        "INSERT INTO projects (name, description, github_repo, admin_id) VALUES (?, ?, ?, ?)",
        [name, description, github_repo || null, admin_id]
      );
    }

    console.log('Project created with ID:', result.insertId);

    // Add admin as project member with fallback for missing assigned_modules column
    try {
      await db.execute(
        "INSERT INTO project_members (project_id, user_id, role, assigned_modules) VALUES (?, ?, 'admin', ?)",
        [result.insertId, admin_id, JSON.stringify(['frontend', 'backend', 'database', 'shared'])]
      );
    } catch (columnError) {
      // Fallback for databases without assigned_modules column
      await db.execute(
        "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'admin')",
        [result.insertId, admin_id]
      );
    }

    console.log('Admin added as project member');

    res.status(201).json({
      message: "Project created successfully",
      projectId: result.insertId
    });
  } catch (error) {
    console.error('Project creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's projects
router.get("/", authMiddleware, async (req, res) => {
  console.log('Fetching projects for user:', req.user.userId);

  try {
    const [projects] = await db.execute(`
      SELECT p.*, pm.role, u.username as admin_name
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      JOIN users u ON p.admin_id = u.id
      WHERE pm.user_id = ?
    `, [req.user.userId]);

    console.log('Found projects:', projects.length);
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add member to project
router.post("/:id/members", authMiddleware, async (req, res) => {
  const { email, role, modules } = req.body;
  const projectId = req.params.id;

  console.log('Request body:', req.body);
  console.log('Adding member:', { projectId, email, role, modules });

  try {
    // Validate required fields
    if (!email || !role) {
      return res.status(400).json({ error: "Email and role are required" });
    }

    // Check if user is admin
    const [adminCheck] = await db.execute(
      "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'admin'",
      [projectId, req.user.userId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ error: "Only admin can add members" });
    }

    // Find user by email
    const [users] = await db.execute("SELECT id FROM users WHERE email = ?", [email]);
    console.log('Found users:', users);

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found. Please ensure the user has registered." });
    }

    // Check if user is already a member
    const [existingMember] = await db.execute(
      "SELECT * FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, users[0].id]
    );

    if (existingMember.length > 0) {
      return res.status(400).json({ error: "User is already a member of this project" });
    }

    console.log('Inserting member with modules:', JSON.stringify(modules || []));

    // Try with assigned_modules column first, fallback if column doesn't exist
    try {
      await db.execute(
        "INSERT INTO project_members (project_id, user_id, role, assigned_modules) VALUES (?, ?, ?, ?)",
        [projectId, users[0].id, role, JSON.stringify(modules || [])]
      );
    } catch (columnError) {
      // Fallback for databases without assigned_modules column
      await db.execute(
        "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)",
        [projectId, users[0].id, role]
      );
    }

    // Create notification for project invite (don't add to project yet)
    try {
      const notification = new Notification({
        userId: users[0].id,
        type: 'project_invite',
        title: 'Project Invitation',
        message: `You have been invited to join project with role: ${role}`,
        data: { projectId, role }
      });
      await notification.save();
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    console.log('Project invitation sent');
    res.json({ message: "Project invitation sent" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project files
router.get("/:id/files", authMiddleware, async (req, res) => {
  const projectId = req.params.id;

  try {
    const [files] = await db.execute(`
      SELECT pf.*, u.username as last_edited_by_name
      FROM project_files pf
      LEFT JOIN users u ON pf.last_edited_by = u.id
      WHERE pf.project_id = ?
      ORDER BY pf.file_path
    `, [projectId]);

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project members
router.get("/:id/members", authMiddleware, async (req, res) => {
  try {
    const [members] = await db.execute(`
      SELECT pm.*, u.username, u.email
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `, [req.params.id]);

    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update member role
router.put("/:id/members/:userId", authMiddleware, async (req, res) => {
  const { role, assigned_modules } = req.body;
  const { id: projectId, userId } = req.params;

  try {
    // Check admin permission
    const [adminCheck] = await db.execute(
      "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'admin'",
      [projectId, req.user.userId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ error: "Only admin can update members" });
    }

    // Try with assigned_modules column first, fallback if column doesn't exist
    try {
      await db.execute(
        "UPDATE project_members SET role = ?, assigned_modules = ? WHERE project_id = ? AND user_id = ?",
        [role, JSON.stringify(assigned_modules || []), projectId, userId]
      );
    } catch (columnError) {
      // Fallback for databases without assigned_modules column
      await db.execute(
        "UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?",
        [role, projectId, userId]
      );
    }

    res.json({ message: "Member updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove member
router.delete("/:id/members/:userId", authMiddleware, async (req, res) => {
  const { id: projectId, userId } = req.params;

  try {
    // Check admin permission
    const [adminCheck] = await db.execute(
      "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'admin'",
      [projectId, req.user.userId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ error: "Only admin can remove members" });
    }

    await db.execute(
      "DELETE FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, userId]
    );

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project tasks
router.get("/:id/tasks", authMiddleware, async (req, res) => {
  try {
    const [tasks] = await db.execute(`
      SELECT t.*, u1.username as assigned_to_name, u2.username as created_by_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE t.project_id = ?
      ORDER BY t.created_at DESC
    `, [req.params.id]);

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create task
router.post("/:id/tasks", authMiddleware, async (req, res) => {
  const { title, description, assigned_to, priority, due_date } = req.body;
  const projectId = req.params.id;

  try {
    const [result] = await db.execute(
      "INSERT INTO tasks (project_id, title, description, assigned_to, created_by, priority, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'todo')",
      [
        parseInt(projectId),
        title,
        description || null,
        assigned_to ? parseInt(assigned_to) : null,
        req.user.userId,
        priority || 'medium',
        due_date || null
      ]
    );

    // Create notification for assigned user
    if (assigned_to) {
      try {
        const notification = new Notification({
          userId: parseInt(assigned_to),
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned task: ${title}`,
          data: { projectId, taskId: result.insertId, priority }
        });
        await notification.save();
      } catch (notifError) {
        console.error('Failed to create task notification:', notifError);
      }
    }

    res.status(201).json({ message: "Task created successfully", taskId: result.insertId });
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update task
router.put("/:id/tasks/:taskId", authMiddleware, async (req, res) => {
  const { id: projectId, taskId } = req.params;
  const { status, assigned_to, priority } = req.body;

  console.log('=== TASK UPDATE DEBUG ===');
  console.log('Project ID:', projectId);
  console.log('Task ID:', taskId);
  console.log('Request body:', req.body);
  console.log('User ID:', req.user.userId);

  try {
    const fields = {};
    if (status !== undefined) fields.status = status;
    if (assigned_to !== undefined) fields.assigned_to = assigned_to ? parseInt(assigned_to) : null;
    if (priority !== undefined) fields.priority = priority;

    console.log('Fields to update:', fields);

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updates = Object.keys(fields).map(key => `${key} = ?`);
    const values = Object.values(fields);
    
    const sql = `UPDATE tasks SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND project_id = ?`;
    const params = [...values, parseInt(taskId), parseInt(projectId)];
    
    console.log('SQL:', sql);
    console.log('Params:', params);
    
    const [result] = await db.execute(sql, params);
    console.log('Update result:', result);
    console.log('Affected rows:', result.affectedRows);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found or no changes made' });
    }

    res.json({ message: "Task updated successfully" });
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save file content
router.put("/:id/files/:fileId", authMiddleware, async (req, res) => {
  const { content } = req.body;
  const { fileId } = req.params;

  try {
    await db.execute(
      "UPDATE project_files SET content = ?, last_edited_by = ?, updated_at = NOW(), is_committed = FALSE WHERE id = ?",
      [content, req.user.userId, fileId]
    );

    res.json({ message: "File saved successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle live room
router.put("/:id/live-room", authMiddleware, async (req, res) => {
  const { active } = req.body;
  const projectId = req.params.id;

  try {
    // Check admin permission
    const [adminCheck] = await db.execute(
      "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'admin'",
      [projectId, req.user.userId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ error: "Only admin can toggle live room" });
    }

    await db.execute(
      "UPDATE projects SET live_room_active = ? WHERE id = ?",
      [active ? 1 : 0, projectId]
    );

    res.json({ message: "Live room status updated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get uncommitted changes
router.get("/:id/changes", authMiddleware, async (req, res) => {
  const projectId = req.params.id;

  try {
    const [changes] = await db.execute(`
      SELECT pf.*, u.username as last_edited_by_name
      FROM project_files pf
      LEFT JOIN users u ON pf.last_edited_by = u.id
      WHERE pf.project_id = ? AND pf.is_committed = FALSE
      ORDER BY pf.updated_at DESC
    `, [projectId]);

    res.json(changes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Commit changes to GitHub
router.post("/:id/commit", authMiddleware, async (req, res) => {
  const { fileIds, commitMessage, githubToken } = req.body;
  const projectId = req.params.id;

  try {
    // Check admin permission
    const [adminCheck] = await db.execute(
      "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'admin'",
      [projectId, req.user.userId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ error: "Only admin can commit changes" });
    }

    // Get project details
    const [projects] = await db.execute(
      "SELECT github_repo FROM projects WHERE id = ?",
      [projectId]
    );

    if (projects.length === 0 || !projects[0].github_repo) {
      return res.status(400).json({ error: "No GitHub repository configured" });
    }

    // Get file contents
    const placeholders = fileIds.map(() => '?').join(',');
    const [files] = await db.execute(
      `SELECT file_path, content FROM project_files WHERE id IN (${placeholders}) AND project_id = ?`,
      [...fileIds, projectId]
    );

    // Commit to GitHub
    console.log('=== GITHUB COMMIT PROCESS STARTED ===');
    console.log('GitHub Token provided:', !!githubToken);
    console.log('Files to commit:', files.length);
    console.log('Project GitHub repo:', projects[0]?.github_repo);
    
    if (!githubToken) {
      console.error('❌ No GitHub token provided');
      return res.status(400).json({ error: 'GitHub token required' });
    }
    
    if (files.length === 0) {
      console.error('❌ No files to commit');
      return res.status(400).json({ error: 'No files selected for commit' });
    }
    
    if (githubToken && files.length > 0) {
      const repoUrl = projects[0].github_repo;
      console.log('Raw repo URL:', repoUrl);
      
      if (!repoUrl) {
        console.error('❌ No GitHub repository configured for this project');
        return res.status(400).json({ error: 'No GitHub repository configured' });
      }
      
      const urlParts = repoUrl.split('/');
      console.log('URL parts:', urlParts);
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1];
      const repoName = repo.replace('.git', '');
      
      console.log('Parsed owner:', owner);
      console.log('Parsed repo name:', repoName);
      
      for (const file of files) {
        try {
          // Get current file SHA (required for updates)
          let sha = null;
          let fileExists = false;
          try {
            const getResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file.file_path}`, {
              headers: { 
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            });
            if (getResponse.ok) {
              const fileData = await getResponse.json();
              sha = fileData.sha;
              fileExists = true;
              console.log(`✅ Found existing file ${file.file_path}, SHA: ${sha}`);
            } else if (getResponse.status === 404) {
              console.log(`📄 File ${file.file_path} doesn't exist, will create new`);
            } else {
              console.error(`❌ Error checking file ${file.file_path}: ${getResponse.status}`);
            }
          } catch (e) {
            console.log(`📄 Creating new file: ${file.file_path}`);
          }
          
          const body = {
            message: commitMessage || 'Update from CodeCollab',
            content: Buffer.from(file.content || '').toString('base64')
          };
          
          if (sha) body.sha = sha;
          
          const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file.file_path}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'CodeCollab-App'
            },
            body: JSON.stringify(body)
          });
          
          console.log(`🚀 GitHub API Request for ${file.file_path}:`);
          console.log(`   URL: https://api.github.com/repos/${owner}/${repoName}/contents/${file.file_path}`);
          console.log(`   Method: PUT`);
          console.log(`   Body:`, JSON.stringify(body, null, 2));
          
          if (response.ok) {
            const result = await response.json();
            console.log(`✅ SUCCESS: ${file.file_path} committed to GitHub`);
            console.log(`   Commit SHA: ${result.commit.sha}`);
          } else {
            const error = await response.text();
            console.error(`❌ FAILED: ${file.file_path}`);
            console.error(`   Status: ${response.status}`);
            console.error(`   Error: ${error}`);
          }
        } catch (githubError) {
          console.error(`❌ EXCEPTION for ${file.file_path}:`, githubError.message);
        }
      }
    }

    // Mark files as committed
    await db.execute(
      `UPDATE project_files SET is_committed = TRUE WHERE id IN (${placeholders}) AND project_id = ?`,
      [...fileIds, projectId]
    );

    res.json({ message: "Changes committed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single project
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const [projects] = await db.execute(`
      SELECT p.*, pm.role, u.username as admin_name
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      JOIN users u ON p.admin_id = u.id
      WHERE p.id = ? AND pm.user_id = ?
    `, [req.params.id, req.user.userId]);

    if (projects.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(projects[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update project
router.put("/:id", authMiddleware, async (req, res) => {
  const { name, description, github_repo } = req.body;
  const projectId = req.params.id;

  try {
    // Check if user is admin
    const [adminCheck] = await db.execute(
      "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'admin'",
      [projectId, req.user.userId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ error: "Only admin can update project" });
    }

    await db.execute(
      "UPDATE projects SET name = ?, description = ?, github_repo = ? WHERE id = ?",
      [name, description, github_repo, projectId]
    );

    res.json({ message: "Project updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project
router.delete("/:id", authMiddleware, async (req, res) => {
  const projectId = req.params.id;

  try {
    // Check if user is admin
    const [adminCheck] = await db.execute(
      "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'admin'",
      [projectId, req.user.userId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ error: "Only admin can delete project" });
    }

    await db.execute("DELETE FROM projects WHERE id = ?", [projectId]);

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;