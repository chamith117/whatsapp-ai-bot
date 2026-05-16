"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from "@/components/ui";
import { Upload, FileText, CheckCircle2, AlertCircle, Trash2, Loader2 } from "lucide-react";

export default function RAGPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [activeProfile, setActiveProfile] = useState("Default");
  const [profiles, setProfiles] = useState(["Default", "Fashion Store", "Tech Support", "Restaurant"]);
  const [newProfileName, setNewProfileName] = useState("");

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingDocs(true);
    try {
      const [docsRes, profileRes] = await Promise.all([
        fetch(`${backendUrl}/ai/rag/list`),
        fetch(`${backendUrl}/ai/rag/profile`)
      ]);
      
      const docsData = await docsRes.json();
      const profileData = await profileRes.json();
      
      setDocs(docsData);
      setActiveProfile(profileData.profile || "Default");
      
      // Extract unique profiles from docs + defaults
      const existingProfiles = [...new Set(docsData.map((d: any) => d.profile).filter(Boolean))] as string[];
      setProfiles(Array.from(new Set(["Default", ...existingProfiles, "Fashion Store", "Tech Support", "Restaurant"])) as string[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleProfileChange = async (profile: string) => {
    setActiveProfile(profile);
    try {
      await fetch(`${backendUrl}/ai/rag/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
    } catch (error) {
      console.error("Error setting profile:", error);
    }
  };

  const handleAddProfile = () => {
    if (newProfileName && !profiles.includes(newProfileName)) {
      setProfiles([...profiles, newProfileName]);
      handleProfileChange(newProfileName);
      setNewProfileName("");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('profile', activeProfile);

    try {
      const response = await fetch(`${backendUrl}/ai/rag/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      setStatus({ type: 'success', message: `Knowledge added to "${activeProfile}" profile!` });
      setFile(null);
      fetchData();
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to remove "${filename}" from the Knowledge Base?`)) return;

    try {
      const response = await fetch(`${backendUrl}/ai/rag/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, filename }),
      });

      if (!response.ok) throw new Error("Delete failed");
      fetchData();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete document.");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Knowledge Base (RAG)</h1>
          <p className="text-slate-500 text-sm">Switch between business contexts instantly.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Business Profile</p>
            <select 
              value={activeProfile}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="bg-emerald-50 text-emerald-700 font-bold px-4 py-2 rounded-xl border border-emerald-100 outline-none cursor-pointer hover:bg-emerald-100 transition-all"
            >
              {profiles.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-end">
            <Input 
              placeholder="New Profile..." 
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className="w-32 h-10 text-xs"
            />
            <Button onClick={handleAddProfile} size="sm" className="h-10">Add</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-emerald-100 shadow-lg shadow-emerald-500/5">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Upload to <span className="text-emerald-600">"{activeProfile}"</span></CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-6">
                <div 
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                    file ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 hover:border-emerald-300 bg-slate-50/30'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
                  }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className={`p-4 rounded-2xl ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-white shadow-sm text-slate-400'}`}>
                      <Upload size={24} />
                    </div>
                    {file ? (
                      <div>
                        <p className="font-bold text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Drop PDF here to train the AI</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Maximum 10MB per file</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept=".pdf" 
                      className="hidden" 
                      id="file-upload" 
                      onChange={(e) => e.target.files && setFile(e.target.files[0])}
                    />
                    {!file && <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('file-upload')?.click()} className="rounded-xl mt-2 font-bold">Choose File</Button>}
                  </div>
                </div>

                {status && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {status.type === 'success' ? <CheckCircle2 size={18} strokeWidth={3} /> : <AlertCircle size={18} strokeWidth={3} />}
                    <span className="text-xs font-black uppercase tracking-wider">{status.message}</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-sm font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20" 
                  disabled={!file || uploading}
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin" size={18} />
                      Analyzing knowledge...
                    </span>
                  ) : `Add to ${activeProfile} Knowledge`}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Global Knowledge Base</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingDocs ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin text-emerald-200" size={48} />
                </div>
              ) : docs.length === 0 ? (
                <div className="text-center py-20 text-slate-400 bg-slate-50/20">
                  <FileText className="mx-auto mb-4 opacity-10" size={64} />
                  <p className="text-sm font-bold">The brain is empty. Upload a PDF to start.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {docs.map((doc) => (
                    <div 
                      key={doc.id} 
                      className={`p-6 flex items-center justify-between group transition-all hover:bg-slate-50/50 ${doc.profile === activeProfile ? 'bg-emerald-50/10 border-l-4 border-l-emerald-500' : 'border-l-4 border-l-transparent'}`}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl shadow-sm ${doc.profile === activeProfile ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <FileText size={24} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-base">{doc.filename}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${doc.profile === activeProfile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                              {doc.profile || "Default"}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {doc.chunks} units
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.profile === activeProfile && (
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter mr-2 animate-pulse">● In Use</span>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 border-slate-100 h-10 px-4 rounded-xl transition-all"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={20} />
                Production Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Business Context</p>
                <p className="text-xs leading-relaxed text-slate-300">
                  The AI only uses knowledge from the **Active Profile**. You can switch business logic instantly by changing the profile above.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Retrieval Quality</p>
                <p className="text-xs leading-relaxed text-slate-300">
                  Deleting a file removes it from AI memory. Upload clear PDFs with bold headings for best results.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Profile</p>
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                  <p className="text-[10px] font-bold text-emerald-400">Current: {activeProfile}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
