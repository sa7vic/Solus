import { useState, useEffect } from "react";
import { Folder, File, FileText, Upload, Trash2, Search, ExternalLink, X } from "lucide-react";
import { api } from "../lib/api.js";

export default function KnowledgeBasePage() {
  const [collections, setCollections] = useState([]);
  const [selectedColId, setSelectedColId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [passageModal, setPassageModal] = useState(null); // { docId, collectionId, snippet }

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    const cols = await api.kbCollections();
    setCollections(cols);
    if (cols.length > 0 && !selectedColId) {
      setSelectedColId(cols[0].id);
    }
  };

  const handleCreate = async () => {
    const name = prompt("Collection Name:");
    if (!name) return;
    const col = await api.createKbCollection(name);
    await loadCollections();
    setSelectedColId(col.id);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedColId) return;
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'}/kb/collections/${selectedColId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('solus.token')}` },
      body: formData
    });
    loadCollections();
    e.target.value = null;
  };

  const handleDeleteDoc = async (colId, name) => {
    if (!confirm(`Delete ${name} from collection?`)) return;
    await api.deleteKbDoc(colId, name);
    loadCollections();
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    const results = await api.kbSearch(searchQuery, selectedColId);
    setSearchResults(results);
  };

  const openPassage = async (collectionId, docId, snippet) => {
    try {
      const data = await api.kbPassage(collectionId, docId, searchQuery);
      setPassageModal(data || { docId, snippet, fullText: "Full text not available." });
    } catch {
      setPassageModal({ docId, snippet, fullText: "Failed to load full passage." });
    }
  };

  const selectedCol = collections.find(c => c.id === selectedColId);

  return (
    <div className="h-full flex relative" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar: Collections */}
      <div className="w-[280px] border-r flex flex-col bg-[var(--bg-panel)]" style={{ borderColor: 'var(--border)' }}>
        <div className="p-4 border-b flex flex-col gap-3" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-[var(--text-primary)]">Knowledge Base</h2>
          <button onClick={handleCreate} className="w-full py-2 flex items-center justify-center gap-2 rounded bg-[var(--brand-700)] text-white text-sm font-medium hover:opacity-90">
            <Folder size={16} /> New Collection
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {collections.map(c => (
            <div 
              key={c.id} 
              onClick={() => { setSelectedColId(c.id); setSearchResults([]); }}
              className={`p-3 border-b cursor-pointer transition-colors flex items-center justify-between ${c.id === selectedColId ? 'bg-[var(--brand-100)] border-l-4 border-l-[var(--brand-700)]' : 'hover:bg-[var(--bg-base)] border-l-4 border-l-transparent'}`}
              style={{ borderColor: c.id === selectedColId ? undefined : 'var(--border-soft)' }}
            >
              <span className="text-sm font-semibold truncate" style={{ color: c.id === selectedColId ? 'var(--brand-700)' : 'var(--text-primary)' }}>{c.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-base)] text-[var(--text-secondary)]">{c.documents?.length || 0}</span>
            </div>
          ))}
          {collections.length === 0 && <div className="p-4 text-center text-xs text-[var(--text-tertiary)]">No collections.</div>}
        </div>
      </div>

      {/* Main: Collection Detail & Search */}
      <div className="flex-1 flex flex-col">
        {!selectedCol ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)]">Select a collection</div>
        ) : (
          <>
            <div className="p-6 border-b bg-[var(--bg-panel)]" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-[var(--text-primary)]">{selectedCol.name}</h1>
                <label className="flex items-center gap-2 px-4 py-2 rounded border bg-[var(--bg-base)] text-sm font-medium hover:bg-[var(--bg-panel-raised)] cursor-pointer" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  <Upload size={16} /> Upload Document
                  <input type="file" className="hidden" onChange={handleUpload} />
                </label>
              </div>
              
              <form onSubmit={handleSearch} className="relative mt-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input 
                  value={searchQuery}
                  onChange={e=>setSearchQuery(e.target.value)}
                  placeholder={`Search in ${selectedCol.name}...`}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:shadow-[0_0_0_2px_var(--brand-200)] outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                />
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {searchResults.length > 0 ? (
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Search Results</h3>
                  <div className="flex flex-col gap-3">
                    {searchResults.map((r, i) => (
                      <div key={i} className="p-4 rounded-xl border bg-[var(--bg-panel)] shadow-sm" style={{ borderColor: 'var(--border)' }}>
                        <div className="text-sm font-medium text-[var(--text-primary)] mb-2 flex items-center justify-between">
                          <span>{r.sourceName || r.docId}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-[var(--brand-100)] text-[var(--brand-700)] font-mono text-[10px]">Score: {r.score?.toFixed(2)}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-[var(--text-secondary)] italic border-l-2 pl-3" style={{ borderColor: 'var(--border-soft)' }}>"...{r.snippet}..."</p>
                        <button onClick={() => openPassage(selectedCol.id, r.docId, r.snippet)} className="mt-3 flex items-center gap-1.5 text-xs text-[var(--brand-700)] font-medium hover:underline">
                          Open Source Passage <ExternalLink size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setSearchResults([])} className="mt-4 text-xs text-[var(--text-secondary)] hover:underline">Clear search</button>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Documents ({selectedCol.documents?.length || 0})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(selectedCol.documents || []).map(doc => (
                      <div 
                        key={doc.name} 
                        onClick={() => openPassage(selectedCol.id, doc.name, '')}
                        className="flex items-center justify-between p-3 rounded-lg border bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-raised)] transition-all cursor-pointer shadow-sm group" 
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {doc.name.endsWith('.pdf') ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 uppercase font-mono">PDF</span>
                          ) : (
                            <FileText size={16} className="text-[var(--brand-700)]" />
                          )}
                          <span className="text-sm font-medium truncate text-[var(--text-primary)] group-hover:text-[var(--brand-700)] transition-colors">{doc.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                            {doc.size ? `${(doc.size / 1024).toFixed(0)} KB` : ''}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteDoc(selectedCol.id, doc.name); }} 
                            className="text-[var(--text-tertiary)] hover:text-red-500 transition-colors p-1"
                            title="Delete document"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!selectedCol.documents || selectedCol.documents.length === 0) && (
                      <div className="col-span-2 text-center py-8 text-sm text-[var(--text-tertiary)] border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--border)' }}>
                        This collection is empty. Upload documents to search against them.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Passage Modal */}
      {passageModal && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-8 z-50">
          <div className="bg-[var(--bg-base)] w-full max-w-3xl max-h-full rounded-xl border shadow-xl flex flex-col" style={{ borderColor: 'var(--border)' }}>
            <div className="p-4 border-b flex items-center justify-between bg-[var(--bg-panel)] rounded-t-xl" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">Source Passage</h3>
                <div className="text-xs font-mono text-[var(--text-tertiary)]">{passageModal.docId}</div>
              </div>
              <button onClick={() => setPassageModal(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              <div className="p-4 rounded border bg-[var(--brand-50)] text-[var(--brand-900)] text-sm italic" style={{ borderColor: 'var(--brand-200)' }}>
                "{passageModal.snippet}"
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Full Document Context</h4>
                <div className="p-4 rounded border bg-[var(--bg-panel)] font-mono text-xs whitespace-pre-wrap text-[var(--text-primary)] overflow-auto" style={{ borderColor: 'var(--border)', maxHeight: '400px' }}>
                  {passageModal.fullText}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
