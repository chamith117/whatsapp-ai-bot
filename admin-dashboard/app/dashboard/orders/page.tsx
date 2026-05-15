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

      const response = await fetch(`${backendUrl}/api/orders/${orderId}/status`, {
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
          <h1 className="text-2xl font-bold text-slate-900">Orders Management</h1>
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
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-4 font-semibold text-slate-600">Order ID</th>
                    <th className="pb-4 font-semibold text-slate-600">Customer</th>
                    <th className="pb-4 font-semibold text-slate-600">Phone</th>
                    <th className="pb-4 font-semibold text-slate-600">Product</th>
                    <th className="pb-4 font-semibold text-slate-600">Address</th>
                    <th className="pb-4 font-semibold text-slate-600">Amount</th>
                    <th className="pb-4 font-semibold text-slate-600">Status</th>
                    <th className="pb-4 font-semibold text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map((order) => {
                    const status = (order.status || 'pending').toLowerCase();
                    const config = statusIcons[status as keyof typeof statusIcons] || statusIcons.pending;
                    const Icon = config.icon;
                    
                    return (
                      <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 font-mono text-xs text-slate-500">#{order.id.slice(-8).toUpperCase()}</td>
                        <td className="py-4">
                          <div className="font-medium text-slate-900">{order.customerName || "WhatsApp User"}</div>
                        </td>
                        <td className="py-4 text-xs font-mono text-slate-500">
                          {order.whatsappId}
                        </td>
                        <td className="py-4 text-sm text-slate-600">
                          {order.product || "Unknown Product"}
                        </td>
                        <td className="py-4 text-sm text-slate-600 max-w-[200px] truncate">
                          {order.customerAddress || "No address provided"}
                        </td>
                        <td className="py-4 font-semibold text-slate-900">${order.totalAmount}</td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.bg} ${config.color} ${config.border}`}>
                            <Icon size={12} />
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <select 
                              onChange={(e) => updateStatus(order.id, e.target.value)}
                              value={status}
                              className="text-xs border rounded px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button 
                              onClick={() => setSelectedOrder(order)}
                              className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                            >
                              <Eye size={18} />
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
              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>✕</Button>
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
