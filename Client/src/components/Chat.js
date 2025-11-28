import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaRocketchat } from "react-icons/fa";
import toast from "react-hot-toast";
import socket from "./Socket";

const Chat = () => {
  const location = useLocation();
  const [chat, setChat] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const { username, roomid } = location.state || {};

  const openChat = () => setChat(true);
  const closeChat = () => setChat(false);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("message", { message, username, roomid });
      setMessages((prevMessages) => [...prevMessages, { message, username }]);
      setMessage("");
      toast.success("Message sent");
    }
  };

  const handleInputChange = (e) => setMessage(e.target.value);

  useEffect(() => {
    socket.on("new-message", (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
      if (data.username !== username) {
        toast.success(`Message received from ${data.username}`);
      }
    });
    return () => socket.off("new-message");
  }, [roomid, username]);

  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleDrag = (e) => {
    setPosition({
      x: e.clientX - e.target.offsetWidth / 2,
      y: e.clientY - e.target.offsetHeight / 2,
    });
  };

  return (
    <div className="p-4 relative">
      <button
        onClick={openChat}
        className="flex items-center px-5 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition duration-300 transform hover:scale-105"
      >
        <FaRocketchat className="mr-2 text-xl" /> Open Chat
      </button>

      {chat && (
        <div
          style={{ left: `${position.x}px`, top: `${position.y}px` }}
          className="fixed bg-white rounded-lg w-72 h-96 p-4 shadow-xl z-50 cursor-move transition-transform duration-300"
          draggable
          onDragEnd={handleDrag}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-blue-800">Chat Room</h2>
            <button
              onClick={closeChat}
              className="text-red-500 hover:text-red-600 text-xl"
            >
              ×
            </button>
          </div>

          <div className="mb-4 h-52 overflow-y-auto border border-gray-300 rounded p-3 bg-gray-50">
            {messages.length ? (
              messages.map((msg, index) => (
                <div key={index} className="mb-2">
                  <strong className="text-blue-600">{msg.username}:</strong>
                  <p className="text-gray-700">{msg.message}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center">No messages yet</p>
            )}
          </div>

          <input
            type="text"
            placeholder="Write a message..."
            value={message}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded p-2 mb-3 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <button
            onClick={sendMessage}
            className="w-full bg-green-500 text-white font-bold rounded py-2 hover:bg-green-600 transition duration-300"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
};

export default Chat;
