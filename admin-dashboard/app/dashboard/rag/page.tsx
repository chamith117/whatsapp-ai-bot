"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from "@/components/ui";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";

export default function RAGPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ai/rag/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      setStatus({ type: 'success', message: "Knowledge base updated successfully!" });
      setFile(null);
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Knowledge Base (RAG)</h1>
        <p className="text-slate-500">Upload PDF documents to train your AI bot on business knowledge.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Document</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-6">
                <div 
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
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
                      <Upload size={32} />
                    </div>
                    {file ? (
                      <div>
                        <p className="font-medium text-slate-900">{file.name}</p>
                        <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-slate-900">Click to upload or drag and drop</p>
                        <p className="text-sm text-slate-500">PDF documents only (max 10MB)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept=".pdf" 
                      className="hidden" 
                      id="file-upload" 
                      onChange={(e) => e.target.files && setFile(e.target.files[0])}
                    />
                    {!file && <Button variant="outline" type="button" onClick={() => document.getElementById('file-upload')?.click()}>Select File</Button>}
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
                  className="w-full h-12 text-lg" 
                  disabled={!file || uploading}
                >
                  {uploading ? "Processing knowledge..." : "Add to Knowledge Base"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xs font-bold shrink-0">1</div>
                <p className="text-sm text-slate-600">Ensure PDFs have selectable text (not scanned images).</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xs font-bold shrink-0">2</div>
                <p className="text-sm text-slate-600">Include clear headings for better retrieval accuracy.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xs font-bold shrink-0">3</div>
                <p className="text-sm text-slate-600">Avoid password-protected files.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
