"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { Search, Eye, Filter, CheckCircle2, Clock, Truck, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc, orderBy, query } from "firebase/firestore";

const statusIcons = {
  pending: { icon: Clock, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100" },
  processing: { icon: Truck, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" },
  delivered: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
  cancelled: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(items);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      if (!backendUrl) {
        console.error("NEXT_PUBLIC_BACKEND_URL is not set. Falling back to direct database update.");
        await updateDoc(doc(db, "orders", orderId), { status: newStatus });
        fetchOrders();
        return;
      }

      const response = await fetch(`${backendUrl}/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
      } else {
        const errorData = await response.json();
        console.error("Backend update failed:", errorData);
        // Fallback
        await updateDoc(doc(db, "orders", orderId), { status: newStatus });
        fetchOrders();
      }
    } catch (error) {
      console.warn("Backend update failed (Network Error), falling back to Firebase:", error);
      try {
        await updateDoc(doc(db, "orders", orderId), { status: newStatus });
        fetchOrders();
      } catch (fbError) {
        console.error("Firebase fallback also failed:", fbError);
      }
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to PERMANENTLY delete this order? This cannot be undone.")) return;
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (backendUrl) {
        const response = await fetch(`${backendUrl}/orders/${orderId}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Delete failed");
      } else {
        const { deleteDoc, doc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "orders", orderId));
      }
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.warn("Backend delete failed (Network Error), falling back to Firebase:", error);
      try {
        const { deleteDoc, doc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "orders", orderId));
        setSelectedOrder(null);
        fetchOrders();
      } catch (fbError) {
        console.error("Firebase fallback delete failed:", fbError);
        alert("Failed to delete order.");
      }
    }
  };

  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Order Management</h1>
          <p className="text-slate-500 text-sm">Monitor and manage your WhatsApp sales pipeline.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrders} className="rounded-xl border-slate-200">Refresh Data</Button>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50">
        <CardHeader className="pb-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="Search orders, customers or products..." 
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading orders...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    <th className="px-6 py-2">Order ID</th>
                    <th className="px-6 py-2">Date & Time</th>
                    <th className="px-6 py-2">Customer</th>
                    <th className="px-6 py-2">Price</th>
                    <th className="px-6 py-2">Status</th>
                    <th className="px-6 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const status = (order.status || 'pending').toLowerCase();
                    const config = statusIcons[status as keyof typeof statusIcons] || statusIcons.pending;
                    const dateObj = order.createdAt ? new Date(order.createdAt) : null;
                    
                    return (
                      <tr 
                        key={order.id} 
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white hover:bg-slate-50/50 group transition-all cursor-pointer shadow-sm hover:shadow-md border border-slate-100 rounded-2xl"
                      >
                        <td className="px-6 py-5 first:rounded-l-2xl border-y border-l border-slate-100 group-hover:border-emerald-100">
                          <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-5 border-y border-slate-100 group-hover:border-emerald-100">
                          <div className="text-sm font-bold text-slate-900">
                            {dateObj ? dateObj.toLocaleDateString() : "N/A"}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                            {dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </div>
                        </td>
                        <td className="px-6 py-5 border-y border-slate-100 group-hover:border-emerald-100">
                          <div className="font-bold text-slate-900">{order.customerName || "WhatsApp User"}</div>
                          <div className="text-[10px] font-medium text-slate-400">{order.product}</div>
                        </td>
                        <td className="px-6 py-5 border-y border-slate-100 group-hover:border-emerald-100">
                          <div className="font-black text-emerald-700">${order.totalAmount}</div>
                        </td>
                        <td className="px-6 py-5 border-y border-slate-100 group-hover:border-emerald-100">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${config.bg} ${config.color} ${config.border}`}>
                            <config.icon size={10} strokeWidth={3} />
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-5 last:rounded-r-2xl border-y border-r border-slate-100 group-hover:border-emerald-100 text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl h-9 w-9 p-0 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                          >
                            <Eye size={18} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modern Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full shadow-2xl border-none overflow-hidden animate-in zoom-in duration-200">
            <CardHeader className="bg-slate-50 border-b p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Order Manifest</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${statusIcons[selectedOrder.status as keyof typeof statusIcons]?.bg} ${statusIcons[selectedOrder.status as keyof typeof statusIcons]?.color}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <CardTitle className="text-3xl font-black text-slate-900 tracking-tighter">#{selectedOrder.id.slice(-8).toUpperCase()}</CardTitle>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:rotate-90"
                >
                  ✕
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Customer Profile</label>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="font-black text-slate-900 text-lg">{selectedOrder.customerName || "WhatsApp User"}</p>
                      <p className="text-sm font-bold text-slate-500">{selectedOrder.whatsappId}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Shipping Instruction</label>
                    <p className="text-sm font-bold text-slate-700 bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50 leading-relaxed">
                      {selectedOrder.customerAddress || "Pick up in store / No address provided"}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Product Summary</label>
                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-900/20">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-emerald-400 font-black text-2xl">${selectedOrder.totalAmount}</p>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-2 py-1 rounded">Paid via WhatsApp</span>
                      </div>
                      <p className="font-bold text-lg mb-1">{selectedOrder.product}</p>
                      <p className="text-xs text-slate-400">Inventory SKU: {selectedOrder.id.slice(0, 8)} • Qty: {selectedOrder.quantity || 1}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Update Order Pipeline</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['pending', 'shipped', 'delivered', 'cancelled'].map((s) => (
                        <button
                          key={s}
                          onClick={() => updateStatus(selectedOrder.id, s)}
                          className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                            selectedOrder.status === s 
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-105' 
                            : 'bg-white border-slate-50 text-slate-400 hover:border-emerald-100'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t flex flex-col md:flex-row gap-3">
                <Button 
                  className="flex-1 h-14 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl" 
                  onClick={() => setSelectedOrder(null)}
                >
                  Confirm & Save
                </Button>
                <Button 
                  variant="outline"
                  className="h-14 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 font-black uppercase tracking-[0.2em] text-xs rounded-2xl" 
                  onClick={() => deleteOrder(selectedOrder.id)}
                >
                  Delete Order
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
