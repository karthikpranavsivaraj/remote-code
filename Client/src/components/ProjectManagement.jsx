import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { projectAPI } from '../services/api'
import ImportModal from './ImportModal'
import GitHubCommitModal from './GitHubCommitModal'

const ProjectManagement = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [files, setFiles] = useState([])
  const [userRole, setUserRole] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newMember, setNewMember] = useState({ email: '', role: 'frontend', modules: [] })
  const [newTask, setNewTask] = useState({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' })
  const [isLiveRoomActive, setIsLiveRoomActive] = useState(false)
  const [showCommitModal, setShowCommitModal] = useState(false)
  const [showGitHubCommitModal, setShowGitHubCommitModal] = useState(false)
  const [uncommittedChanges, setUncommittedChanges] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [commitMessage, setCommitMessage] = useState('')
  console.log(userRole);
  useEffect(() => {
    fetchProjectData()
    
    // Listen for file changes from code editor
    const handleFileChange = () => {
      if (userRole === 'admin' || project?.admin_id === user?.id) {
        fetchUncommittedChanges()
      }
    }
    
    window.addEventListener('fileChanged', handleFileChange)
    return () => window.removeEventListener('fileChanged', handleFileChange)
  }, [projectId, userRole, project, user])

  const fetchProjectData = async () => {
    try {
      const [projectResponse, membersResponse, tasksResponse, filesResponse] = await Promise.all([
        projectAPI.getProjects(),
        projectAPI.getMembers(projectId),
        projectAPI.getTasks(projectId),
        projectAPI.getProjectFiles(projectId)
      ])

      const currentProject = projectResponse.data.find(p => p.id == projectId)
      if (currentProject) {
        setProject(currentProject)
      }

      setMembers(membersResponse.data)
      setTasks(tasksResponse.data)
      setFiles(filesResponse.data)
      
      // Set live room state from project data
      setIsLiveRoomActive(!!currentProject?.live_room_active)
      
      // Set role - if user is project admin, set as admin, otherwise get from members
      if (currentProject?.admin_id === user?.id) {
        console.log('User is admin, setting role to admin')
        setUserRole('admin')
        // Fetch uncommitted changes for admin
        fetchUncommittedChanges()
      } else {
        const currentMember = membersResponse.data.find(m => m.user_id === user?.id)
        console.log('Current member found:', currentMember)
        console.log('Setting role to:', currentMember?.role || 'empty')
        setUserRole(currentMember?.role || '')
      }
      
      console.log('=== DEBUG INFO ===')
      console.log('User ID:', user?.id)
      console.log('Project Admin ID:', currentProject?.admin_id)
      console.log('Members:', membersResponse.data)
      console.log('Live Room Active from DB:', currentProject?.live_room_active)
      console.log('Live Room Active state:', isLiveRoomActive)
    } catch (error) {
      toast.error('Failed to load project data')
    }
  }

  const addMember = async (e) => {
    e.preventDefault()
    try {
      console.log('Adding member with data:', {
        projectId,
        email: newMember.email,
        role: newMember.role,
        modules: newMember.modules
      })

      await projectAPI.addMember(projectId, newMember.email, newMember.role, newMember.modules)
      toast.success('Member added successfully')
      setShowAddMember(false)
      setNewMember({ email: '', role: 'frontend', modules: [] })
      fetchProjectData()
    } catch (error) {
      console.error('Add member error:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      toast.error(error.response?.data?.error || 'Failed to add member')
    }
  }

  const updateMemberRole = async (userId, role) => {
    try {
      await projectAPI.updateMember(projectId, parseInt(userId), { role })
      toast.success('Member role updated')
      fetchProjectData()
    } catch (error) {
      console.error('Update member error:', error)
      toast.error(error.response?.data?.error || 'Failed to update member')
    }
  }

  const removeMember = async (userId) => {
    if (window.confirm('Remove this member?')) {
      try {
        await projectAPI.removeMember(projectId, parseInt(userId))
        toast.success('Member removed')
        fetchProjectData()
      } catch (error) {
        console.error('Remove member error:', error)
        toast.error(error.response?.data?.error || 'Failed to remove member')
      }
    }
  }

  const createTask = async (e) => {
    e.preventDefault()
    try {
      const taskData = {
        ...newTask,
        assigned_to: newTask.assigned_to ? parseInt(newTask.assigned_to) : null
      }
      await projectAPI.createTask(projectId, taskData)
      toast.success('Task created')
      setShowAddTask(false)
      setNewTask({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' })
      fetchProjectData()
    } catch (error) {
      console.error('Create task error:', error)
      toast.error(error.response?.data?.error || 'Failed to create task')
    }
  }

  const updateTaskStatus = async (taskId, status) => {
    try {
      console.log('Updating task status:', { taskId, status })
      await projectAPI.updateTask(projectId, parseInt(taskId), { status })
      toast.success('Task updated')
      fetchProjectData()
    } catch (error) {
      console.error('Update task error:', error)
      toast.error(error.response?.data?.error || 'Failed to update task')
    }
  }

  const toggleLiveRoom = async () => {
    try {
      const newState = !isLiveRoomActive
      await projectAPI.toggleLiveRoom(projectId, newState)
      setIsLiveRoomActive(newState)
      if (newState) {
        toast.success('Live room activated! Team members can now join.')
      } else {
        toast.success('Live room deactivated.')
      }
    } catch (error) {
      toast.error('Failed to toggle live room')
    }
  }

  const handleModuleChange = (module, checked) => {
    if (checked) {
      setNewMember({ ...newMember, modules: [...newMember.modules, module] })
    } else {
      setNewMember({ ...newMember, modules: newMember.modules.filter(m => m !== module) })
    }
  }

  const fetchUncommittedChanges = async () => {
    try {
      const response = await projectAPI.getUncommittedChanges(projectId)
      setUncommittedChanges(response.data)
    } catch (error) {
      console.error('Failed to fetch uncommitted changes:', error)
    }
  }

  const handleCommit = async (e) => {
    e.preventDefault()
    if (selectedFiles.length === 0) {
      toast.error('Please select files to commit')
      return
    }
    
    try {
      await projectAPI.commitChanges(projectId, selectedFiles, commitMessage)
      toast.success('Changes committed successfully')
      setShowCommitModal(false)
      setSelectedFiles([])
      setCommitMessage('')
      fetchUncommittedChanges()
    } catch (error) {
      toast.error('Failed to commit changes')
    }
  }

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/projects')}
                className="text-blue-600 hover:text-blue-500 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Projects</span>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">{project?.name}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/editor/${projectId}`)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Open Code Editor
                </button>
                {(userRole === 'admin' || project?.admin_id === user?.id) && (
                  <button
                    onClick={toggleLiveRoom}
                    className={`px-4 py-2 rounded-lg text-white transition-colors ${
                      isLiveRoomActive 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isLiveRoomActive ? '🔴 Stop Live Room' : '🟢 Start Live Room'}
                  </button>
                )}
                {isLiveRoomActive && (
                  <button
                    onClick={() => {
                      console.log('Join Live Room clicked by user:', user?.username, 'with role:', userRole)
                      navigate(`/room/${projectId}`)
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    🚀 Join Live Room
                  </button>
                )}
              </div>
              <div className="bg-gray-100 px-3 py-1 rounded-full">
                <span className="text-sm text-gray-700 font-medium">Role: {userRole}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Live Room Status */}
        {isLiveRoomActive && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-green-600 text-lg">🟢</span>
              <span className="text-green-800 font-medium">Live Room Active</span>
              <span className="text-green-600 text-sm">- Team members can join for real-time collaboration</span>
            </div>
          </div>
        )}

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
            <p className="text-3xl font-bold text-blue-600">{members.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Tasks</h3>
            <p className="text-3xl font-bold text-green-600">{tasks.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Files</h3>
            <p className="text-3xl font-bold text-purple-600">{files.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Completed</h3>
            <p className="text-3xl font-bold text-orange-600">
              {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-6">
          {(userRole === 'admin' || project?.admin_id === user?.id) && (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Import from GitHub
              </button>
              <button
                onClick={() => setShowAddMember(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Add Member
              </button>
              <button
                onClick={() => setShowAddTask(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Create Task
              </button>
              {uncommittedChanges.length > 0 && (
                <>
                  <button
                    onClick={() => setShowCommitModal(true)}
                    className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 flex items-center space-x-2"
                  >
                    <span>📝</span>
                    <span>Review & Commit ({uncommittedChanges.length})</span>
                  </button>
                  <button
                    onClick={() => setShowGitHubCommitModal(true)}
                    className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 flex items-center space-x-2"
                  >
                    <span>🐙</span>
                    <span>Commit to GitHub</span>
                  </button>
                </>
              )}
            </>
          )}
          {!userRole && !project && (
            <div className="text-gray-500">Loading permissions...</div>
          )}
          {userRole && userRole !== 'admin' && project?.admin_id !== user?.id && (
            <div className="text-gray-600">View-only access (Role: {userRole})</div>
          )}
          <div className="text-xs text-gray-400 space-y-1">
            <div>Debug: Role={userRole}, AdminId={project?.admin_id}, UserId={user?.id}, IsAdmin={project?.admin_id === user?.id}</div>
            <div>Live Room Active: {isLiveRoomActive ? 'YES' : 'NO'}</div>
            <div>Should Show Join Button: {isLiveRoomActive ? 'YES' : 'NO'}</div>
            <div>Can Start/Stop Room: {(userRole === 'admin' || project?.admin_id === user?.id) ? 'YES' : 'NO'}</div>
          </div>
        </div>

        {/* Team Members Section */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.user_id} className="flex justify-between items-center p-4 bg-gray-50 rounded">
                  <div>
                    <h4 className="font-medium text-gray-900">{member.username}</h4>
                    <p className="text-sm text-gray-600">{member.email}</p>
                    <p className="text-xs text-gray-500">Modules: {(() => {
                      try {
                        const modules = typeof member.assigned_modules === 'string' ? JSON.parse(member.assigned_modules) : (Array.isArray(member.assigned_modules) ? member.assigned_modules : []);
                        return modules.join(', ') || 'None';
                      } catch (e) {
                        return 'None';
                      }
                    })()}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {(userRole === 'admin' || project?.admin_id === user?.id) && member.role !== 'admin' && (
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.user_id, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900"
                      >
                        <option value="frontend">Frontend</option>
                        <option value="backend">Backend</option>
                        <option value="database">Database</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}
                    <span className={`px-3 py-1 text-xs rounded-full ${member.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        member.role === 'frontend' ? 'bg-blue-100 text-blue-800' :
                          member.role === 'backend' ? 'bg-green-100 text-green-800' :
                            member.role === 'database' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                      }`}>
                      {member.role}
                    </span>
                    {(userRole === 'admin' || project?.admin_id === user?.id) && member.role !== 'admin' && (
                      <button
                        onClick={() => removeMember(member.user_id)}
                        className="text-red-600 hover:text-red-500 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Project Tasks</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="p-4 bg-gray-50 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <div className="flex items-center space-x-2">
                      <select
                        value={task.status}
                        onChange={(e) => {
                          console.log("Task ID:", task.id);
                          console.log("New Status:", e.target.value);
                          updateTaskStatus(task.id, e.target.value);
                        }}
                        className="text-sm text-gray-600 mb-2 bg-white text-gray-900"
                      >
                        <option value="todo" style={{ color: '#111827' }}>To Do</option>
                        <option value="in_progress" style={{ color: '#111827' }}>In Progress</option>
                        <option value="review" style={{ color: '#111827' }}>Review</option>
                        <option value="done" style={{ color: '#111827' }}>Done</option>
                      </select>
                      <span className={`px-2 py-1 text-xs rounded ${task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                        }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Assigned: {task.assigned_to_name || 'Unassigned'}</span>
                    <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</span>
                    <span>Created by: {task.created_by_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showImportModal && (
        <ImportModal
          projectId={projectId}
          onClose={() => setShowImportModal(false)}
          onImportComplete={fetchProjectData}
        />
      )}

      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Team Member</h3>
            <form onSubmit={addMember}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="Enter email address"
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                >
                  <option value="frontend" style={{ color: '#111827' }}>Frontend Developer</option>
                  <option value="backend" style={{ color: '#111827' }}>Backend Developer</option>
                  <option value="database" style={{ color: '#111827' }}>Database Developer</option>
                  <option value="viewer" style={{ color: '#111827' }}>Viewer</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-black-200 mb-2">Access Modules</label>
                <div className="block text-sm font-medium text-gray-700 dark:text-black-200 mb-2">
                  {['frontend', 'backend', 'database', 'shared'].map((module) => (
                    <label key={module} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newMember.modules.includes(module)}
                        onChange={(e) => handleModuleChange(module, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{module}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            <form onSubmit={createTask}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  rows="3"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Enter task description"
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  placeholder="Assign to"
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                >
                  <option value="low" style={{ color: '#111827' }}>Low</option>
                  <option value="medium" style={{ color: '#111827' }}>Medium</option>
                  <option value="high" style={{ color: '#111827' }}>High</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
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

      {showCommitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Review & Commit Changes</h3>
            <form onSubmit={handleCommit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Uncommitted Files:</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3">
                  {uncommittedChanges.map((file) => (
                    <label key={file.id} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{file.file_path}</div>
                        <div className="text-xs text-gray-500">
                          Modified by {file.last_edited_by_name} on {new Date(file.updated_at).toLocaleString()}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Commit Message</label>
                <textarea
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  rows="3"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Describe the changes being committed..."
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCommitModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                  disabled={selectedFiles.length === 0}
                >
                  Commit Selected Files ({selectedFiles.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGitHubCommitModal && (
        <GitHubCommitModal
          projectId={projectId}
          fileIds={uncommittedChanges.map(f => f.id)}
          onClose={() => setShowGitHubCommitModal(false)}
          onSuccess={() => {
            fetchUncommittedChanges()
            toast.success('Changes committed to GitHub!')
          }}
        />
      )}
    </div>
  )
}

export default ProjectManagement