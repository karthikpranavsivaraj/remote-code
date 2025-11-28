import { useState } from 'react';
import { Terminal as TerminalIcon, Play, Square } from 'lucide-react';
import type { CodeExecution } from '../types/index';

interface TerminalProps {
  executions: CodeExecution[];
  onExecute: (code: string, language: string) => void;
  isExecuting: boolean;
}

export default function Terminal({ executions, onExecute, isExecuting }: TerminalProps) {
  const [input, setInput] = useState('');

  const handleExecute = () => {
    if (input.trim()) {
      onExecute(input, 'javascript');
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Terminal</h3>
        </div>
        <div className="flex items-center gap-2">
          {isExecuting && (
            <span className="text-xs text-cyan-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              Running...
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 font-mono text-sm space-y-2">
        {executions.length === 0 ? (
          <div className="text-slate-500 text-xs">
            No executions yet. Run some code to see output here.
          </div>
        ) : (
          executions.map((execution) => (
            <div key={execution.id} className="space-y-1">
              <div className="text-slate-400 text-xs">
                [{new Date(execution.timestamp).toLocaleTimeString()}]
              </div>
              <div className="text-cyan-300">$ {execution.code}</div>
              {execution.error ? (
                <div className="text-red-400 whitespace-pre-wrap">{execution.error}</div>
              ) : (
                <div className="text-green-400 whitespace-pre-wrap">{execution.output}</div>
              )}
              <div className="h-px bg-slate-800 my-2" />
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter command or code to execute..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isExecuting && handleExecute()}
            disabled={isExecuting}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          />
          <button
            onClick={handleExecute}
            disabled={isExecuting || !input.trim()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center gap-2"
          >
            {isExecuting ? (
              <>
                <Square className="w-4 h-4" />
                <span className="text-sm">Stop</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span className="text-sm">Run</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
