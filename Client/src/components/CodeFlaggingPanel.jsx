import React, { useState, useEffect } from 'react';
import { reviewAPI, projectAPI, notificationAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const CodeFlaggingPanel = ({ projectId, onReviewCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    filePath: '',
    startLine: 1,
    endLine: 1
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');
  const [projectFiles, setProjectFiles] = useState([]);
  const { user } = useAuthStore();

  useEffect(() => {
    loadProjectFiles();
  }, [projectId]);

  const loadProjectFiles = async () => {
    try {
      const response = await projectAPI.getProjectFiles(projectId);
      setProjectFiles(response.data || []);
    } catch (error) {
      console.error('Failed to load project files:', error);
    }
  };

  const handlePreview = async () => {
    if (!formData.filePath || !formData.startLine || !formData.endLine) return;
    
    setLoading(true);
    try {
      const response = await reviewAPI.getCodeSnapshot({
        projectId,
        filePath: formData.filePath,
        startLine: formData.startLine,
        endLine: formData.endLine
      });
      setPreview(response.data.snapshot);
    } catch (error) {
      alert('Failed to load code preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!preview) {
      alert('Please preview the code first');
      return;
    }

    setLoading(true);
    try {
      await reviewAPI.createReview({
        projectId,
        ...formData,
        codeSnapshot: preview,
        requesterId: user.id,
        requesterName: user.username
      });
      
      // Notify project members
      try {
        const membersResponse = await projectAPI.getMembers(projectId);
        const notifications = membersResponse.data
          .filter(member => member.user_id !== user.id)
          .map(member => ({
            userId: member.user_id,
            type: 'code_review',
            title: 'Code Review Request',
            message: `${user.username} requested review for ${formData.filePath}`,
            data: { projectId, filePath: formData.filePath }
          }));
        
        await Promise.all(notifications.map(notif => 
          notificationAPI.createNotification(notif)
        ));
      } catch (error) {
        console.error('Failed to create review notifications:', error);
      }
      
      setFormData({ title: '', description: '', filePath: '', startLine: 1, endLine: 1 });
      setPreview('');
      onReviewCreated?.();
    } catch (error) {
      alert('Failed to create review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Flag Code for Review</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Review Title"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          className="w-full border rounded px-3 py-2"
          required
        />
        
        <div className="grid grid-cols-3 gap-4">
          <select
            value={formData.filePath}
            onChange={(e) => setFormData({...formData, filePath: e.target.value})}
            className="border rounded px-3 py-2"
            required
          >
            <option value="">Select File</option>
            {projectFiles.map((file) => (
              <option key={file.id} value={file.file_path}>
                {file.file_path}
              </option>
            ))}
          </select>
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
          placeholder="Description (optional)"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="w-full border rounded px-3 py-2"
          rows="3"
        />
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Preview Code'}
          </button>
          
          <button
            type="submit"
            disabled={loading || !preview}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            Flag for Review
          </button>
        </div>
      </form>
      
      {preview && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Code Preview:</h4>
          <div className="bg-gray-900 p-4 rounded-lg border">
            <pre className="text-sm font-mono whitespace-pre-wrap text-green-400 bg-black p-3 rounded">{preview}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeFlaggingPanel;