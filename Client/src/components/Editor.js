// Updated: Modern Editor with Gradient Theme - Force Refresh
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CopyToClipboard } from "react-copy-to-clipboard";
import toast from "react-hot-toast";
import Avatar from "react-avatar";
import { Controlled as CodeMirror } from "react-codemirror2";
import socket from "./Socket";
import Downloadbtn from "./Downloadbtn";
import Chat from "./Chat";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/python/python";
import "codemirror/mode/clike/clike";
import "codemirror/theme/dracula.css";
import "codemirror/theme/material.css";
import MediaChat from "./MediaChat";

// Modern note editor with enhanced styling
const NoteEditor = () => (
  <div className="h-full">
    <div className="bg-slate-700/30 backdrop-blur-sm border border-slate-600/30 rounded-xl p-4 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white mb-2">Quick Notes</h3>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span>📝 Markdown supported</span>
          <span>•</span>
          <span>🔄 Auto-save</span>
        </div>
      </div>
      <textarea 
        className="w-full h-full bg-slate-800/50 border border-slate-600/30 rounded-lg p-3 text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200" 
        placeholder="Write your notes here...\n\n• Document your ideas\n• Share with team\n• Keep track of progress"
      />
    </div>
  </div>
);

// Enhanced participant list sidebar with modern styling
const ParticipantsSidebar = ({ users, roomid }) => {
  return (
    <aside className="w-80 bg-slate-800/50 backdrop-blur-sm border-l border-slate-700/50 flex flex-col">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">👥</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Participants</h2>
            <span className="text-xs text-slate-400">{users.length} online</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {users.map((user, idx) => (
          <div key={idx} className="flex items-center space-x-3 p-3 bg-slate-700/30 backdrop-blur-sm border border-slate-600/30 rounded-xl">
            <Avatar name={user.username} size="32" round={true} />
            <div className="flex-1">
              <span className="text-white font-medium text-sm">{user.username}</span>
              <div className="flex items-center space-x-1 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-slate-400">Active</span>
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-700/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">👥</span>
            </div>
            <p className="text-slate-400 text-sm">No participants yet</p>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3 border-t border-slate-700/50">
        <CopyToClipboard text={roomid} onCopy={() => toast.success("Room ID copied!")}>
          <button className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 py-3 rounded-xl text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl">
            <span>📋</span>
            <span>Copy Room ID</span>
          </button>
        </CopyToClipboard>
        <button
          onClick={() => {
            socket.disconnect();
            window.location.href = "/";
            toast.success("Left Room");
          }}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 py-3 rounded-xl text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <span>🚪</span>
          <span>Leave Room</span>
        </button>
      </div>
      
      <div className="border-t border-slate-700/50">
        <Chat />
      </div>
    </aside>
  );
};

const Editor = () => {
  const location = useLocation();
  const { username, roomid } = location.state || {};
  const navigate = useNavigate();

  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState([]);
  const [coderun, setCoderun] = useState("Run");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const apikey = process.env.REACT_APP_API_KEY || "your_judge0_api_key_here";

  useEffect(() => {
    if (username && roomid) {
      socket.emit("join-room", { username, roomid });
    }
  }, [username, roomid]);

  useEffect(() => {
    socket.on("user-joined", (data) => {
      setUser((prev) => [...prev, data]);
      toast.success(`${data.username} joined the room`);
    });
    socket.on("user-left", (data) => {
      setUser((prev) => prev.filter((u) => u.socketId !== data.socketId));
      toast.success(`${data.username} left the room`);
    });
    socket.on("room-users", (existingUsers) => setUser(existingUsers));
    return () => {
      socket.off("user-joined");
      socket.off("user-left");
    };
  }, []);

  useEffect(() => {
    socket.on("receive-code", (updatedcode) => setCode(updatedcode));
  }, [code]);

  useEffect(() => {
    if (output) socket.emit("output-change", { output, roomid });
  }, [output, roomid]);

  useEffect(() => {
    socket.on("receive-output", (updatedoutput) => setOutput(updatedoutput));
    return () => socket.off("receive-output");
  }, []);

  useEffect(() => {
    if (coderun === "Running") socket.emit("btn-run", { coderun, roomid });
  }, [coderun, roomid]);

  useEffect(() => {
    socket.on("btn-running", () => setCoderun("Running"));
    socket.on("code-run-completed", () => setCoderun("Run"));
    return () => {
      socket.off("btn-running");
      socket.off("code-run-completed");
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setCoderun("Run");
      socket.emit("code-run-completed", { roomid });
    }
  }, [loading, roomid]);

  useEffect(() => {
    socket.emit("change-language", { language, roomid });
    socket.on("languagechanged", (lang) => setLanguage(lang));
  }, [language, roomid]);

  const handleRunClick = () => {
    setCoderun("Running");
    callapi();
  };

  const languageIds = {
    javascript: 63,
    python: 71,
    "text/x-csrc": 50,
    "text/x-c++src": 54,
    "text/typescript": 74,
  };

  const callapi = async () => {
    setLoading(true);
    setOutput("");

    if (!apikey || apikey === "your_judge0_api_key_here") {
      if (language === "javascript") {
        try {
          const result = eval(code);
          setOutput(String(result));
        } catch (error) {
          setOutput(`Error: ${error.message}`);
        }
      } else {
        setOutput("Demo mode: Only JavaScript supported without API key.");
      }
      setLoading(false);
      return;
    }

    const url = "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=false&fields=*";
    const options = {
      method: "POST",
      headers: {
        "x-rapidapi-key": apikey,
        "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language_id: languageIds[language],
        source_code: btoa(code),
        stdin: "",
      }),
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }
      const data = await response.json();

      const token = data.token;
      if (token) {
        await getsubmission(token);
      } else {
        setOutput("Error: No token received.");
      }
    } catch (e) {
      setOutput(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getsubmission = async (token) => {
    const url = `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=true&fields=*`;
    const options = {
      method: "GET",
      headers: {
        "x-rapidapi-key": apikey,
        "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
      },
    };

    try {
      let completed = false;
      let pollCount = 0;
      const maxPollCount = 10;

      while (!completed && pollCount < maxPollCount) {
        const response = await fetch(url, options);
        const result = await response.json();

        if (result.status && result.status.id <= 2) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          pollCount++;
        } else {
          completed = true;
          if (result.stdout) {
            setOutput(atob(result.stdout));
          } else if (result.stderr) {
            setOutput(atob(result.stderr));
          } else {
            setOutput("No output available.");
          }
        }
      } 
    } catch (error) {
      setOutput(`Error fetching submission: ${error.message}`);
    }
  };

  return (
    <div className="flex h-screen bg-red-500 text-white">
      {/* TEST INDICATOR - FORCE UPDATE */}
      <div className="absolute top-4 left-4 z-50 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-pulse">
        ✨ MODERN EDITOR v2.0
      </div>

      {/* Enhanced Notes Sidebar */}
      <aside className="w-80 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50">
        <div className="p-4">
          <NoteEditor />
        </div>
      </aside>

      {/* Main Editor and Output */}
      <main className="flex-1 flex flex-col p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <label className="block mb-1 font-medium text-gray-300">Choose Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="text/x-csrc">C</option>
              <option value="text/x-c++src">C++</option>
              <option value="text/typescript">TypeScript</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-3">
            <Downloadbtn code={code} language={language} />
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <span>🗖</span>
              <span>Fullscreen</span>
            </button>
            
            <button
              onClick={handleRunClick}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg px-6 py-2 text-white shadow-lg font-medium"
            >
              {loading ? "Running" : coderun}
            </button>
          </div>
        </div>
        
        {/* Code editor */}
        <div className="flex-1 border border-slate-700/50 rounded-xl overflow-hidden shadow-lg bg-slate-800/30">
          <CodeMirror
            value={code}
            options={{
              theme: "material",
              lineNumbers: true,
              mode: language,
              matchBrackets: true,
              extraKeys: { "Ctrl-Space": "autocomplete" },
            }}
            onBeforeChange={(editor, data, value) => {
              setCode(value);
              socket.emit("code-change", { roomid, code: value });
            }}
          />
        </div>
        
        {/* Output console */}
        <div className="bg-slate-800/50 rounded-xl p-4 shadow-lg h-32 overflow-auto font-mono text-green-400 border border-slate-600/50">
          <pre>{output || "✨ Welcome to Modern Code Editor\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🚀 This is a shared terminal. All participants can view the output here.\n\n📝 Type your code in the editor and click run.\n🔧 Select language via the dropdown."}</pre>
        </div>
      </main>

      {/* Right Participants and Chat Sidebar */}
      <ParticipantsSidebar users={user} roomid={roomid} />
      <div>
        <MediaChat roomid={roomid} />
      </div>
    </div>
  );
};

export default Editor;