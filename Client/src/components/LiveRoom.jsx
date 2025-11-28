import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { projectAPI } from '../services/api'
import { UnControlled as CodeMirror } from 'react-codemirror2'
import io from 'socket.io-client'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/material.css'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/mode/python/python'
import 'codemirror/mode/clike/clike'

const LiveRoom = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [project, setProject] = useState(null)
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [connectedUsers, setConnectedUsers] = useState([])
  const [code, setCode] = useState('')
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [chatId, setChatId] = useState('')
  const socketRef = useRef(null)
  const editorRef = useRef(null)
  const localStreamRef = useRef(null)
  const peerConnectionsRef = useRef({})

  useEffect(() => {
    fetchProjectData()
    initializeSocket()
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [projectId])

  useEffect(() => {
    if (selectedFile) {
      setCode(selectedFile.content || '')
      if (socketRef.current) {
        socketRef.current.emit('join-file', { fileId: selectedFile.id, projectId })
      }
    }
  }, [selectedFile])

  const fetchProjectData = async () => {
    try {
      const [projectResponse, filesResponse] = await Promise.all([
        projectAPI.getProjects(),
        projectAPI.getProjectFiles(projectId)
      ])

      const currentProject = projectResponse.data.find(p => p.id == projectId)
      setProject(currentProject)
      setFiles(filesResponse.data)
    } catch (error) {
      toast.error('Failed to load project data')
      navigate('/projects')
    }
  }

  const initializeSocket = () => {
    socketRef.current = io('http://localhost:5000')
    
    socketRef.current.emit('join-project', {
      projectId,
      user: { id: user.id, username: user.username }
    })

    socketRef.current.on('user-joined', (userData) => {
      setConnectedUsers(prev => [...prev.filter(u => u.id !== userData.id), userData])
      toast.success(`${userData.username} joined the room`)
    })

    socketRef.current.on('user-left', (userData) => {
      setConnectedUsers(prev => prev.filter(u => u.id !== userData.id))
      toast.success(`${userData.username} left the room`)
    })

    socketRef.current.on('code-change', ({ code: newCode, fileId }) => {
      if (selectedFile?.id === fileId) {
        setCode(newCode)
      }
    })

    socketRef.current.on('project-users', (users) => {
      setConnectedUsers(users)
    })

    // WebRTC signaling
    socketRef.current.on('audio-offer', async ({ offer, from }) => {
      await handleAudioOffer(offer, from)
    })

    socketRef.current.on('audio-answer', async ({ answer, from }) => {
      await handleAudioAnswer(answer, from)
    })

    socketRef.current.on('ice-candidate', async ({ candidate, from }) => {
      await handleIceCandidate(candidate, from)
    })

    // Chat events
    const teamChatId = `team_${projectId}`
    setChatId(teamChatId)
    socketRef.current.emit('join-chat', { chatId: teamChatId, userId: user.id })
    
    socketRef.current.on('chat-message-received', (messageData) => {
      setMessages(prev => [...prev, messageData])
    })

    // Load existing messages
    loadChatMessages(teamChatId)
  }

  const handleCodeChange = (editor, data, value) => {
    setCode(value)
    if (socketRef.current && selectedFile) {
      socketRef.current.emit('code-change', {
        code: value,
        fileId: selectedFile.id,
        projectId,
        user: { id: user.id, username: user.username }
      })
    }
  }

  const saveFile = async () => {
    if (!selectedFile) return
    try {
      await projectAPI.saveFile(projectId, selectedFile.id, code)
      toast.success('File saved successfully')
    } catch (error) {
      toast.error('Failed to save file')
    }
  }

  const getFileMode = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'js': case 'jsx': case 'ts': case 'tsx': return 'javascript'
      case 'py': return 'python'
      case 'java': case 'c': case 'cpp': case 'h': return 'clike'
      default: return 'javascript'
    }
  }

  // Audio chat functions
  const startAudioChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      setIsAudioEnabled(true)
      toast.success('Audio chat enabled')
      
      // Create peer connections for existing users
      connectedUsers.forEach(user => {
        if (user.id !== user?.id) {
          createPeerConnection(user.id)
        }
      })
    } catch (error) {
      toast.error('Failed to access microphone')
    }
  }

  const stopAudioChat = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close())
    peerConnectionsRef.current = {}
    
    setIsAudioEnabled(false)
    setIsMuted(false)
    toast.success('Audio chat disabled')
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  const createPeerConnection = async (userId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    peerConnectionsRef.current[userId] = pc

    // Add local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current)
      })
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const remoteAudio = document.getElementById(`audio-${userId}`)
      if (remoteAudio) {
        remoteAudio.srcObject = event.streams[0]
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          to: userId,
          from: user.id
        })
      }
    }

    // Create and send offer
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    
    if (socketRef.current) {
      socketRef.current.emit('audio-offer', {
        offer,
        to: userId,
        from: user.id
      })
    }
  }

  const handleAudioOffer = async (offer, from) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    peerConnectionsRef.current[from] = pc

    // Add local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current)
      })
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const remoteAudio = document.getElementById(`audio-${from}`)
      if (remoteAudio) {
        remoteAudio.srcObject = event.streams[0]
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          to: from,
          from: user.id
        })
      }
    }

    await pc.setRemoteDescription(offer)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    if (socketRef.current) {
      socketRef.current.emit('audio-answer', {
        answer,
        to: from,
        from: user.id
      })
    }
  }

  const handleAudioAnswer = async (answer, from) => {
    const pc = peerConnectionsRef.current[from]
    if (pc) {
      await pc.setRemoteDescription(answer)
    }
  }

  const handleIceCandidate = async (candidate, from) => {
    const pc = peerConnectionsRef.current[from]
    if (pc) {
      await pc.addIceCandidate(candidate)
    }
  }

  const loadChatMessages = async (chatId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/chat/rooms/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/chat/rooms/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessage })
      })

      if (response.ok) {
        const messageData = await response.json()
        setMessages(prev => [...prev, messageData])
        
        // Emit to other users
        socketRef.current.emit('new-chat-message', {
          chatId,
          message: newMessage,
          senderId: user.id,
          senderName: user.username
        })
        
        setNewMessage('')
      }
    } catch (error) {
      toast.error('Failed to send message')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/project/${projectId}`)}
                className="text-blue-600 hover:text-blue-500"
              >
                ← Back to Project
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                🔴 Live Room: {project?.name}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Connected:</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                    {connectedUsers.length} users
                  </span>
                </div>
                
                {/* Audio Controls */}
                <div className="flex items-center space-x-2">
                  {!isAudioEnabled ? (
                    <button
                      onClick={startAudioChat}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center space-x-1"
                    >
                      <span>🎤</span>
                      <span>Join Audio</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={toggleMute}
                        className={`px-3 py-1 rounded text-sm flex items-center space-x-1 ${
                          isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                        } text-white`}
                      >
                        <span>{isMuted ? '🔇' : '🎤'}</span>
                        <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                      </button>
                      <button
                        onClick={stopAudioChat}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center space-x-1"
                      >
                        <span>📞</span>
                        <span>Leave</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* File Explorer */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Project Files</h2>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left p-3 rounded hover:bg-gray-50 ${
                        selectedFile?.id === file.id ? 'bg-blue-50 border border-blue-200' : ''
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {file.file_path.split('/').pop()}
                      </div>
                      <div className="text-xs text-gray-500">{file.file_path}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Code Editor Area */}
            <div className="lg:col-span-3 bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedFile ? selectedFile.file_path : 'Select a file to start coding'}
                </h2>
              </div>
              <div className="p-6">
                {selectedFile ? (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Live collaboration active</span>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                      <button
                        onClick={saveFile}
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                      >
                        Save File
                      </button>
                    </div>
                    <div className="border rounded">
                      <CodeMirror
                        ref={editorRef}
                        value={code}
                        options={{
                          mode: getFileMode(selectedFile.file_path),
                          theme: 'material',
                          lineNumbers: true,
                          lineWrapping: true,
                          autoCloseBrackets: true,
                          matchBrackets: true,
                          indentUnit: 2,
                          tabSize: 2,
                          extraKeys: {
                            'Ctrl-S': saveFile,
                            'Cmd-S': saveFile
                          }
                        }}
                        onChange={handleCodeChange}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📁</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Welcome to Live Room
                    </h3>
                    <p className="text-gray-600">
                      Select a file from the left panel to start collaborative coding
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Panel */}
            <div className="bg-white shadow rounded-lg h-96">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Team Chat</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 h-64">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs rounded-lg p-2 ${
                      msg.senderId === user.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {msg.senderId !== user.id && (
                        <p className="text-xs font-medium mb-1">{msg.senderName}</p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.senderId === user.id ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} className="p-3 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Connected Users */}
          <div className="mt-6 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Connected Team Members</h2>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-4">
                {connectedUsers.map((connectedUser) => (
                  <div key={connectedUser.id} className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                      {connectedUser.username?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-900 text-sm font-medium">
                      {connectedUser.username} {connectedUser.id === user?.id ? '(You)' : ''}
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Online</span>
                    {isAudioEnabled && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">🎤</span>
                    )}
                    {/* Hidden audio element for remote streams */}
                    {connectedUser.id !== user?.id && (
                      <audio
                        id={`audio-${connectedUser.id}`}
                        autoPlay
                        style={{ display: 'none' }}
                      />
                    )}
                  </div>
                ))}
                {connectedUsers.length === 0 && (
                  <div className="text-gray-500 text-sm">No users connected</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveRoom