import { Users, Settings, LogOut } from 'lucide-react';
import type { User } from '../types';

interface HeaderProps {
  sessionName: string;
  currentUser: User;
  participants: User[];
  onSettingsClick: () => void;
  onLogout: () => void;
}

export default function Header({
  sessionName,
  currentUser,
  participants,
  onSettingsClick,
  onLogout
}: HeaderProps) {
  return (
    <header className="bg-slate-900 text-white h-14 flex items-center justify-between px-6 border-b border-slate-700">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          LiveDevHub
        </h1>
        <div className="h-6 w-px bg-slate-600" />
        <span className="text-sm text-slate-300">{sessionName}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <div className="flex -space-x-2">
            {participants.slice(0, 5).map((participant) => (
              <div
                key={participant.id}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 border-slate-900"
                style={{ backgroundColor: participant.color }}
                title={participant.name}
              >
                {participant.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {participants.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium border-2 border-slate-900">
                +{participants.length - 5}
              </div>
            )}
          </div>
        </div>

        <div className="h-6 w-px bg-slate-600" />

        <div className="flex items-center gap-2 text-sm">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center font-medium"
            style={{ backgroundColor: currentUser.color }}
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-slate-300">{currentUser.name}</span>
          <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-800 rounded">
            {currentUser.role}
          </span>
        </div>

        <button
          onClick={onSettingsClick}
          className="p-2 hover:bg-slate-800 rounded transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onLogout}
          className="p-2 hover:bg-slate-800 rounded transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
