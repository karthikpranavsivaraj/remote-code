const express = require('express');
const { Notification } = require('../database/mongodb');
const router = express.Router();

// Get user notifications
router.get('/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept/Deny notification
router.put('/:id/respond', async (req, res) => {
  try {
    const { action } = req.body; // 'accepted' or 'denied'
    const notification = await Notification.findByIdAndUpdate(
      req.params.id, 
      { status: action, isRead: true },
      { new: true }
    );
    
    if (notification.type === 'project_invite' && action === 'accepted') {
      // Add user to project when accepted
      const db = require('../database/db');
      await db.execute(
        "INSERT INTO project_members (project_id, user_id, role, assigned_modules) VALUES (?, ?, ?, ?)",
        [notification.data.projectId, notification.userId, notification.data.role, JSON.stringify([])]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create notification
router.post('/', async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;