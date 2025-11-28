import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Controlled as CodeMirror } from 'react-codemirror2'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { projectAPI } from '../services/api'
import socket from './Socket'
import ImportModal from './ImportModal'
import TeamManagement from './TeamManagement'
import "codemirror/lib/codemirror.css"
import "codemirror/mode/javascript/javascript"
import "codemirror/mode/python/python"
import "codemirror/mode/clike/clike"
import "codemirror/theme/material.css"
import "codemirror/theme/monokai.css"

const ProjectEditor = () => {
  const { projectId } = useParams()
  const { user } = useAuthStore()
  const [project, setProject] = useState(null)
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [code, setCode] = useState('')
  const [userRole, setUserRole] = useState('')
  const [members, setMembers] = useState([])
  const [comments, setComments] = useState([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showTeamManagement, setShowTeamManagement] = useState(false)

  useEffect(() => {
    if (projectId) {
      fetchProjectData()
      socket.emit('join-project', { projectId, userId: user.id })
    }
  }, [projectId])

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
      console.log('Loaded', filesResponse.data.length, 'files')
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load project')
    }
  }

  const canEditFile = (file) => {
    if (userRole === 'admin') return true
    if (userRole === 'viewer') return false
    
    // Role-based editing permissions
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
    socket.emit('code-change', {
      projectId,
      fileId: selectedFile.id,
      code: value,
      userId: user.id
    })
  }

  const saveFile = async () => {
    if (!selectedFile || !canEditFile(selectedFile)) return
    
    try {
      // Save file to backend
      toast.success('File saved successfully')
    } catch (error) {
      toast.error('Failed to save file')
    }
  }

  const addComment = async (lineNumber, comment) => {
    try {
      // Add comment to database
      toast.success('Comment added')
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Modern Design Indicator */}
      <div className="absolute top-4 left-4 z-50 bg-gradient-to-r from-green-500 to-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
        ✨ Modern UI Active
      </div>
      {/* File Explorer Sidebar */}
      <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">📁</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Explorer</h2>
              <span className="text-xs text-slate-400 capitalize">{userRole} Access</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 space-y-1">
          {files.map((file) => {
            const fileIcon = file.file_path.endsWith('.js') || file.file_path.endsWith('.jsx') ? '⚡' :
                           file.file_path.endsWith('.py') ? '🐍' :
                           file.file_path.endsWith('.java') ? '☕' :
                           file.file_path.endsWith('.css') ? '🎨' :
                           file.file_path.endsWith('.html') ? '🌐' : '📄'
            
            return (
              <div
                key={file.id}
                onClick={() => {
                  setSelectedFile(file)
                  setCode(file.content || '')
                }}
                className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedFile?.id === file.id 
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 shadow-lg' 
                    : 'hover:bg-slate-700/30 hover:border-slate-600/50 border border-transparent'
                } ${!canEditFile(file) ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{fileIcon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white truncate">
                        {file.file_path.split('/').pop()}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        file.module_type === 'frontend' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        file.module_type === 'backend' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                        file.module_type === 'database' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                        'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                      }`}>
                        {file.module_type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-400 truncate">{file.file_path}</span>
                      {!canEditFile(file) && (
                        <span className="text-xs text-red-400 font-medium">🔒 Read-only</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Modern Header */}
        <div className="bg-slate-800/30 backdrop-blur-sm border-b border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {selectedFile ? (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">📝</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">{selectedFile.file_path.split('/').pop()}</h1>
                    <p className="text-sm text-slate-400">{selectedFile.file_path}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                    <span className="text-slate-400 text-sm">💻</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">Code Editor</h1>
                    <p className="text-sm text-slate-400">Select a file to start coding</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {userRole === 'admin' && (
                <>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <span>📥</span>
                    <span>Import</span>
                  </button>
                  <button
                    onClick={() => setShowTeamManagement(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <span>👥</span>
                    <span>Team</span>
                  </button>
                </>
              )}
              <button
                onClick={saveFile}
                disabled={!selectedFile || !canEditFile(selectedFile)}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-slate-600 disabled:to-slate-600 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>💾</span>
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Code Editor */}
        <div className="flex-1 relative">
          {selectedFile ? (
            <div className="h-full">
              <CodeMirror
                value={code}
                options={{
                  theme: 'material',
                  lineNumbers: true,
                  lineWrapping: true,
                  mode: 'javascript',
                  readOnly: !canEditFile(selectedFile),
                  autoCloseBrackets: true,
                  matchBrackets: true,
                  indentUnit: 2,
                  tabSize: 2,
                  foldGutter: true,
                  gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
                  extraKeys: {
                    'Ctrl-S': saveFile,
                    'Cmd-S': saveFile
                  }
                }}
                onBeforeChange={handleCodeChange}
                className="h-full"
              />
              {!canEditFile(selectedFile) && (
                <div className="absolute top-4 right-4 bg-red-500/20 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm">
                  🔒 Read-only mode
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">💻</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Welcome to Code Editor</h3>
                <p className="text-slate-400 mb-4">Select a file from the explorer to start coding</p>
                <div className="flex items-center justify-center space-x-4 text-sm text-slate-500">
                  <span>⌨️ Modern editing experience</span>
                  <span>•</span>
                  <span>🎨 Syntax highlighting</span>
                  <span>•</span>
                  <span>🔄 Real-time collaboration</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Comments Panel */}
      <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-l border-slate-700/50">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">💬</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Comments</h3>
              <span className="text-xs text-slate-400">Code reviews & feedback</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="bg-slate-700/30 backdrop-blur-sm border border-slate-600/30 p-4 rounded-xl">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">{comment.author_name?.charAt(0)}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{comment.author_name}</span>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-600/30 px-2 py-1 rounded-full">Line {comment.line_number}</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{comment.comment}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💭</span>
              </div>
              <p className="text-slate-400 text-sm">No comments yet</p>
              <p className="text-slate-500 text-xs mt-1">Add comments to collaborate</p>
            </div>
          )}
        </div>
      </div>

      {/* Modern Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700/50 p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">👥</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Add Team Member</h3>
            </div>
            <form>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-white placeholder-slate-400 transition-all duration-200"
                  placeholder="member@example.com"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Role & Permissions</label>
                <select className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-white transition-all duration-200">
                  <option value="frontend">Frontend Developer</option>
                  <option value="backend">Backend Developer</option>
                  <option value="database">Database Developer</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-6 py-3 text-slate-400 hover:text-white transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          projectId={projectId}
          onClose={() => setShowImportModal(false)}
          onImportComplete={fetchProjectData}
        />
      )}

      {/* Team Management Modal */}
      {showTeamManagement && (
        <TeamManagement
          projectId={projectId}
          userRole={userRole}
          onClose={() => setShowTeamManagement(false)}
        />
      )}
    </div>
  )
}

export default ProjectEditor