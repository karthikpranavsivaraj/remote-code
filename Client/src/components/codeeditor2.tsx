import { useState, useCallback } from 'react';
import Header from './Header';
import CodeEditor from './CodeEditor';
import Sidebar from './Sidebar';
import DocumentationPanel from './DocumentationPanel';
import CommentsPanel from './CommentsPannel';
import Terminal from './Terminal';
import AudioVideoPanel from './AudioVideoPanel';
import {
  mockUsers,
  mockComments,
  mockDocumentation,
  mockExecutions,
  mockAudioParticipants,
  mockCode,
  generateRandomColor,
} from '../utils/mockData';
import type { Comment, Documentation, CodeExecution, AudioParticipant } from '../types/index';

type SidebarTab = 'docs' | 'comments' | 'terminal';

function App() {
  const [currentUser] = useState(mockUsers[0]);
  const [participants] = useState(mockUsers);
  const [code, setCode] = useState(mockCode);
  const [currentLine, setCurrentLine] = useState(1);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('docs');

  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [documentation, setDocumentation] = useState<Documentation[]>(mockDocumentation);
  const [executions, setExecutions] = useState<CodeExecution[]>(mockExecutions);
  const [isExecuting, setIsExecuting] = useState(false);

  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [audioParticipants, setAudioParticipants] = useState<AudioParticipant[]>(mockAudioParticipants);

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  }, []);

  const handleCursorChange = useCallback((lineNumber: number) => {
    setCurrentLine(lineNumber);
  }, []);

  const handleAddComment = useCallback((lineNumber: number, content: string) => {
    const newComment: Comment = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      lineNumber,
      content,
      timestamp: new Date(),
      resolved: false,
    };
    setComments((prev) => [...prev, newComment]);
  }, [currentUser]);

  const handleResolveComment = useCallback((commentId: string) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, resolved: true } : comment
      )
    );
  }, []);

  const handleAddDocument = useCallback((title: string, content: string, tags: string[]) => {
    const newDoc: Documentation = {
      id: Date.now().toString(),
      title,
      content,
      author: currentUser.name,
      timestamp: new Date(),
      tags,
    };
    setDocumentation((prev) => [...prev, newDoc]);
  }, [currentUser]);

  const handleRequestAIDoc = useCallback(() => {
    const aiDoc: Documentation = {
      id: Date.now().toString(),
      title: 'AI Generated: Code Analysis',
      content: `This code implements a collaborative coding environment with real-time synchronization capabilities.

Key Functions:
- calculateFibonacci: Recursively computes Fibonacci numbers (Note: Consider memoization for optimization)
- greetTeam: Iterates through team members and logs personalized greetings

The code demonstrates functional programming patterns and array iteration. Consider adding error handling for edge cases and input validation.`,
      author: 'AI Assistant',
      timestamp: new Date(),
      tags: ['ai-generated', 'analysis'],
    };
    setDocumentation((prev) => [...prev, aiDoc]);
  }, []);

  const handleExecute = useCallback((inputCode: string, language: string) => {
    setIsExecuting(true);

    setTimeout(() => {
      try {
        const result = eval(inputCode);
        const execution: CodeExecution = {
          id: Date.now().toString(),
          code: inputCode,
          language,
          output: result !== undefined ? String(result) : 'undefined',
          timestamp: new Date(),
        };
        setExecutions((prev) => [...prev, execution]);
      } catch (error) {
        const execution: CodeExecution = {
          id: Date.now().toString(),
          code: inputCode,
          language,
          output: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        };
        setExecutions((prev) => [...prev, execution]);
      }
      setIsExecuting(false);
    }, 500);
  }, []);

  const handleJoinCall = useCallback(() => {
    setIsInCall(true);
    const newParticipant: AudioParticipant = {
      userId: currentUser.id,
      userName: currentUser.name,
      isMuted: false,
      isVideoOn: false,
    };
    if (!audioParticipants.find(p => p.userId === currentUser.id)) {
      setAudioParticipants((prev) => [...prev, newParticipant]);
    }
  }, [currentUser, audioParticipants]);

  const handleLeaveCall = useCallback(() => {
    setIsInCall(false);
    setIsMuted(false);
    setIsVideoOn(false);
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    setAudioParticipants((prev) =>
      prev.map((p) =>
        p.userId === currentUser.id ? { ...p, isMuted: !p.isMuted } : p
      )
    );
  }, [currentUser]);

  const handleToggleVideo = useCallback(() => {
    setIsVideoOn((prev) => !prev);
    setAudioParticipants((prev) =>
      prev.map((p) =>
        p.userId === currentUser.id ? { ...p, isVideoOn: !p.isVideoOn } : p
      )
    );
  }, [currentUser]);

  const handleShareScreen = useCallback(() => {
    alert('Screen sharing would be initiated via WebRTC');
  }, []);

  const handleSettingsClick = useCallback(() => {
    alert('Settings panel would open here');
  }, []);

  const handleLogout = useCallback(() => {
    alert('Logout functionality would be implemented here');
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <Header
        sessionName="LiveDevHub - Real-Time Collaboration"
        currentUser={currentUser}
        participants={participants}
        onSettingsClick={handleSettingsClick}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              code={code}
              language="javascript"
              onChange={handleCodeChange}
              onCursorChange={handleCursorChange}
              readOnly={currentUser.role === 'viewer'}
            />
          </div>

          <AudioVideoPanel
            participants={audioParticipants}
            isInCall={isInCall}
            isMuted={isMuted}
            isVideoOn={isVideoOn}
            onToggleMute={handleToggleMute}
            onToggleVideo={handleToggleVideo}
            onJoinCall={handleJoinCall}
            onLeaveCall={handleLeaveCall}
            onShareScreen={handleShareScreen}
          />
        </div>

        <div className="w-96 flex">
          <Sidebar activeTab={sidebarTab} onTabChange={setSidebarTab}>
            {sidebarTab === 'docs' && (
              <DocumentationPanel
                documents={documentation}
                onAddDocument={handleAddDocument}
                onRequestAIDoc={handleRequestAIDoc}
              />
            )}
            {sidebarTab === 'comments' && (
              <CommentsPanel
                comments={comments}
                currentLine={currentLine}
                onAddComment={handleAddComment}
                onResolveComment={handleResolveComment}
              />
            )}
            {sidebarTab === 'terminal' && (
              <Terminal
                executions={executions}
                onExecute={handleExecute}
                isExecuting={isExecuting}
              />
            )}
          </Sidebar>
        </div>
      </div>
    </div>
  );
}

export default App;
