import { useState } from 'react';
import { FileText, MessageSquare, Terminal as TerminalIcon } from 'lucide-react';

type SidebarTab = 'docs' | 'comments' | 'terminal';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  children: React.ReactNode;
}

export default function Sidebar({ activeTab, onTabChange, children }: SidebarProps) {
  const tabs = [
    { id: 'docs' as const, icon: FileText, label: 'Docs' },
    { id: 'comments' as const, icon: MessageSquare, label: 'Comments' },
    { id: 'terminal' as const, icon: TerminalIcon, label: 'Terminal' },
  ];

  return (
    <div className="flex h-full">
      <div className="w-16 bg-slate-900 border-l border-slate-700 flex flex-col items-center py-4 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-12 h-12 rounded flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={tab.label}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
