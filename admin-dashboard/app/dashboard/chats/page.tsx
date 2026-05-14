"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { Search, User, Bot, Send, MessageSquare } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

export default function ChatsPage() {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const q = query(collection(db, "chats"), orderBy("updatedAt", "desc"));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(items);
      if (items.length > 0) setSelectedChat(items[0]);
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6">
      <Card className="w-80 flex flex-col h-full">
        <CardHeader className="border-b border-slate-50">
          <CardTitle>Recent Chats</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-slate-200" placeholder="Search contacts..." />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {loading ? (
            <div className="p-4 text-center text-sm text-slate-500">Loading chats...</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {chats.map((chat) => (
                <button 
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full p-4 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 ${selectedChat?.id === chat.id ? 'bg-emerald-50 border-r-2 border-emerald-500' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <User size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{chat.whatsappId}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {chat.messages?.[chat.messages.length - 1]?.text || "No messages"}
                    </p>
                  </div>
                </button>
              ))}
              {chats.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">No active chats.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col h-full">
        {selectedChat ? (
          <>
            <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle>{selectedChat.whatsappId}</CardTitle>
                <CardDescription>Chat History</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Active via WhatsApp
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedChat.messages?.map((msg: any, i: number) => {
                const isBot = msg.from === 'bot';
                return (
                  <div key={i} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] flex gap-3 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isBot ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isBot ? <Bot size={16} /> : <User size={16} />}
                      </div>
                      <div className={`p-3 rounded-2xl text-sm ${isBot ? 'bg-slate-100 text-slate-800' : 'bg-emerald-600 text-white shadow-md shadow-emerald-200'}`}>
                        {msg.text}
                        <div className={`text-[10px] mt-1 ${isBot ? 'text-slate-400' : 'text-emerald-100'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
            <div className="p-4 border-t border-slate-50">
              <div className="flex gap-2">
                <input 
                  className="flex-1 px-4 py-2 rounded-full bg-slate-100 border-none focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  placeholder="Send a manual reply (Admin override)..." 
                />
                <button className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p>Select a chat to view the conversation history.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
