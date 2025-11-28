const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codecollab_chat';

const connectMongoDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️ Using fallback storage - installing MongoDB recommended for full functionality');
    return false;
  }
};

// Chat History Schema
const chatHistorySchema = new mongoose.Schema({
  chatId: { type: String, required: true, index: true },
  projectId: { type: Number, required: true, index: true },
  senderId: { type: Number, required: true },
  senderName: { type: String, required: true },
  message: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'file', 'code'], default: 'text' },
  timestamp: { type: Date, default: Date.now },
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date },
  metadata: {
    fileInfo: { type: Object },
    codeLanguage: { type: String },
    mentions: [{ type: Number }]
  }
});

// Chat Room Schema
const chatRoomSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  chatType: { type: String, enum: ['team', 'direct'], required: true },
  projectId: { type: Number, index: true },
  participants: [{ type: Number }],
  lastMessage: { type: String },
  lastMessageTime: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Code Review Schema
const codeReviewSchema = new mongoose.Schema({
  projectId: { type: Number, required: true, index: true },
  reviewId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  filePath: { type: String, required: true },
  startLine: { type: Number, required: true },
  endLine: { type: Number, required: true },
  codeSnapshot: { type: String, required: true },
  requesterId: { type: Number, required: true },
  requesterName: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  approvals: [{
    userId: { type: Number, required: true },
    userName: { type: String, required: true },
    decision: { type: String, enum: ['approve', 'deny'], required: true },
    comment: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
});

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema, 'chat_history');
const Message = mongoose.model('Message', chatHistorySchema);
const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: Number, required: true, index: true },
  type: { type: String, enum: ['project_invite', 'task_assigned', 'code_review'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Object },
  isRead: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'accepted', 'denied'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// Daily Stand-up Schema
const standupSchema = new mongoose.Schema({
  projectId: { type: Number, required: true, index: true },
  userId: { type: Number, required: true },
  userName: { type: String, required: true },
  date: { type: Date, required: true, index: true },
  yesterday: { type: String, required: true },
  today: { type: String, required: true },
  blockers: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const CodeReview = mongoose.model('CodeReview', codeReviewSchema, 'code_reviews');
const Notification = mongoose.model('Notification', notificationSchema, 'notifications');
const Standup = mongoose.model('Standup', standupSchema, 'standups');

// Fallback in-memory storage when MongoDB is not available
let inMemoryMessages = [];
let inMemoryChatRooms = [];

const FallbackMessage = {
  find: (query) => {
    let results = inMemoryMessages.filter(msg => {
      return Object.keys(query).every(key => msg[key] === query[key]);
    });
    return {
      sort: () => ({ 
        limit: () => ({ 
          skip: () => results.reverse() 
        }) 
      })
    };
  },
  create: (data) => {
    const message = { ...data, _id: Date.now().toString(), timestamp: new Date() };
    inMemoryMessages.push(message);
    return message;
  }
};

const FallbackChatRoom = {
  findOne: (query) => {
    return inMemoryChatRooms.find(room => 
      Object.keys(query).every(key => room[key] === query[key])
    );
  },
  create: (data) => {
    const room = { ...data, _id: Date.now().toString(), createdAt: new Date() };
    inMemoryChatRooms.push(room);
    return { ...room, save: () => Promise.resolve(room), toObject: () => room };
  }
};

module.exports = {
  connectMongoDB,
  ChatHistory,
  Message,
  ChatRoom,
  CodeReview,
  Notification,
  Standup,
  FallbackMessage,
  FallbackChatRoom
};