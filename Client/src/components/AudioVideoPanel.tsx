import { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Monitor } from 'lucide-react';
import type { AudioParticipant } from '../types/index.ts';

interface AudioVideoPanelProps {
  participants: AudioParticipant[];
  isInCall: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onJoinCall: () => void;
  onLeaveCall: () => void;
  onShareScreen: () => void;
}

export default function AudioVideoPanel({
  participants,
  isInCall,
  isMuted,
  isVideoOn,
  onToggleMute,
  onToggleVideo,
  onJoinCall,
  onLeaveCall,
  onShareScreen
}: AudioVideoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-800 border-t border-slate-700">
      {isExpanded && isInCall && (
        <div className="p-4 border-b border-slate-700 max-h-48 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white mb-3">
            In Call ({participants.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {participants.map((participant) => (
              <div
                key={participant.userId}
                className="flex items-center gap-2 p-2 bg-slate-900 rounded"
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {participant.userName.charAt(0).toUpperCase()}
                  </div>
                  {participant.isVideoOn && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                      <Video className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs truncate">{participant.userName}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {participant.isMuted ? (
                      <MicOff className="w-3 h-3 text-red-400" />
                    ) : (
                      <Mic className="w-3 h-3 text-green-400" />
                    )}
                    <span className="text-xs text-slate-400">
                      {participant.isMuted ? 'Muted' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          {isExpanded ? '▼' : '▲'} Audio/Video
        </button>

        <div className="flex items-center gap-2">
          {isInCall ? (
            <>
              <button
                onClick={onToggleMute}
                className={`p-2 rounded transition-colors ${
                  isMuted
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={onToggleVideo}
                className={`p-2 rounded transition-colors ${
                  !isVideoOn
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
                title={isVideoOn ? 'Turn off video' : 'Turn on video'}
              >
                {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>

              <button
                onClick={onShareScreen}
                className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                title="Share screen"
              >
                <Monitor className="w-4 h-4" />
              </button>

              <button
                onClick={onLeaveCall}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                <span className="text-sm">Leave</span>
              </button>
            </>
          ) : (
            <button
              onClick={onJoinCall}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm">Join Call</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
