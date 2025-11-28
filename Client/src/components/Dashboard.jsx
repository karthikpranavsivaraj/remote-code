import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiUser, FiClock, FiFlag, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import CodeFlaggingPanel from './CodeFlaggingPanel';
import CodeApprovalPanel from './CodeApprovalPanel';

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [codeReviews, setCodeReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kanban');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const projectsResponse = await api.get('/projects');
      setProjects(projectsResponse.data);

      // Fetch all tasks from all projects
      const allTasks = [];
      const allReviews = [];
      
      for (const project of projectsResponse.data) {
        try {
          const tasksResponse = await api.get(`/projects/${project.id}/tasks`);
          const projectTasks = tasksResponse.data.map(task => ({
            ...task,
            projectName: project.name,
            projectId: project.id
          }));
          allTasks.push(...projectTasks);

          // Mock code reviews - in real app, this would be a separate API
          const mockReviews = [
            {
              id: `${project.id}_1`,
              projectId: project.id,
              projectName: project.name,
              fileName: 'auth.js',
              filePath: '/src/auth/auth.js',
              author: 'John Doe',
              status: 'pending',
              priority: 'high',
              linesChanged: 45,
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              description: 'Added JWT authentication middleware'
            },
            {
              id: `${project.id}_2`,
              projectId: project.id,
              projectName: project.name,
              fileName: 'database.js',
              filePath: '/src/db/database.js',
              author: 'Jane Smith',
              status: 'approved',
              priority: 'medium',
              linesChanged: 23,
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              description: 'Optimized database queries'
            }
          ];
          allReviews.push(...mockReviews);
        } catch (error) {
          console.error(`Error fetching data for project ${project.id}:`, error);
        }
      }

      setTasks(allTasks);
      setCodeReviews(allReviews);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, projectId, newStatus) => {
    try {
      await api.put(`/projects/${projectId}/tasks/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const getBurndownData = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;
    
    return {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      todo: todoTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  };

  const KanbanBoard = () => {
    const columns = [
      { id: 'todo', title: 'To Do', color: 'bg-gray-100', tasks: getTasksByStatus('todo') },
      { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100', tasks: getTasksByStatus('in_progress') },
      { id: 'review', title: 'Review', color: 'bg-yellow-100', tasks: getTasksByStatus('review') },
      { id: 'done', title: 'Done', color: 'bg-green-100', tasks: getTasksByStatus('done') }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {columns.map(column => (
          <div key={column.id} className={`${column.color} p-4 rounded-lg`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">{column.title}</h3>
              <span className="bg-white px-2 py-1 rounded-full text-sm font-medium">
                {column.tasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {column.tasks.map(task => (
                <div
                  key={task.id}
                  className="bg-white p-3 rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/project/${task.projectId}`)}
                >
                  <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{task.projectName}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-1 rounded ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </span>
                    {task.assigned_to_name && (
                      <span className="text-gray-500">{task.assigned_to_name}</span>
                    )}
                  </div>
                  <div className="mt-2 flex space-x-1">
                    {['todo', 'in_progress', 'review', 'done'].map(status => (
                      <button
                        key={status}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(task.id, task.projectId, status);
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          task.status === status 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const BurndownChart = () => {
    const data = getBurndownData();
    
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-6">Project Progress</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{data.total}</div>
            <div className="text-sm text-gray-600">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{data.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{data.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{data.todo}</div>
            <div className="text-sm text-gray-600">To Do</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{data.completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-green-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${data.completionRate}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-black">Completed</span>
            </div>
            <span className="text-sm font-medium">{data.completed} tasks</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-black">In Progress</span>
            </div>
            <span className="text-sm font-medium">{data.inProgress} tasks</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-sm text-black">Remaining</span>
            </div>
            <span className="text-sm font-medium">{data.todo} tasks</span>
          </div>
        </div>
      </div>
    );
  };

  const CodeReviewPanel = () => {
    const [refreshKey, setRefreshKey] = useState(0);
    
    return (
      <div className="space-y-6">
        {projects.map(project => (
          <div key={project.id} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">{project.name}</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CodeFlaggingPanel 
                projectId={project.id} 
                onReviewCreated={() => setRefreshKey(prev => prev + 1)}
              />
              <CodeApprovalPanel 
                key={refreshKey}
                projectId={project.id} 
              />
            </div>
          </div>
        ))}
      </div>
    );
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.username}! Here's your project overview.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'kanban' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Kanban Board
        </button>
        <button
          onClick={() => setActiveTab('burndown')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'burndown' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Progress Chart
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'reviews' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Code Reviews
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'kanban' && <KanbanBoard />}
      {activeTab === 'burndown' && <BurndownChart />}
      {activeTab === 'reviews' && <CodeReviewPanel />}

      {/* Quick Actions */}
      <div className="mt-8 flex space-x-4">
        <button
          onClick={() => navigate('/projects')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <FiPlus className="w-4 h-4" />
          <span>New Project</span>
        </button>
        <button
          onClick={() => navigate('/calendar')}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <FiClock className="w-4 h-4" />
          <span>View Calendar</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;