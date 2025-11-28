import React, { useState, useEffect } from 'react';
import { FiMessageSquare, FiUsers, FiCalendar } from 'react-icons/fi';
import { standupAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';

const StandupMeetings = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [standups, setStandups] = useState([]);
  const [showStandupModal, setShowStandupModal] = useState(false);
  const [standupForm, setStandupForm] = useState({ yesterday: '', today: '', blockers: '' });
  const { user } = useAuthStore();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchStandups();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
      if (response.data.length > 0) {
        setSelectedProject(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchStandups = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await standupAPI.getStandups(selectedProject.id, today);
      setStandups(response.data);
    } catch (error) {
      console.error('Error fetching standups:', error);
    }
  };

  const submitStandup = async (e) => {
    e.preventDefault();
    try {
      await standupAPI.createStandup({
        projectId: selectedProject.id,
        userId: user.id,
        userName: user.username,
        ...standupForm
      });
      setShowStandupModal(false);
      setStandupForm({ yesterday: '', today: '', blockers: '' });
      fetchStandups();
      toast.success('Stand-up update posted!');
    } catch (error) {
      toast.error('Failed to post update');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3 mb-2">
            <FiMessageSquare className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Daily Stand-up Meetings</h1>
          </div>
          <p className="text-gray-600">Share your daily updates with your team</p>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <FiCalendar className="w-5 h-5 text-gray-500" />
              <span className="text-lg font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            
            {selectedProject && (
              <div className="flex items-center space-x-4">
                <select
                  value={selectedProject.id}
                  onChange={(e) => setSelectedProject(projects.find(p => p.id == e.target.value))}
                  className="border rounded px-3 py-2"
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                
                <button
                  onClick={() => setShowStandupModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center space-x-2"
                >
                  <FiMessageSquare className="w-4 h-4" />
                  <span>Post Update</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {standups.map(standup => (
              <div key={standup._id} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center space-x-2 mb-3">
                  <FiUsers className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-gray-900">{standup.userName}</span>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-medium text-green-700 mb-1">✅ Yesterday</h4>
                    <p className="text-gray-700">{standup.yesterday}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-blue-700 mb-1">🎯 Today</h4>
                    <p className="text-gray-700">{standup.today}</p>
                  </div>
                  
                  {standup.blockers && (
                    <div>
                      <h4 className="font-medium text-red-700 mb-1">🚫 Blockers</h4>
                      <p className="text-gray-700">{standup.blockers}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {standups.length === 0 && (
              <div className="col-span-full text-center py-12">
                <FiMessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No updates yet today</h3>
                <p className="text-gray-500">Be the first to post your daily stand-up update!</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showStandupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Daily Stand-up Update</h3>
            <form onSubmit={submitStandup}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-900 font-bold">What did you do yesterday?</label>
                <textarea
                  value={standupForm.yesterday}
                  onChange={(e) => setStandupForm({...standupForm, yesterday: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows="3"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-900 font-bold">What will you do today?</label>
                <textarea
                  value={standupForm.today}
                  onChange={(e) => setStandupForm({...standupForm, today: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows="3"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-900 font-bold">Any blockers?</label>
                <textarea
                  value={standupForm.blockers}
                  onChange={(e) => setStandupForm({...standupForm, blockers: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows="2"
                  placeholder="Optional - describe any blockers or issues"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Post Update
                </button>
                <button
                  type="button"
                  onClick={() => setShowStandupModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandupMeetings;