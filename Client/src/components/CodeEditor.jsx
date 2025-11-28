import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Controlled as CodeMirror } from 'react-codemirror2'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { projectAPI, commentsAPI } from '../services/api'
import socket from './Socket'
import "codemirror/lib/codemirror.css"
import "codemirror/mode/javascript/javascript"
import "codemirror/mode/python/python"
import "codemirror/mode/clike/clike"
import "codemirror/theme/dracula.css"

const CodeEditor = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [project, setProject] = useState(null)
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [code, setCode] = useState('')
  const [userRole, setUserRole] = useState('')
  const [comments, setComments] = useState([])
  const [showAddComment, setShowAddComment] = useState(false)
  const [newComment, setNewComment] = useState({ line_number: 1, comment: '', subtasks: [''] })
  const [selectedLine, setSelectedLine] = useState(null)
  const [showTerminal, setShowTerminal] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState([])
  const [cursors, setCursors] = useState({})

  useEffect(() => {
    if (projectId) {
      fetchProjectData()
      socket.emit('join-project', { 
        projectId, 
        userId: user.id, 
        username: user.username,
        role: userRole 
      })
    }

    // Socket event listeners
    socket.on('user-joined', (userData) => {
      setConnectedUsers(prev => [...prev.filter(u => u.userId !== userData.userId), userData])
      toast.success(`${userData.username} joined the session`)
    })

    socket.on('user-left', (userData) => {
      setConnectedUsers(prev => prev.filter(u => u.userId !== userData.userId))
      setCursors(prev => {
        const newCursors = {...prev}
        delete newCursors[userData.userId]
        return newCursors
      })
      toast(`${userData.username} left the session`)
    })

    socket.on('code-change', (data) => {
      if (data.userId !== user.id && data.fileId === selectedFile?.id) {
        setCode(data.code)
      }
    })

    socket.on('cursor-position', (data) => {
      if (data.userId !== user.id) {
        setCursors(prev => ({...prev, [data.userId]: data}))
      }
    })

    socket.on('file-changed', (data) => {
      if (data.userId !== user.id) {
        toast(`${data.username} switched to ${data.fileName}`)
      }
    })

    return () => {
      socket.off('user-joined')
      socket.off('user-left')
      socket.off('code-change')
      socket.off('cursor-position')
      socket.off('file-changed')
    }
  }, [projectId, userRole, selectedFile, user])

  useEffect(() => {
    if (selectedFile) {
      fetchComments()
    }
  }, [selectedFile])

  const fetchProjectData = async () => {
    try {
      const [projectResponse, filesResponse] = await Promise.all([
        projectAPI.getProjects(),
        projectAPI.getProjectFiles(projectId)
      ])
      
      const currentProject = projectResponse.data.find(p => p.id == projectId)
      if (currentProject) {
        setProject(currentProject)
        setUserRole(currentProject.role)
      }
      
      setFiles(filesResponse.data)
    } catch (error) {
      toast.error('Failed to load project')
    }
  }

  const canEditFile = (file) => {
    if (userRole === 'admin') return true
    if (userRole === 'viewer') return false
    
    const roleModules = {
      'frontend': ['frontend', 'shared'],
      'backend': ['backend', 'shared'], 
      'database': ['database', 'shared']
    }
    
    return roleModules[userRole]?.includes(file.module_type)
  }

  const handleCodeChange = (editor, data, value) => {
    if (!canEditFile(selectedFile)) {
      toast.error('You do not have permission to edit this file')
      return
    }
    
    setCode(value)
    
    // Auto-save after 2 seconds of no changes
    clearTimeout(window.autoSaveTimeout)
    window.autoSaveTimeout = setTimeout(() => {
      autoSaveFile(value)
    }, 2000)
    
    socket.emit('code-change', {
      projectId,
      fileId: selectedFile.id,
      code: value,
      userId: user.id,
      username: user.username,
      fileName: selectedFile.file_path
    })

    // Emit cursor position
    const cursor = editor.getCursor()
    socket.emit('cursor-position', {
      projectId,
      fileId: selectedFile.id,
      userId: user.id,
      username: user.username,
      line: cursor.line,
      ch: cursor.ch
    })
  }

  const autoSaveFile = async (content) => {
    if (!selectedFile || !canEditFile(selectedFile)) return
    
    try {
      await projectAPI.saveFile(projectId, selectedFile.id, content)
      toast.success('Auto-saved', { duration: 1000 })
      
      // Refresh project data to show uncommitted changes
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('fileChanged'))
      }, 500)
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }

  const fetchComments = async () => {
    if (!selectedFile) return
    try {
      const response = await commentsAPI.getFileComments(selectedFile.id)
      setComments(response.data)
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    }
  }

  const addComment = async (e) => {
    e.preventDefault()
    if (!selectedFile) return
    
    try {
      const filteredSubtasks = newComment.subtasks.filter(task => task.trim() !== '')
      await commentsAPI.addComment(
        selectedFile.id, 
        newComment.line_number, 
        newComment.comment,
        filteredSubtasks
      )
      toast.success('Comment added successfully')
      setShowAddComment(false)
      setNewComment({ line_number: 1, comment: '', subtasks: [''] })
      fetchComments()
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  const addSubtask = () => {
    setNewComment({...newComment, subtasks: [...newComment.subtasks, '']})
  }

  const updateSubtask = (index, value) => {
    const updatedSubtasks = [...newComment.subtasks]
    updatedSubtasks[index] = value
    setNewComment({...newComment, subtasks: updatedSubtasks})
  }

  const removeSubtask = (index) => {
    const updatedSubtasks = newComment.subtasks.filter((_, i) => i !== index)
    setNewComment({...newComment, subtasks: updatedSubtasks})
  }

  const saveFile = async () => {
    if (!selectedFile || !canEditFile(selectedFile)) return
    
    try {
      await projectAPI.saveFile(projectId, selectedFile.id, code)
      toast.success('File saved successfully')
    } catch (error) {
      toast.error('Failed to save file')
    }
  }

  const executeCode = async () => {
    if (!selectedFile || !code.trim()) {
      toast.error('No code to execute')
      return
    }

    const language = getLanguageFromFile(selectedFile.file_path)
    if (!['javascript', 'java'].includes(language)) {
      toast.error('Only JavaScript and Java execution supported')
      return
    }

    setIsExecuting(true)
    setShowTerminal(true)
    setTerminalOutput('Executing code...\n')

    try {
      const response = await fetch('http://localhost:5000/api/code/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          code,
          language,
          filename: selectedFile.file_path
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setTerminalOutput(prev => prev + '\n--- Output ---\n' + result.output)
      } else {
        setTerminalOutput(prev => prev + '\n--- Error ---\n' + result.error)
      }
    } catch (error) {
      setTerminalOutput(prev => prev + '\n--- Error ---\n' + error.message)
    } finally {
      setIsExecuting(false)
    }
  }

  const getLanguageFromFile = (filePath) => {
    const ext = filePath.split('.').pop().toLowerCase()
    const langMap = {
      'js': 'javascript',
      'jsx': 'javascript', 
      'java': 'java'
    }
    return langMap[ext] || 'unknown'
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="text-blue-400 hover:text-blue-300"
          >
            ← Back to Project
          </button>
          <span className="text-lg font-semibold">{project?.name} - Code Editor</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Role: {userRole}</span>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Online:</span>
              {connectedUsers.slice(0, 3).map((user, index) => (
                <div
                  key={user.userId}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-600' :
                    user.role === 'frontend' ? 'bg-blue-600' :
                    user.role === 'backend' ? 'bg-green-600' :
                    user.role === 'database' ? 'bg-yellow-600' :
                    'bg-gray-600'
                  }`}
                  title={`${user.username} (${user.role})`}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
              ))}
              {connectedUsers.length > 3 && (
                <span className="text-xs text-gray-400">+{connectedUsers.length - 3}</span>
              )}
            </div>
          </div>
          <button
            onClick={saveFile}
            disabled={!selectedFile || !canEditFile(selectedFile)}
            className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={executeCode}
            disabled={!selectedFile || isExecuting || !['javascript', 'java'].includes(getLanguageFromFile(selectedFile?.file_path || ''))}
            className="bg-orange-600 px-3 py-1 rounded text-sm hover:bg-orange-700 disabled:opacity-50"
          >
            {isExecuting ? 'Running...' : 'Run'}
          </button>
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className="bg-gray-600 px-3 py-1 rounded text-sm hover:bg-gray-700"
          >
            Terminal
          </button>
        </div>
      </div>

      {/* File Tree Sidebar */}
      <div className="w-1/4 bg-gray-800 border-r border-gray-700 mt-16">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Project Files</h2>
        </div>
        
        <div className="p-4 overflow-auto h-full">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => {
                setSelectedFile(file)
                setCode(file.content || '')
                socket.emit('file-changed', {
                  projectId,
                  fileId: file.id,
                  fileName: file.file_path,
                  userId: user.id,
                  username: user.username
                })
              }}
              className={`p-2 rounded cursor-pointer mb-1 ${
                selectedFile?.id === file.id ? 'bg-blue-600' : 'hover:bg-gray-700'
              } ${!canEditFile(file) ? 'opacity-50' : ''}`}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm truncate">{file.file_path}</span>
                <div className="flex items-center space-x-1">
                  <span className={`text-xs px-2 py-1 rounded ${
                    file.module_type === 'frontend' ? 'bg-blue-500' :
                    file.module_type === 'backend' ? 'bg-green-500' :
                    file.module_type === 'database' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`}>
                    {file.module_type}
                  </span>
                  {canEditFile(file) ? (
                    <span className="text-xs text-green-400">✎</span>
                  ) : (
                    <span className="text-xs text-red-400">🔒</span>
                  )}
                </div>
              </div>
              {!canEditFile(file) && (
                <span className="text-xs text-red-400">Read-only for {userRole}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col mt-16">
        <div className={`flex-1 ${showTerminal ? 'h-1/2' : 'h-full'}`}>
          {selectedFile ? (
            <CodeMirror
              value={code}
              options={{
                theme: 'dracula',
                lineNumbers: true,
                mode: getFileMode(selectedFile.file_path),
                readOnly: !canEditFile(selectedFile),
                lineWrapping: true
              }}
              onBeforeChange={handleCodeChange}
              className="h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <h3 className="text-xl mb-2">Select a file to start editing</h3>
                <p className="text-sm">Choose a file from the sidebar to begin coding</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Terminal Panel */}
        {showTerminal && (
          <div className="h-1/2 bg-black border-t border-gray-600 flex flex-col">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-600 flex justify-between items-center">
              <span className="text-sm text-gray-300">Terminal Output</span>
              <button
                onClick={() => setTerminalOutput('')}
                className="text-xs text-gray-400 hover:text-gray-200"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                {terminalOutput || 'Ready to execute code...'}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Comments Sidebar */}
      <div className="w-1/4 bg-gray-800 border-l border-gray-700 mt-16 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Comments & Reviews</h3>
          {selectedFile && (
            <button
              onClick={() => setShowAddComment(true)}
              className="bg-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-700"
            >
              Add Comment
            </button>
          )}
        </div>
        
        <div className="flex-1 p-4 space-y-3 overflow-auto">
          {selectedFile && (
            <div className="text-sm text-gray-400 mb-4">
              Comments for: {selectedFile.file_path}
              <div className="text-xs text-gray-500 mt-1">
                {canEditFile(selectedFile) ? 'You can edit this file' : 'Read-only access'}
              </div>
            </div>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-700 p-3 rounded">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-blue-300">{comment.author_name}</span>
                <span className="text-xs text-gray-400">Line {comment.line_number}</span>
              </div>
              <div className="text-xs text-gray-400 mb-2">{comment.formatted_date}</div>
              <p className="text-sm text-gray-300 mb-3">{comment.comment}</p>
              {comment.subtasks && (() => {
                try {
                  const subtasks = JSON.parse(comment.subtasks)
                  return subtasks.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-400 mb-1">Subtasks:</div>
                      <ul className="text-xs text-gray-300 space-y-1">
                        {subtasks.map((task, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-yellow-400 mr-1">•</span>
                            {task}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                } catch (e) {
                  return null
                }
              })()}
            </div>
          ))}
          {comments.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <p>No comments yet</p>
              <p className="text-xs mt-2">Click "Add Comment" to start reviewing code</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Comment Modal */}
      {showAddComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md text-white">
            <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
            <form onSubmit={addComment}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Line Number</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                  value={newComment.line_number || 1}
                  onChange={(e) => setNewComment({...newComment, line_number: parseInt(e.target.value) || 1})}
                  style={{ color: 'white', backgroundColor: '#374151' }}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Comment</label>
                <textarea
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                  rows="3"
                  value={newComment.comment}
                  onChange={(e) => setNewComment({...newComment, comment: e.target.value})}
                  placeholder="Enter your comment or review..."
                  style={{ color: 'white', backgroundColor: '#374151' }}
                />
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-300">Subtasks (optional)</label>
                  <button
                    type="button"
                    onClick={addSubtask}
                    className="bg-green-600 px-2 py-1 rounded text-xs hover:bg-green-700"
                  >
                    Add Subtask
                  </button>
                </div>
                {newComment.subtasks.map((subtask, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                      value={subtask}
                      onChange={(e) => updateSubtask(index, e.target.value)}
                      placeholder={`Subtask ${index + 1}`}
                      style={{ color: 'white', backgroundColor: '#374151' }}
                    />
                    {newComment.subtasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSubtask(index)}
                        className="ml-2 text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddComment(false)}
                  className="px-4 py-2 text-gray-400 hover:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add Comment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to determine CodeMirror mode based on file extension
const getFileMode = (filePath) => {
  const ext = filePath.split('.').pop().toLowerCase()
  
  const modeMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'javascript',
    'tsx': 'javascript',
    'py': 'python',
    'java': 'text/x-java',
    'cpp': 'text/x-c++src',
    'c': 'text/x-csrc',
    'css': 'css',
    'html': 'htmlmixed',
    'json': 'application/json',
    'sql': 'sql',
    'php': 'php'
  }
  
  return modeMap[ext] || 'text'
}

export default CodeEditor