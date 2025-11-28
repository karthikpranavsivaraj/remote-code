import React, { useState } from 'react';
import { projectAPI } from '../services/api';

const GitHubCommitModal = ({ projectId, fileIds, onClose, onSuccess }) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCommit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await projectAPI.commitChanges(projectId, fileIds, commitMessage, githubToken);
      onSuccess?.();
      onClose();
    } catch (error) {
      alert('Commit failed: ' + error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">Commit to GitHub</h3>
        
        <form onSubmit={handleCommit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Commit Message</label>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="w-full border rounded px-3 py-2"
              rows="3"
              placeholder="Describe your changes..."
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">GitHub Token</label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="ghp_xxxxxxxxxxxx"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Generate at: GitHub → Settings → Developer settings → Personal access tokens
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Committing...' : 'Commit & Push'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GitHubCommitModal;