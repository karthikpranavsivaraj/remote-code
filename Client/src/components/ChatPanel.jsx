import { useState, useRef, useEffect } from 'react'
import { SendIcon, PaperclipIcon, SmileIcon } from 'lucide-react'

const ChatPanel = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: 'Alice Johnson',
      avatar: 'AJ',
      message: 'Hey team! Just pushed the latest updates to the main branch.',
      time: '2:30 PM',
      isOwn: false
    },
    {
      id: 2,
      user: 'You',
      avatar: 'ME',
      message: 'Great work! I\'ll review the changes shortly.',
      time: '2:32 PM',
      isOwn: true
    },
    {
      id: 3,
      user: 'Bob Smith',
      avatar: 'BS',
      message: 'The new authentication flow looks solid. Nice job!',
      time: '2:35 PM',
      isOwn: false
    }
  ])
  
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const message = {
      id: messages.length + 1,
      user: 'You',
      avatar: 'ME',
      message: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true
    }

    setMessages([...messages, message])
    setNewMessage('')
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-96 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Team Chat</h3>
        <p className="text-sm text-gray-500">3 members online</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start space-x-2 max-w-xs ${msg.isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className="w-8 h-8 bg-[#244855] rounded-full flex items-center justify-center text-white text-xs font-medium">
                {msg.avatar}
              </div>
              <div className={`rounded-lg p-3 ${
                msg.isOwn 
                  ? 'bg-[#244855] text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {!msg.isOwn && (
                  <p className="text-xs font-medium mb-1 text-gray-600">{msg.user}</p>
                )}
                <p className="text-sm">{msg.message}</p>
                <p className={`text-xs mt-1 ${msg.isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                  {msg.time}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#244855] focus:border-transparent"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <button type="button" className="p-1 text-gray-400 hover:text-gray-600">
                <PaperclipIcon className="w-4 h-4" />
              </button>
              <button type="button" className="p-1 text-gray-400 hover:text-gray-600">
                <SmileIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="p-2 bg-[#244855] text-white rounded-lg hover:bg-[#1a3640] transition-colors"
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatPanel