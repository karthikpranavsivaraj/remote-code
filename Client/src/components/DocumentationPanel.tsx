import { useState } from 'react';
import { FileText, Plus, Search, Tag, Clock, User, Sparkles } from 'lucide-react';
import type { Documentation } from '../types';

interface DocumentationPanelProps {
  documents: Documentation[];
  onAddDocument: (title: string, content: string, tags: string[]) => void;
  onRequestAIDoc: () => void;
}

export default function DocumentationPanel({
  documents,
  onAddDocument,
  onRequestAIDoc
}: DocumentationPanelProps) {
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Documentation | null>(null);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocTags, setNewDocTags] = useState('');

  const filteredDocs = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddDocument = () => {
    if (newDocTitle.trim() && newDocContent.trim()) {
      const tags = newDocTags.split(',').map((tag) => tag.trim()).filter(Boolean);
      onAddDocument(newDocTitle, newDocContent, tags);
      setNewDocTitle('');
      setNewDocContent('');
      setNewDocTags('');
      setIsAddingDoc(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Documentation</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRequestAIDoc}
            className="p-2 hover:bg-slate-700 rounded transition-colors text-purple-400"
            title="Generate AI Documentation"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAddingDoc(true)}
            className="p-2 hover:bg-slate-700 rounded transition-colors text-blue-400"
            title="Add Document"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isAddingDoc ? (
          <div className="p-4 space-y-3">
            <input
              type="text"
              placeholder="Document Title"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Document Content"
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
            />
            <input
              type="text"
              placeholder="Tags (comma separated)"
              value={newDocTags}
              onChange={(e) => setNewDocTags(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddDocument}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
              >
                Add Document
              </button>
              <button
                onClick={() => setIsAddingDoc(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : selectedDoc ? (
          <div className="p-4">
            <button
              onClick={() => setSelectedDoc(null)}
              className="text-blue-400 text-sm mb-3 hover:underline"
            >
              ← Back to list
            </button>
            <h3 className="text-xl font-bold text-white mb-3">{selectedDoc.title}</h3>
            <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {selectedDoc.author}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(selectedDoc.timestamp).toLocaleDateString()}
              </div>
            </div>
            {selectedDoc.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedDoc.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-slate-700 text-blue-300 text-xs rounded flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-slate-300 whitespace-pre-wrap">{selectedDoc.content}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No documentation yet</p>
                <p className="text-xs mt-1">Add your first document or generate with AI</p>
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="p-3 bg-slate-900 hover:bg-slate-700 rounded cursor-pointer transition-colors border border-slate-700"
                >
                  <h4 className="text-white font-medium text-sm mb-1">{doc.title}</h4>
                  <p className="text-slate-400 text-xs line-clamp-2 mb-2">
                    {doc.content}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{doc.author}</span>
                    <span>{new Date(doc.timestamp).toLocaleDateString()}</span>
                  </div>
                  {doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-slate-800 text-blue-300 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
