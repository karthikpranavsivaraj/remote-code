const express = require("express");
const cors = require("cors");
require('dotenv').config();
const { connectMongoDB } = require('./database/mongodb');
const app = express();
const Port = process.env.PORT || 5000;

// Vercel serverless function export
if (process.env.VERCEL) {
  module.exports = app;
}
const http = require("http");
const { Server } = require("socket.io");
const authRoutes = require("./routes/authRoutes");
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "https://remote-code-collaboration-tool-lcvt.vercel.app",
      "https://codecollab-frontend.vercel.app",
      "https://codecollab-client.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://172.20.10.8:3000",
      "http://192.168.137.1:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
});

const rooms = {};
const projects = {};
const chatUsers = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Legacy room support
  socket.on("join-room", ({ username, roomid }) => {
    console.log(`👤 ${username} joining room: ${roomid}`);
    socket.join(roomid);

    if (!rooms[roomid]) rooms[roomid] = [];
    rooms[roomid].push({ username, socketId: socket.id });

    console.log(`📊 Room ${roomid} now has ${rooms[roomid].length} users:`, rooms[roomid].map(u => u.username));
    
    socket.to(roomid).emit("user-joined", { username, socketId: socket.id });
    socket.emit("room-users", rooms[roomid]);
  });

  // Project-based collaboration
  socket.on("join-project", ({ projectId, user }) => {
    if (!user || !user.username) {
      console.log(`Invalid user data for project ${projectId}`);
      return;
    }
    
    console.log(`👤 ${user.username} joining live room for project: ${projectId}`);
    socket.join(`project_${projectId}`);
    socket.projectId = projectId;
    socket.userId = user.id;
    socket.username = user.username;

    if (!projects[projectId]) projects[projectId] = [];
    
    // Remove existing user if reconnecting
    projects[projectId] = projects[projectId].filter(u => u.id !== user.id);
    
    // Add user to project
    projects[projectId].push(user);

    console.log(`Live room ${projectId} now has ${projects[projectId].length} users`);
    
    socket.to(`project_${projectId}`).emit("user-joined", user);
    socket.emit("project-users", projects[projectId]);
  });

  // Join specific file for editing
  socket.on("join-file", ({ fileId, projectId }) => {
    socket.join(`file_${fileId}`);
    console.log(`${socket.username} joined file ${fileId} in project ${projectId}`);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Handle legacy rooms
    for (const roomid in rooms) {
      const userIndex = rooms[roomid].findIndex(
        (user) => user.socketId === socket.id
      );
      if (userIndex !== -1) {
        const disconnectedUser = rooms[roomid][userIndex].username;
        console.log(`${disconnectedUser} left room: ${roomid}`);

        rooms[roomid].splice(userIndex, 1);

        socket.to(roomid).emit("user-left", {
          socketId: socket.id,
          username: disconnectedUser,
        });

        if (rooms[roomid].length < 1) {
          delete rooms[roomid];
          console.log(`Room ${roomid} deleted (empty)`);
        }
        break;
      }
    }

    // Handle live room disconnections
    if (socket.projectId && projects[socket.projectId]) {
      const userIndex = projects[socket.projectId].findIndex(
        (user) => user.id === socket.userId
      );
      if (userIndex !== -1) {
        const disconnectedUser = projects[socket.projectId][userIndex];
        console.log(`${disconnectedUser.username} left live room: ${socket.projectId}`);

        projects[socket.projectId].splice(userIndex, 1);

        socket.to(`project_${socket.projectId}`).emit("user-left", disconnectedUser);
        socket.to(`project_${socket.projectId}`).emit("project-users", projects[socket.projectId]);

        if (projects[socket.projectId].length < 1) {
          delete projects[socket.projectId];
          console.log(`Live room ${socket.projectId} deleted (empty)`);
        }
      }
    }
  });

  // Live room code changes
  socket.on("code-change", ({ code, fileId, projectId, user, roomid }) => {
    if (roomid) {
      // Legacy room support
      console.log(`Code change in room ${roomid} (${code.length} chars)`);
      socket.to(roomid).emit("receive-code", code);
    }
    
    if (fileId && projectId) {
      // Live room file editing
      console.log(`Live code change in file ${fileId} by ${user?.username}`);
      socket.to(`file_${fileId}`).emit("code-change", { code, fileId, user });
    }
  });

  socket.on("cursor-position", ({ position, fileId, user, projectId }) => {
    if (fileId) {
      socket.to(`file_${fileId}`).emit("cursor-position", { position, fileId, user });
    }
  });

  // WebRTC Audio signaling
  socket.on("audio-offer", ({ offer, to, from }) => {
    socket.to(`project_${socket.projectId}`).emit("audio-offer", { offer, from });
  });

  socket.on("audio-answer", ({ answer, to, from }) => {
    socket.to(`project_${socket.projectId}`).emit("audio-answer", { answer, from });
  });

  socket.on("ice-candidate", ({ candidate, to, from }) => {
    socket.to(`project_${socket.projectId}`).emit("ice-candidate", { candidate, from });
  });

  socket.on("file-changed", ({ projectId, fileId, fileName, userId, username }) => {
    socket.to(`project_${projectId}`).emit("file-changed", {
      fileId, fileName, userId, username
    });
  });
  socket.on("output-change", ({ output, roomid }) => {
    socket.to(roomid).emit("receive-output", output);
  });
  socket.on("btn-run", ({ coderun, roomid }) => {
    socket.to(roomid).emit("btn-running", coderun);
  });
  socket.on("code-run-completed", ({ roomid }) => {
    socket.to(roomid).emit("code-run-completed");
  });
  socket.on("change-language", ({ language, roomid }) => {
    socket.to(roomid).emit("languagechanged", language);
  });
  socket.on("message",({message,username,roomid})=>{
    socket.to(roomid).emit("new-message",{message,username})
  })

  // Chat functionality
  socket.on("join-chat", ({ chatId, userId }) => {
    socket.join(chatId);
    console.log(`User ${userId} joined chat: ${chatId}`);
  });

  socket.on("leave-chat", ({ chatId, userId }) => {
    socket.leave(chatId);
    console.log(`User ${userId} left chat: ${chatId}`);
  });

  socket.on("new-chat-message", async ({ chatId, message, senderId, senderName }) => {
    console.log(`New message in chat ${chatId} from ${senderName}: ${message.substring(0, 50)}...`);
    
    // Store message in MongoDB chat_history
    try {
      const { ChatHistory } = require('./database/mongodb');
      
      const projectId = chatId.startsWith('team_') ? parseInt(chatId.replace('team_', '')) : null;
      
      // Save to chat_history collection
      const chatMessage = new ChatHistory({
        chatId,
        projectId,
        senderId,
        senderName,
        message,
        messageType: 'text',
        metadata: {
          mentions: [],
          fileInfo: null,
          codeLanguage: null
        }
      });
      await chatMessage.save();
      console.log(' Message saved to chat_history');
      
    } catch (error) {
      console.error('Failed to save message to chat_history:', error);
    }
    
    socket.to(chatId).emit("chat-message-received", {
      chatId,
      message,
      senderId,
      senderName,
      timestamp: new Date()
    });
  });

  socket.on("typing", ({ chatId, userId, username, isTyping }) => {
    socket.to(chatId).emit("user-typing", { userId, username, isTyping });
  });
});
// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/github", require("./routes/githubRoutes"));
app.use("/api/comments", require("./routes/commentsRoutes"));
app.use("/api/code", require("./routes/codeExecutionRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/reviews", require("./routes/codeReviewRoutes"));
app.use("/api/snapshot", require("./routes/codeSnapshotRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/standups", require("./routes/standupRoutes"));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "LiveDevHub API is running!" });
});



// Initialize MongoDB
connectMongoDB().then(success => {
  if (success) {
    console.log('💬 Chat system ready with MongoDB storage');
    // Initialize chat_history collection
    const { ChatHistory } = require('./database/mongodb');
    console.log('📦 Chat history collection initialized:', ChatHistory.collection.name);
  } else {
    console.log('💬 Chat system ready with fallback storage');
  }
});

if (!process.env.VERCEL) {
  server.listen(Port, () => {
    console.log(`Server started on port ${Port}`);
  });
}
