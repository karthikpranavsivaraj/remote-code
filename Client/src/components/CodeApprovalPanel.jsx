import React, { useState, useEffect } from 'react';
import { reviewAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const CodeApprovalPanel = ({ projectId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (reviewId, decision) => {
    const comment = prompt(`${decision === 'approve' ? 'Approval' : 'Denial'} comment:`);
    if (decision === 'deny' && !comment) return;

    try {
      await reviewAPI.respondToReview({
        reviewId,
        userId: user.id,
        userName: user.username,
        decision,
        comment: comment || ''
      });
      loadReviews();
    } catch (error) {
      alert('Failed to respond');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) return <div className="text-center py-4">Loading reviews...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Code Review Approvals</h3>
      
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.reviewId} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold">{review.title}</h4>
                <p className="text-sm text-gray-600">
                  {review.filePath} (Lines {review.startLine}-{review.endLine})
                </p>
                <p className="text-sm text-gray-500">Requested by {review.requesterName}</p>
              </div>
              <span className={`px-2 py-1 rounded text-sm ${getStatusColor(review.status)}`}>
                {review.status.toUpperCase()}
              </span>
            </div>
            
            {review.description && (
              <p className="text-gray-700 mb-3">{review.description}</p>
            )}
            
            <div className="bg-gray-900 p-4 rounded-lg mb-3 border">
              <div className="text-xs text-gray-400 mb-2">
                Code Snapshot (Lines {review.startLine}-{review.endLine}):
              </div>
              <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto text-green-400 bg-black p-3 rounded border">
                {review.codeSnapshot}
              </pre>
            </div>

            {review.approvals.length > 0 && (
              <div className="mb-3 space-y-2">
                <h5 className="font-medium text-sm">Team Responses:</h5>
                {review.approvals.map((approval, idx) => (
                  <div key={idx} className={`text-sm p-2 rounded border-l-4 ${
                    approval.decision === 'approve' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{approval.userName}</span>
                      <span className={approval.decision === 'approve' ? 'text-green-600' : 'text-red-600'}>
                        {approval.decision === 'approve' ? '✓ Approved' : '✗ Denied'}
                      </span>
                    </div>
                    {approval.comment && (
                      <p className="text-gray-600 mt-1">{approval.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {review.status === 'pending' && review.requesterId !== user.id && (
              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={() => handleRespond(review.reviewId, 'approve')}
                  className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleRespond(review.reviewId, 'deny')}
                  className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
                >
                  ✗ Deny
                </button>
              </div>
            )}
          </div>
        ))}
        
        {reviews.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No code reviews found for this project.
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeApprovalPanel;