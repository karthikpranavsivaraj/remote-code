import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiClock, FiUser, FiMessageSquare } from 'react-icons/fi';
import api, { standupAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [standups, setStandups] = useState([]);
  const [showStandupModal, setShowStandupModal] = useState(false);
  const [standupForm, setStandupForm] = useState({ yesterday: '', today: '', blockers: '' });
  const { user } = useAuthStore();

  useEffect(() => {
    fetchAllTasks();
  }, []);

  const fetchAllTasks = async () => {
    try {
      setLoading(true);
      const projectsResponse = await api.get('/projects');
      setProjects(projectsResponse.data);
      if (projectsResponse.data.length > 0 && !selectedProject) {
        setSelectedProject(projectsResponse.data[0]);
      }
      const allTasks = [];

      for (const project of projectsResponse.data) {
        try {
          const tasksResponse = await api.get(`/projects/${project.id}/tasks`);
          const projectTasks = tasksResponse.data.map(task => ({
            ...task,
            projectName: project.name,
            projectId: project.id
          }));
          allTasks.push(...projectTasks);
        } catch (error) {
          console.error(`Error fetching tasks for project ${project.id}:`, error);
        }
      }

      setTasks(allTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStandups = async (projectId, date) => {
    try {
      const response = await standupAPI.getStandups(projectId, date);
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
      fetchStandups(selectedProject.id, new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error submitting standup:', error);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchStandups(selectedProject.id, new Date().toISOString().split('T')[0]);
    }
  }, [selectedProject]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityTextColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      return taskDate.toDateString() === date.toDateString();
    });
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 border border-gray-200"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayTasks = getTasksForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div key={day} className={`h-32 border border-gray-200 p-2 overflow-hidden ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayTasks.slice(0, 3).map((task, index) => (
              <div
                key={task.id}
                className={`text-xs p-1 rounded truncate ${getPriorityColor(task.priority)} text-white`}
                title={`${task.title} - ${task.projectName} (${task.priority} priority)`}
              >
                {task.title}
              </div>
            ))}
            {dayTasks.length > 3 && (
              <div className="text-xs text-gray-500">
                +{dayTasks.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const getUpcomingTasks = () => {
    const today = new Date();
    return tasks
      .filter(task => task.due_date && new Date(task.due_date) >= today)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600">Task deadlines and project timeline</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex">
          {/* Calendar Grid */}
          <div className="flex-1 p-6">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-0 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center font-medium text-gray-700 bg-gray-50 border border-gray-200">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-0">
              {renderCalendarDays()}
            </div>

            {/* Legend */}
            <div className="mt-6 flex items-center space-x-6">
              <span className="text-sm font-medium text-gray-700">Priority:</span>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-600">High</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span className="text-sm text-gray-600">Medium</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600">Low</span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-gray-200 p-6">
            {/* Daily Stand-up Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Daily Stand-up</h3>
                <button
                  onClick={() => setShowStandupModal(true)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Post Update
                </button>
              </div>
              
              {selectedProject && (
                <div className="mb-4">
                  <select
                    value={selectedProject.id}
                    onChange={(e) => setSelectedProject(projects.find(p => p.id == e.target.value))}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {standups.map(standup => (
                  <div key={standup._id} className="bg-gray-50 p-3 rounded border">
                    <div className="flex items-center space-x-2 mb-2">
                      <FiMessageSquare className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-sm">{standup.userName}</span>
                    </div>
                    <div className="text-xs space-y-1 text-black">
                      <div><strong className="text-black">Yesterday:</strong> {standup.yesterday}</div>
                      <div><strong className="text-black">Today:</strong> {standup.today}</div>
                      {standup.blockers && <div><strong className="text-black">Blockers:</strong> {standup.blockers}</div>}
                    </div>
                  </div>
                ))}
                {standups.length === 0 && (
                  <p className="text-gray-500 text-sm">No stand-up updates for today</p>
                )}
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Tasks</h3>
            <div className="space-y-3">
              {getUpcomingTasks().map(task => (
                <div key={task.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{task.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)} text-white`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{task.projectName}</p>
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <FiClock className="w-3 h-3" />
                      <span>{new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                    {task.assigned_to_name && (
                      <div className="flex items-center space-x-1">
                        <FiUser className="w-3 h-3" />
                        <span>{task.assigned_to_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {getUpcomingTasks().length === 0 && (
                <p className="text-gray-500 text-sm">No upcoming tasks with due dates</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Stand-up Modal */}
      {showStandupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Daily Stand-up Update</h3>
            <form onSubmit={submitStandup}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">What did you do yesterday?</label>
                <textarea
                  value={standupForm.yesterday}
                  onChange={(e) => setStandupForm({...standupForm, yesterday: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows="3"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">What will you do today?</label>
                <textarea
                  value={standupForm.today}
                  onChange={(e) => setStandupForm({...standupForm, today: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows="3"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Any blockers?</label>
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

export default Calendar;