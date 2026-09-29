import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Folder, FolderPlus, FilePlus, File, ChevronRight, ChevronDown, Download, Trash2, Image as ImageIcon, Check, X } from "lucide-react";
import { api } from "../lib/api.js";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export default function ProjectsPage() {
  const { user } = useAuth();
  const roleId = user?.role || "finance"; // Fallback to a valid role if undefined

  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWsId, setSelectedWsId] = useState("");
  const [workspace, setWorkspace] = useState(null);
  
  const [expandedFolders, setExpandedFolders] = useState({});
  const [selectedFile, setSelectedFile] = useState(null); // { folder, name }

  useEffect(() => {
    loadWorkspaces();
  }, [roleId]);

  useEffect(() => {
    if (selectedWsId) {
      loadWorkspace(selectedWsId);
    } else {
      setWorkspace(null);
      setSelectedFile(null);
    }
  }, [selectedWsId]);

  const loadWorkspaces = async () => {
    const w = await api.listWorkspaces(roleId);
    setWorkspaces(w);
    if (w.length > 0 && !selectedWsId) setSelectedWsId(w[0].id);
  };

  const loadWorkspace = async (id) => {
    const ws = await api.getWorkspace(roleId, id);
    setWorkspace(ws);
    // Auto-expand all folders
    if (ws?.files) {
      const exps = {};
      Object.keys(ws.files).forEach(k => exps[k] = true);
      setExpandedFolders(exps);
    }
  };

  const handleNewProject = async () => {
    const name = prompt("Project Name:");
    if (!name) return;
    const ws = await api.createWorkspace(roleId, name);
    await loadWorkspaces();
    setSelectedWsId(ws.id);
  };

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleNewFolder = async () => {
    if (!newFolderName.trim() || !selectedWsId) return;
    await api.createFolder(roleId, selectedWsId, newFolderName.trim());
    setNewFolderName("");
    setShowNewFolder(false);
    loadWorkspace(selectedWsId);
  };

  const handleDeleteFolder = async (folder) => {
    if (!confirm(`Delete folder ${folder}?`)) return;
    await api.deleteFolder(roleId, selectedWsId, folder);
    loadWorkspace(selectedWsId);
  };

  const handleDeleteFile = async (folder, name) => {
    if (!confirm(`Delete ${name}?`)) return;
    await api.deleteFile(roleId, selectedWsId, folder, name);
    if (selectedFile?.name === name) setSelectedFile(null);
    loadWorkspace(selectedWsId);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await api.uploadFile(roleId, selectedWsId, file);
    loadWorkspace(selectedWsId);
    // Reset input
    e.target.value = null;
  };

  const toggleFolder = (f) => setExpandedFolders(prev => ({...prev, [f]: !prev[f]}));

  const renderPreview = () => {
    if (!selectedFile || !workspace) return (
      <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary)] gap-4">
        <File size={48} opacity={0.2} />
        <p className="text-sm">Select a file to preview</p>
      </div>
    );

    const { folder, name } = selectedFile;
    const previewUrl = `${BASE}/files/serve/${roleId}/${workspace.id}/${folder}/${name}`;
    const ext = name.split('.').pop().toLowerCase();
    
    const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
    const isCode = ['txt', 'py', 'js', 'json', 'md', 'csv', 'sh'].includes(ext);
    const isPdf = ext === 'pdf';
    const isDoc = ['docx', 'pptx', 'xlsx'].includes(ext);

    return (
      <div className="h-full flex flex-col bg-[var(--bg-panel)] rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="p-4 border-b flex items-center justify-between bg-[var(--bg-panel-raised)]" style={{ borderColor: 'var(--border)' }}>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate text-[var(--text-primary)]">{name}</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">{folder}</span>
          </div>
          <div className="flex gap-2">
            <a href={`/api/run/download/${roleId}/${workspace.id}/${name}`} className="p-2 rounded hover:bg-[var(--bg-base)] text-[var(--brand-700)] transition-colors" title="Download">
              <Download size={16} />
            </a>
            <button onClick={() => handleDeleteFile(folder, name)} className="p-2 rounded hover:bg-[var(--bg-base)] text-red-500 transition-colors" title="Delete">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-white relative overflow-auto flex items-center justify-center p-4">
          {isPdf ? (
            <iframe src={previewUrl} className="w-full h-full border-0 absolute inset-0" title="PDF Preview" />
          ) : isImg ? (
            <img src={previewUrl} alt={name} className="max-w-full max-h-full object-contain" />
          ) : isCode ? (
            <iframe src={previewUrl} className="w-full h-full border-0 absolute inset-0 bg-white" title="Code Preview" />
          ) : isDoc ? (
            <div className="text-center flex flex-col items-center gap-4 text-black">
              <File size={64} style={{ color: 'var(--brand-500)' }} />
              <div>
                <div className="font-semibold text-lg">{name}</div>
                <div className="text-sm text-gray-500">Office Document - Preview not supported</div>
              </div>
              <a href={`/api/run/download/${roleId}/${workspace.id}/${name}`} className="px-6 py-2 bg-[var(--brand-700)] text-white rounded-md hover:opacity-90 font-medium">
                Download to View
              </a>
            </div>
          ) : (
            <div className="text-center flex flex-col items-center gap-4 text-black">
              <File size={64} className="text-gray-300" />
              <div className="text-gray-500">No preview available</div>
              <a href={`/api/run/download/${roleId}/${workspace.id}/${name}`} className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 font-medium">
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex" style={{ background: 'var(--bg-base)' }}>
      {/* Col 1: Projects List */}
      <div className="w-64 border-r flex flex-col bg-[var(--bg-panel)]" style={{ borderColor: 'var(--border)' }}>
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <button onClick={handleNewProject} className="w-full py-2 flex items-center justify-center gap-2 rounded bg-[var(--brand-700)] text-white text-sm font-medium hover:opacity-90">
            <FolderPlus size={16} /> New Project
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {workspaces.map(w => (
            <div 
              key={w.id}
              onClick={() => setSelectedWsId(w.id)}
              className={`p-4 border-b cursor-pointer transition-colors ${w.id === selectedWsId ? 'bg-[var(--brand-100)] border-l-4 border-l-[var(--brand-700)]' : 'hover:bg-[var(--bg-base)] border-l-4 border-l-transparent'}`}
              style={{ borderColor: w.id === selectedWsId ? undefined : 'var(--border-soft)' }}
            >
              <div className="text-sm font-semibold truncate" style={{ color: w.id === selectedWsId ? 'var(--brand-700)' : 'var(--text-primary)' }}>{w.name}</div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{new Date(w.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Col 2: File Tree */}
      <div className="w-64 border-r flex flex-col bg-[var(--bg-panel)]" style={{ borderColor: 'var(--border)' }}>
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Files</span>
          <div className="flex gap-1">
            <label className="p-1.5 rounded cursor-pointer hover:bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--brand-700)]" title="Upload File">
              <FilePlus size={14} />
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
            {showNewFolder ? (
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNewFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                  className="text-xs px-1.5 py-1 rounded border w-24 outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                  placeholder="Folder name"
                />
                <button onClick={handleNewFolder} className="p-1 text-[var(--tier2)]"><Check size={12} /></button>
                <button onClick={() => setShowNewFolder(false)} className="p-1 text-red-400"><X size={12} /></button>
              </div>
            ) : (
              <button onClick={() => setShowNewFolder(true)} className="p-1.5 rounded hover:bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--brand-700)]" title="New Folder">
                <FolderPlus size={14} />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {!workspace ? (
            <div className="p-4 text-center text-xs text-[var(--text-tertiary)]">Select a project</div>
          ) : (
            Object.entries(workspace.files || {}).map(([folder, files]) => (
              <div key={folder} className="mb-2">
                <div className="group flex items-center justify-between py-1.5 px-2 rounded hover:bg-[var(--bg-base)] cursor-pointer text-sm font-medium text-[var(--text-primary)]" onClick={() => toggleFolder(folder)}>
                  <div className="flex items-center gap-1.5">
                    {expandedFolders[folder] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Folder size={14} style={{ color: 'var(--brand-500)' }} />
                    {folder}
                  </div>
                  <div className="hidden group-hover:flex">
                    <Trash2 size={12} className="text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }} />
                  </div>
                </div>
                {expandedFolders[folder] && (
                  <div className="pl-6 flex flex-col mt-0.5">
                    {files.map(f => {
                      const isActive = selectedFile?.name === f.name && selectedFile?.folder === folder;
                      return (
                        <div 
                          key={f.name}
                          onClick={() => setSelectedFile({ folder, ...f })}
                          className={`flex items-center gap-2 py-1.5 px-2 rounded text-xs cursor-pointer truncate transition-colors ${isActive ? 'bg-[var(--brand-100)] text-[var(--brand-700)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]'}`}
                        >
                          <File size={12} className="shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </div>
                      );
                    })}
                    {files.length === 0 && <div className="pl-2 py-1 text-[10px] text-[var(--text-tertiary)] italic">Empty</div>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Col 3: Preview */}
      <div className="flex-1 p-6 bg-[var(--bg-base)] relative">
        {renderPreview()}
      </div>
    </div>
  );
}
