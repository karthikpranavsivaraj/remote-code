import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiUsers, FiUser, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const Inbox = () => {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.chatId);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedChat) {
      // Join chat room for real-time updates
      socket.emit('join-chat', { chatId: selectedChat.chatId, userId: user.id });
      
      // Listen for new messages
      socket.on('chat-message-received', (messageData) => {
        if (messageData.chatId === selectedChat.chatId) {
          setMessages(prev => [...prev, {
            _id: Date.now().toString(),
            chatId: messageData.chatId,
            senderId: messageData.senderId,
            senderName: messageData.senderName,
            message: messageData.message,
            timestamp: messageData.timestamp
          }]);
          updateLastMessage(messageData.chatId, messageData.message);
        }
      });
    }

    return () => {
      if (selectedChat) {
        socket.emit('leave-chat', { chatId: selectedChat.chatId, userId: user.id });
        socket.off('chat-message-received');
      }
    };
  }, [selectedChat, user.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchProjects = async () => {
    try {
      console.log('Fetching chat projects...');
      const response = await api.get('/chat/projects');
      console.log('Chat projects response:', response.data);
      setProjects(response.data);
      // Auto-expand first project
      if (response.data.length > 0) {
        setExpandedProjects({ [response.data[0].id]: true });
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Fallback: try to get regular projects
      try {
        const fallbackResponse = await api.get('/projects');
        console.log('Fallback projects:', fallbackResponse.data);
        const projectsWithEmptyChats = fallbackResponse.data.map(project => ({
          ...project,
          teamChat: { chatId: `team_${project.id}`, chatType: 'team', participants: [] },
          members: [],
          directChats: []
        }));
        setProjects(projectsWithEmptyChats);
        if (projectsWithEmptyChats.length > 0) {
          setExpandedProjects({ [projectsWithEmptyChats[0].id]: true });
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const response = await api.get(`/chat/rooms/${chatId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const response = await api.post(`/chat/rooms/${selectedChat.chatId}/messages`, {
        message: newMessage
      });
      
      setMessages(prev => [...prev, response.data]);
      
      // Emit real-time message
      socket.emit('new-chat-message', {
        chatId: selectedChat.chatId,
        message: newMessage,
        senderId: user.id,
        senderName: user.username,
        messageType: 'text'
      });
      
      setNewMessage('');
      updateLastMessage(selectedChat.chatId, newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getChatDisplayName = (chat, project) => {
    if (chat.chatType === 'team') {
      return `${project.name} Team`;
    } else {
      return chat.memberInfo?.username || 'Direct Message';
    }
  };

  const updateLastMessage = (chatId, message) => {
    setProjects(prev => prev.map(project => ({
      ...project,
      teamChat: project.teamChat.chatId === chatId 
        ? { ...project.teamChat, lastMessage: message, lastMessageTime: new Date() }
        : project.teamChat,
      directChats: project.directChats.map(chat => 
        chat.chatId === chatId 
          ? { ...chat, lastMessage: message, lastMessageTime: new Date() }
          : chat
      )
    })));
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
      <div className="bg-white rounded-lg shadow-lg h-[600px] flex">
        {/* Project-based Chat List Sidebar */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Team Chats</h1>
            <p className="text-sm text-gray-600">Project-based messaging</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No projects found.</p>
                <p className="text-sm mt-2">Join a project to start chatting with your team.</p>
              </div>
            ) : (
              projects.map(project => (
              <div key={project.id} className="border-b border-gray-100">
                {/* Project Header */}
                <div 
                  onClick={() => toggleProject(project.id)}
                  className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    {expandedProjects[project.id] ? 
                      <FiChevronDown className="w-4 h-4 text-gray-500" /> : 
                      <FiChevronRight className="w-4 h-4 text-gray-500" />
                    }
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                  </div>
                  <span className="text-xs text-gray-500">{project.members.length + 1} members</span>
                </div>

                {/* Project Chats */}
                {expandedProjects[project.id] && (
                  <div className="pb-2">
                    {/* Team Chat */}
                    <div
                      onClick={() => setSelectedChat({ ...project.teamChat, projectName: project.name })}
                      className={`mx-4 mb-2 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedChat?.chatId === project.teamChat.chatId 
                          ? 'bg-blue-100 border border-blue-300' 
                          : 'hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <FiUsers className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900">Team Chat</span>
                        {project.teamChat.lastMessageTime && (
                          <span className="text-xs text-gray-500 ml-auto">
                            {formatTime(project.teamChat.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      {project.teamChat.lastMessage && (
                        <p className="text-sm text-gray-600 truncate ml-6">
                          {project.teamChat.lastMessage}
                        </p>
                      )}
                    </div>

                    {/* Direct Messages with Members */}
                    {project.directChats.map(chat => (
                      <div
                        key={chat.chatId}
                        onClick={() => setSelectedChat({ ...chat, projectName: project.name })}
                        className={`mx-4 mb-2 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedChat?.chatId === chat.chatId 
                            ? 'bg-green-100 border border-green-300' 
                            : 'hover:bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <FiUser className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-gray-900">{chat.memberInfo.username}</span>
                          <span className="text-xs text-gray-500 capitalize">{chat.memberInfo.role}</span>
                          {chat.lastMessageTime && (
                            <span className="text-xs text-gray-500 ml-auto">
                              {formatTime(chat.lastMessageTime)}
                            </span>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className="text-sm text-gray-600 truncate ml-6">
                            {chat.lastMessage}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">
                  {selectedChat.chatType === 'team' 
                    ? `${selectedChat.projectName} - Team Chat`
                    : `${selectedChat.memberInfo?.username || 'Direct Message'}`
                  }
                </h2>
                <p className="text-sm text-gray-600">
                  {selectedChat.chatType === 'team' 
                    ? `Project: ${selectedChat.projectName}` 
                    : `${selectedChat.projectName} - ${selectedChat.memberInfo?.role || 'Member'}`
                  }
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <div
                    key={message._id}
                    className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === user.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}>
                      {message.senderId !== user.id && (
                        <p className="text-xs font-medium mb-1 opacity-75">
                          {message.senderName}
                        </p>
                      )}
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderId === user.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiSend className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a chat</h3>
                <p className="text-gray-600">Choose a team or direct message to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default Inbox;