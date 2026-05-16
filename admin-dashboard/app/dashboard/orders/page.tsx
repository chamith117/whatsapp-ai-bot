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
      console.error("Error updating status:", error);
    }
  };

  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders Management (Live Updated)</h1>
          <p className="text-slate-500">Track and manage customer orders from WhatsApp.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="Search orders by ID or customer..." 
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">Loading orders...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-slate-500 text-sm">
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Order ID</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Customer Name</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {orders.map((order) => {
                    const status = (order.status || 'pending').toLowerCase();
                    const config = statusIcons[status as keyof typeof statusIcons] || statusIcons.pending;
                    
                    return (
                      <tr 
                        key={order.id} 
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer rounded-xl group"
                      >
                        <td className="px-4 py-5 font-mono text-[10px] text-slate-400">
                          #{order.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-4 py-5 text-sm font-medium text-slate-600">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-4 py-5">
                          <div className="font-bold text-slate-900 leading-tight">{order.customerName || "WhatsApp User"}</div>
                        </td>
                        <td className="px-4 py-5 font-bold text-emerald-700">${order.totalAmount}</td>
                        <td className="px-4 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.color} ${config.border}`}>
                              {status}
                            </span>
                            <button 
                              className="p-2 text-slate-300 group-hover:text-emerald-600 transition-colors"
                            >
                              <Eye size={20} />
                            </button>
                          </div>
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

      {/* Basic Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full shadow-2xl border-emerald-100 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order ID</p>
                  <CardTitle className="text-xl font-bold text-slate-900">#{selectedOrder.id.slice(-8).toUpperCase()}</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)} className="rounded-full w-8 h-8 p-0">✕</Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Customer Name</label>
                  <p className="font-bold text-slate-900">{selectedOrder.customerName || "WhatsApp User"}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">WhatsApp Phone</label>
                  <p className="font-bold text-slate-900">{selectedOrder.whatsappId}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Delivery Address</label>
                <p className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {selectedOrder.customerAddress || "No address provided"}
                </p>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-2">Order Items</label>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900">{selectedOrder.product}</p>
                    <p className="text-xs text-slate-500">Quantity: {selectedOrder.quantity || 1}</p>
                  </div>
                  <p className="text-lg font-black text-emerald-700">${selectedOrder.totalAmount}</p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Update Order Status</label>
                <div className="flex gap-2">
                  {['pending', 'shipped', 'delivered', 'cancelled'].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selectedOrder.id, s)}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all border-2 ${
                        selectedOrder.status === s 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full h-12 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg mt-2" onClick={() => setSelectedOrder(null)}>Done</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
