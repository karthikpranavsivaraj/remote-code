  socket.on("message",({message,username,roomid})=>{
    io.to(roomid).emit("new-message",{message,username})
  })