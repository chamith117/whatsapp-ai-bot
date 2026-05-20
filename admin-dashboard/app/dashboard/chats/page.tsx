"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { MessageSquare, User, Clock, Search, RefreshCw, Send } from "lucide-react";

export default function ChatsPage() {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/chats`);
      const data = await response.json();
      setChats(data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Conversations</h1>
          <p className="text-slate-500 text-sm">Monitor live AI interactions with your customers.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchChats}
          className="rounded-xl border-slate-200 flex gap-2"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Chat List */}
        <Card className="w-80 flex flex-col border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 border-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Search customers..." 
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {loading && chats.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">Loading...</div>
            ) : chats.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">No chats yet</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full p-4 text-left hover:bg-slate-50 transition-all flex items-center gap-3 ${selectedChat?.id === chat.id ? "bg-emerald-50/50 border-r-4 border-emerald-500" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      <User size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{chat.id}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {chat.messages?.[chat.messages.length - 1]?.text || "No messages"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="flex-1 flex flex-col border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          {selectedChat ? (
            <>
              <CardHeader className="p-6 border-b bg-white flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight">{selectedChat.id}</CardTitle>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      Live WhatsApp Session
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                {selectedChat.messages?.map((msg: any, idx: number) => (
                  <div key={idx} className={`flex ${msg.from === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] p-4 rounded-2xl text-sm shadow-sm ${
                      msg.from === 'user' 
                      ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100' 
                      : 'bg-slate-900 text-white rounded-tr-none'
                    }`}>
                      <p className="leading-relaxed">{msg.text}</p>
                      <p className={`text-[9px] mt-2 font-bold opacity-50 ${msg.from === 'user' ? 'text-slate-400' : 'text-slate-300'}`}>
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="p-4 bg-white border-t">
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-slate-100 border-none rounded-xl px-4 text-sm focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="View only - Conversations are handled by AI"
                    disabled
                  />
                  <Button disabled className="rounded-xl aspect-square p-0 w-12 h-12 bg-slate-200 text-slate-400">
                    <Send size={18} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
              <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                <MessageSquare size={40} className="opacity-20" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em]">Select a conversation to monitor</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
