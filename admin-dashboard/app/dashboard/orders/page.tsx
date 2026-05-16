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
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Product Info</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Delivery</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {orders.map((order) => {
                    const status = (order.status || 'pending').toLowerCase();
                    const config = statusIcons[status as keyof typeof statusIcons] || statusIcons.pending;
                    const Icon = config.icon;
                    
                    return (
                      <tr 
                        key={order.id} 
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer rounded-xl group"
                      >
                        <td className="px-4 py-5 font-mono text-[10px] text-slate-400">
                          #{order.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-4 py-5">
                          <div className="font-bold text-slate-900 leading-tight">{order.customerName || "WhatsApp User"}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{order.whatsappId}</div>
                        </td>
                        <td className="px-4 py-5">
                          <div className="text-sm font-semibold text-slate-800">{order.product || "Unknown Product"}</div>
                          <div className="text-xs text-slate-500">Qty: {order.quantity || 1}</div>
                        </td>
                        <td className="px-4 py-5">
                          <div className="text-xs text-slate-700 max-w-[180px] truncate font-medium">
                            {order.customerAddress || "No address provided"}
                          </div>
                        </td>
                        <td className="px-4 py-5 font-bold text-emerald-700">${order.totalAmount}</td>
                        <td className="px-4 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.color} ${config.border}`}>
                            <Icon size={10} strokeWidth={3} />
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-3">
                            <select 
                              onChange={(e) => updateStatus(order.id, e.target.value)}
                              value={status}
                              className="text-[10px] font-bold uppercase tracking-wider border-2 border-slate-100 rounded-lg px-2 py-1.5 bg-slate-50 outline-none focus:border-emerald-500 transition-all cursor-pointer"
                            >
                              <option value="pending">Pending</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <CardTitle>Order Details</CardTitle>
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>✕</Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Customer Name</label>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Phone</label>
                  <p className="font-medium">{selectedOrder.whatsappId}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Delivery Address</label>
                <p className="font-medium">{selectedOrder.customerAddress}</p>
              </div>

              <div className="border-t pt-4">
                <label className="text-xs font-bold text-slate-400 uppercase">Product</label>
                <div className="flex justify-between items-center">
                  <p className="font-medium">{selectedOrder.product}</p>
                  <p className="font-bold">${selectedOrder.totalAmount}</p>
                </div>
              </div>
              <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setSelectedOrder(null)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
