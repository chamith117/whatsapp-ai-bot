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

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const response = await fetch(`${backendUrl}/ai/rag/list`);
      const data = await response.json();
      setDocs(data);
    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${backendUrl}/ai/rag/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      setStatus({ type: 'success', message: "Knowledge base updated successfully!" });
      setFile(null);
      fetchDocs();
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
      fetchDocs();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete document.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Knowledge Base (RAG)</h1>
        <p className="text-slate-500">Upload and manage PDF documents to train your AI bot.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Document</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-6">
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    file ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-400'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
                  }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className={`p-4 rounded-full ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Upload size={24} />
                    </div>
                    {file ? (
                      <div>
                        <p className="font-medium text-slate-900">{file.name}</p>
                        <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-slate-900 text-sm">Click to upload or drag and drop</p>
                        <p className="text-xs text-slate-500">PDF documents only (max 10MB)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept=".pdf" 
                      className="hidden" 
                      id="file-upload" 
                      onChange={(e) => e.target.files && setFile(e.target.files[0])}
                    />
                    {!file && <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('file-upload')?.click()}>Select File</Button>}
                  </div>
                </div>

                {status && (
                  <div className={`p-4 rounded-lg flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="text-sm font-medium">{status.message}</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-10" 
                  disabled={!file || uploading}
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin" size={18} />
                      Processing knowledge...
                    </span>
                  ) : "Add to Knowledge Base"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Currently Trained Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDocs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-slate-300" size={32} />
                </div>
              ) : docs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="mx-auto mb-3 opacity-20" size={48} />
                  <p>No documents uploaded yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {docs.map((doc) => (
                    <div key={doc.id} className="py-4 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{doc.filename}</p>
                          <p className="text-xs text-slate-500">
                            {doc.chunks} chunks • {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>RAG Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 text-xs">
                <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold shrink-0">1</div>
                <p className="text-slate-600">Ensure PDFs have selectable text (not scanned images).</p>
              </div>
              <div className="flex gap-3 text-xs">
                <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold shrink-0">2</div>
                <p className="text-slate-600">Include clear headings for better retrieval accuracy.</p>
              </div>
              <div className="flex gap-3 text-xs">
                <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold shrink-0">3</div>
                <p className="text-slate-600">Deleting a file removes its knowledge from the AI.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
