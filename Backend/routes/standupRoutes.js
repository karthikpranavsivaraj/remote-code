const express = require('express');
const { Standup } = require('../database/mongodb');
const router = express.Router();

// Create/Update daily standup
router.post('/', async (req, res) => {
  try {
    const { projectId, userId, userName, yesterday, today, blockers } = req.body;
    const date = new Date().toISOString().split('T')[0]; // Today's date
    
    // Check if standup already exists for today
    const existing = await Standup.findOne({ projectId, userId, date });
    
    if (existing) {
      // Update existing standup
      existing.yesterday = yesterday;
      existing.today = today;
      existing.blockers = blockers;
      await existing.save();
    } else {
      // Create new standup
      const standup = new Standup({
        projectId,
        userId,
        userName,
        date,
        yesterday,
        today,
        blockers
      });
      await standup.save();
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get standups for project and date
router.get('/:projectId/:date?', async (req, res) => {
  try {
    const { projectId, date } = req.params;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const standups = await Standup.find({ 
      projectId: parseInt(projectId), 
      date: targetDate 
    }).sort({ createdAt: -1 });
    
    res.json(standups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;