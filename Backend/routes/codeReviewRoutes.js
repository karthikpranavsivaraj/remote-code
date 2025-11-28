const express = require('express');
const { CodeReview } = require('../database/mongodb');
const router = express.Router();

// Create code review request
router.post('/create', async (req, res) => {
  try {
    const { projectId, title, description, filePath, startLine, endLine, codeSnapshot, requesterId, requesterName } = req.body;
    
    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const codeReview = new CodeReview({
      projectId,
      reviewId,
      title,
      description,
      filePath,
      startLine,
      endLine,
      codeSnapshot,
      requesterId,
      requesterName
    });
    
    await codeReview.save();
    res.json({ success: true, reviewId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get code reviews for project
router.get('/project/:projectId', async (req, res) => {
  try {
    const reviews = await CodeReview.find({ projectId: req.params.projectId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit approval/denial
router.post('/respond', async (req, res) => {
  try {
    const { reviewId, userId, userName, decision, comment } = req.body;
    
    const review = await CodeReview.findOne({ reviewId });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    
    // Remove existing response from this user
    review.approvals = review.approvals.filter(a => a.userId !== userId);
    
    // Add new response
    review.approvals.push({ userId, userName, decision, comment });
    
    // Update status if needed
    const approvals = review.approvals.filter(a => a.decision === 'approve').length;
    const denials = review.approvals.filter(a => a.decision === 'deny').length;
    
    if (denials > 0) {
      review.status = 'denied';
      review.resolvedAt = new Date();
    } else if (approvals >= 2) { // Require 2 approvals
      review.status = 'approved';
      review.resolvedAt = new Date();
    }
    
    await review.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;