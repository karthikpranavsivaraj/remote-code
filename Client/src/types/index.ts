export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'collaborator' | 'viewer';
  color: string;
}

export interface Session {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  participants: User[];
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  lineNumber: number;
  content: string;
  timestamp: Date;
  resolved: boolean;
}

export interface Documentation {
  id: string;
  title: string;
  content: string;
  author: string;
  timestamp: Date;
  tags: string[];
}

export interface CodeExecution {
  id: string;
  code: string;
  language: string;
  output: string;
  error?: string;
  timestamp: Date;
}

export interface AudioParticipant {
  userId: string;
  userName: string;
  isMuted: boolean;
  isVideoOn: boolean;
}
