import { useState } from 'react';
import { MessageSquare, Send, Check } from 'lucide-react';
import type { Comment } from '../types/index';

interface CommentsPanelProps {
  comments: Comment[];
  currentLine: number;
  onAddComment: (lineNumber: number, content: string) => void;
  onResolveComment: (commentId: string) => void;
}

export default function CommentsPanel({
  comments,
  currentLine,
  onAddComment,
  onResolveComment
}: CommentsPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const filteredComments = comments.filter((comment) =>
    showResolved ? true : !comment.resolved
  );

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(currentLine, newComment);
      setNewComment('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Comments</h2>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded"
          />
          Show resolved
        </label>
      </div>

      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-slate-400">Line {currentLine}</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredComments.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs mt-1">Add a comment to start the discussion</p>
          </div>
        ) : (
          filteredComments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded border ${
                comment.resolved
                  ? 'bg-slate-900/50 border-slate-700 opacity-60'
                  : 'bg-slate-900 border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-white font-medium text-sm">
                    {comment.userName}
                  </span>
                  <span className="text-slate-500 text-xs ml-2">
                    Line {comment.lineNumber}
                  </span>
                </div>
                {!comment.resolved && (
                  <button
                    onClick={() => onResolveComment(comment.id)}
                    className="p-1 hover:bg-slate-700 rounded transition-colors text-green-400"
                    title="Resolve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-slate-300 text-sm mb-2">{comment.content}</p>
              <span className="text-slate-500 text-xs">
                {new Date(comment.timestamp).toLocaleString()}
              </span>
              {comment.resolved && (
                <span className="ml-2 text-xs text-green-500">✓ Resolved</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
