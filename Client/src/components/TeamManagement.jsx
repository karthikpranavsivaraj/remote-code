import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { projectAPI } from '../services/api'

const TeamManagement = ({ projectId, userRole, onClose }) => {
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [activeTab, setActiveTab] = useState('members')
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', assigned_to: '', priority: 'medium' })

  useEffect(() => {
    fetchMembers()
    fetchTasks()
  }, [projectId])

  const fetchMembers = async () => {
    try {
      const response = await projectAPI.getMembers(projectId)
      setMembers(response.data)
    } catch (error) {
      toast.error('Failed to fetch members')
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await projectAPI.getTasks(projectId)
      setTasks(response.data)
    } catch (error) {
      toast.error('Failed to fetch tasks')
    }
  }

  const updateMemberRole = async (userId, role) => {
    try {
      await projectAPI.updateMember(projectId, userId, { role })
      toast.success('Member role updated')
      fetchMembers()
    } catch (error) {
      toast.error('Failed to update member')
    }
  }

  const removeMember = async (userId) => {
    if (window.confirm('Remove this member from the project?')) {
      try {
        await projectAPI.removeMember(projectId, userId)
        toast.success('Member removed')
        fetchMembers()
      } catch (error) {
        toast.error('Failed to remove member')
      }
    }
  }

  const createTask = async (e) => {
    e.preventDefault()
    try {
      await projectAPI.createTask(projectId, newTask)
      toast.success('Task created')
      setShowAddTask(false)
      setNewTask({ title: '', description: '', assigned_to: '', priority: 'medium' })
      fetchTasks()
    } catch (error) {
      toast.error('Failed to create task')
    }
  }

  const updateTaskStatus = async (taskId, status) => {
    try {
      await projectAPI.updateTask(projectId, taskId, { status })
      toast.success('Task updated')
      fetchTasks()
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-4xl h-3/4 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Project Management</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded ${activeTab === 'members' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Team Members
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Tasks
          </button>
        </div>

        <div className="overflow-auto h-full">
          {/* Members Tab */}
          {activeTab === 'members' && (
            <div>
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.user_id} className="bg-gray-700 p-4 rounded flex justify-between items-center">
                    <div>
                      <h4 className="text-white font-medium">{member.username}</h4>
                      <p className="text-gray-400 text-sm">{member.email}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {userRole === 'admin' && member.role !== 'admin' && (
                        <select
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.user_id, e.target.value)}
                          className="bg-gray-600 text-white px-2 py-1 rounded text-sm"
                        >
                          <option value="frontend">Frontend</option>
                          <option value="backend">Backend</option>
                          <option value="database">Database</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                      <span className={`px-2 py-1 text-xs rounded ${
                        member.role === 'admin' ? 'bg-purple-600' :
                        member.role === 'frontend' ? 'bg-blue-600' :
                        member.role === 'backend' ? 'bg-green-600' :
                        member.role === 'database' ? 'bg-yellow-600' :
                        'bg-gray-600'
                      } text-white`}>
                        {member.role}
                      </span>
                      {userRole === 'admin' && member.role !== 'admin' && (
                        <button
                          onClick={() => removeMember(member.user_id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg text-white">Project Tasks</h3>
                <button
                  onClick={() => setShowAddTask(true)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Add Task
                </button>
              </div>

              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="bg-gray-700 p-4 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-white font-medium">{task.title}</h4>
                      <div className="flex items-center space-x-2">
                        <select
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                          className="bg-gray-600 text-white px-2 py-1 rounded text-xs"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="done">Done</option>
                        </select>
                        <span className={`px-2 py-1 text-xs rounded ${
                          task.priority === 'high' ? 'bg-red-600' :
                          task.priority === 'medium' ? 'bg-yellow-600' :
                          'bg-green-600'
                        } text-white`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{task.description}</p>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Assigned to: {task.assigned_to_name || 'Unassigned'}</span>
                      <span>Created by: {task.created_by_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Add Task Modal */}
        {showAddTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-white">Create New Task</h3>
              <form onSubmit={createTask}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-white">Title</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-white">Description</label>
                  <textarea
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    rows="3"
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-white">Assign to</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-white">Priority</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddTask(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TeamManagement