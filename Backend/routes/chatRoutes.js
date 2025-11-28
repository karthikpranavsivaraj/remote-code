const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const db = require('../database/db');

let ChatHistory, Message, ChatRoom, isMongoAvailable = false;
try {
  const mongodb = require('../database/mongodb');
  ChatHistory = mongodb.ChatHistory;
  Message = mongodb.Message;
  ChatRoom = mongodb.ChatRoom;
  isMongoAvailable = true;
} catch (error) {
  console.log('MongoDB models not available, using fallback');
  const { FallbackMessage, FallbackChatRoom } = require('../database/mongodb');
  Message = FallbackMessage;
  ChatRoom = FallbackChatRoom;
}

// Get user's projects with chat data
router.get('/projects', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's projects
    const [projects] = await db.execute(`
      SELECT p.id, p.name, p.description
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ?
      ORDER BY p.name
    `, [userId]);

    const projectsWithChats = [];

    for (const project of projects) {
      // Get project members
      const [members] = await db.execute(`
        SELECT u.id, u.username, u.email, pm.role
        FROM users u
        JOIN project_members pm ON u.id = pm.user_id
        WHERE pm.project_id = ? AND u.id != ?
        ORDER BY u.username
      `, [project.id, userId]);

      // Get or create team chat
      const teamChatId = `team_${project.id}`;
      let teamChat;
      
      teamChat = await ChatRoom.findOne({ chatId: teamChatId });
      
      if (!teamChat) {
        const [allProjectMembers] = await db.execute(
          'SELECT user_id FROM project_members WHERE project_id = ?',
          [project.id]
        );
        
        if (isMongoAvailable) {
          teamChat = new ChatRoom({
            chatId: teamChatId,
            chatType: 'team',
            projectId: project.id,
            participants: allProjectMembers.map(m => m.user_id)
          });
          await teamChat.save();
        } else {
          teamChat = ChatRoom.create({
            chatId: teamChatId,
            chatType: 'team',
            projectId: project.id,
            participants: allProjectMembers.map(m => m.user_id)
          });
        }
      }

      // Get direct chats with project members
      const directChats = [];
      for (const member of members) {
        const directChatId = `direct_${Math.min(userId, member.id)}_${Math.max(userId, member.id)}`;
        let directChat;
        
        directChat = await ChatRoom.findOne({ chatId: directChatId });
        
        if (!directChat) {
          if (isMongoAvailable) {
            directChat = new ChatRoom({
              chatId: directChatId,
              chatType: 'direct',
              participants: [userId, member.id]
            });
            await directChat.save();
          } else {
            directChat = ChatRoom.create({
              chatId: directChatId,
              chatType: 'direct',
              participants: [userId, member.id]
            });
          }
        }
        
        directChats.push({
          ...(directChat.toObject ? directChat.toObject() : directChat),
          memberInfo: member
        });
      }

      projectsWithChats.push({
        ...project,
        teamChat: teamChat.toObject ? teamChat.toObject() : teamChat,
        members,
        directChats
      });
    }

    res.json(projectsWithChats);
  } catch (error) {
    console.error('Chat projects error:', error);
    res.status(500).json({ error: error.message });
  }
});



// Get messages for a chat room from chat_history
router.get('/rooms/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await ChatHistory.find({ chatId })
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json(Array.isArray(messages) ? messages.reverse() : []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post('/rooms/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;
    const userId = req.user.userId;

    // Get sender info
    const [users] = await db.execute('SELECT username FROM users WHERE id = ?', [userId]);
    const senderName = users[0]?.username || 'Unknown';

    // Get chat room
    const chatRoom = await ChatRoom.findOne({ chatId });
    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Create message in chat_history
    let newMessage;
    if (isMongoAvailable) {
      newMessage = new ChatHistory({
        chatId,
        projectId: chatRoom.projectId,
        senderId: userId,
        senderName,
        message,
        messageType: 'text',
        metadata: {
          mentions: [],
          fileInfo: null,
          codeLanguage: null
        }
      });
      await newMessage.save();
      
      // Update chat room last message
      if (chatRoom.save) {
        chatRoom.lastMessage = message;
        chatRoom.lastMessageTime = new Date();
        await chatRoom.save();
      }
    } else {
      newMessage = Message.create({
        chatId,
        chatType: chatRoom.chatType,
        senderId: userId,
        senderName,
        message,
        projectId: chatRoom.projectId,
        recipientId: chatRoom.chatType === 'direct' ? 
          chatRoom.participants.find(p => p !== userId) : null
      });
    }

    res.json(newMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;