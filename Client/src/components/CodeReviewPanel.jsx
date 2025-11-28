import React, { useState, useEffect } from 'react';
import { reviewAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const CodeReviewPanel = ({ projectId }) => {
  const [reviews, setReviews] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    filePath: '',
    startLine: 1,
    endLine: 1,
    codeSnapshot: ''
  });
  const { user } = useAuthStore();

  useEffect(() => {
    loadReviews();
  }, [projectId]);

  const loadReviews = async () => {
    try {
      const response = await reviewAPI.getProjectReviews(projectId);
      setReviews(response.data);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    }
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    try {
      await reviewAPI.createReview({
        projectId,
        ...formData,
        requesterId: user.id,
        requesterName: user.username
      });
      setShowCreateForm(false);
      setFormData({ title: '', description: '', filePath: '', startLine: 1, endLine: 1, codeSnapshot: '' });
      loadReviews();
    } catch (error) {
      console.error('Failed to create review:', error);
    }
  };

  const handleRespond = async (reviewId, decision, comment) => {
    try {
      await reviewAPI.respondToReview({
        reviewId,
        userId: user.id,
        userName: user.username,
        decision,
        comment
      });
      loadReviews();
    } catch (error) {
      console.error('Failed to respond:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-500';
      case 'denied': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Code Reviews</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Flag Code
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <form onSubmit={handleCreateReview}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Review Title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="border rounded px-3 py-2"
                required
              />
              <input
                type="text"
                placeholder="File Path"
                value={formData.filePath}
                onChange={(e) => setFormData({...formData, filePath: e.target.value})}
                className="border rounded px-3 py-2"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="number"
                placeholder="Start Line"
                value={formData.startLine}
                onChange={(e) => setFormData({...formData, startLine: parseInt(e.target.value)})}
                className="border rounded px-3 py-2"
                min="1"
                required
              />
              <input
                type="number"
                placeholder="End Line"
                value={formData.endLine}
                onChange={(e) => setFormData({...formData, endLine: parseInt(e.target.value)})}
                className="border rounded px-3 py-2"
                min="1"
                required
              />
            </div>
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border rounded px-3 py-2 mb-4"
              rows="3"
            />
            <textarea
              placeholder="Code Snapshot"
              value={formData.codeSnapshot}
              onChange={(e) => setFormData({...formData, codeSnapshot: e.target.value})}
              className="w-full border rounded px-3 py-2 mb-4 font-mono text-sm"
              rows="6"
              required
            />
            <div className="flex gap-2">
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                Create Review
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.reviewId} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">{review.title}</h4>
                <p className="text-sm text-gray-600">
                  {review.filePath} (Lines {review.startLine}-{review.endLine})
                </p>
                <p className="text-sm text-gray-500">By {review.requesterName}</p>
              </div>
              <span className={`px-2 py-1 rounded text-sm ${getStatusColor(review.status)}`}>
                {review.status.toUpperCase()}
              </span>
            </div>
            
            {review.description && (
              <p className="text-gray-700 mb-3">{review.description}</p>
            )}
            
            <div className="bg-gray-100 p-3 rounded mb-3">
              <pre className="text-sm font-mono whitespace-pre-wrap">{review.codeSnapshot}</pre>
            </div>

            {review.approvals.length > 0 && (
              <div className="mb-3">
                <h5 className="font-medium mb-2">Responses:</h5>
                {review.approvals.map((approval, idx) => (
                  <div key={idx} className="text-sm border-l-4 border-gray-300 pl-3 mb-2">
                    <span className={approval.decision === 'approve' ? 'text-green-600' : 'text-red-600'}>
                      {approval.userName} {approval.decision === 'approve' ? '✓ Approved' : '✗ Denied'}
                    </span>
                    {approval.comment && <p className="text-gray-600">{approval.comment}</p>}
                  </div>
                ))}
              </div>
            )}

            {review.status === 'pending' && review.requesterId !== user.id && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const comment = prompt('Add comment (optional):');
                    handleRespond(review.reviewId, 'approve', comment || '');
                  }}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    const comment = prompt('Add comment (required for denial):');
                    if (comment) handleRespond(review.reviewId, 'deny', comment);
                  }}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  Deny
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CodeReviewPanel;