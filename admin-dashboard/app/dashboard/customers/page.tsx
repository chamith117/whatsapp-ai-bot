"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { Users, Phone, ShoppingBag, Gift, Send, RefreshCw, X } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [discountValue, setDiscountValue] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/customers`);
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyDiscount = async (id: string, discount: string) => {
    if (!discount || isNaN(Number(discount))) return alert("Enter a valid discount percentage.");
    
    try {
      const response = await fetch(`${backendUrl}/customers/${id}/discount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discount }),
      });
      if (!response.ok) throw new Error("Failed to apply discount");
      fetchCustomers();
      setSelectedCustomer(null);
    } catch (error) {
      console.error(error);
      alert("Error applying discount");
    }
  };

  const sendDiscountMessage = async (id: string, discount: number) => {
    if (discount <= 0) return alert("Please apply a discount before sending a message.");
    if (!window.confirm(`Send WhatsApp message offering ${discount}% off to this customer?`)) return;

    try {
      setSendingMsg(true);
      const response = await fetch(`${backendUrl}/customers/${id}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discount }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      alert("Message sent successfully via WhatsApp!");
    } catch (error) {
      console.error(error);
      alert("Error sending message");
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Loyalty & Customers</h1>
          <p className="text-slate-500 text-sm">Identify repeat buyers and offer targeted discounts.</p>
        </div>
        <Button 
          onClick={fetchCustomers} 
          variant="outline"
          className="rounded-xl border-slate-200"
        >
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((c, i) => (
          <Card key={c.id} className={`border-none shadow-xl transition-all duration-300 ${c.orderCount > 1 ? 'shadow-emerald-500/10 ring-1 ring-emerald-500/20' : 'shadow-slate-200/50'}`}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">{c.name || 'Unknown'}</CardTitle>
                  <p className="text-sm font-medium text-slate-500 flex items-center gap-2 mt-1">
                    <Phone size={14} /> {c.id}
                  </p>
                </div>
                {c.orderCount > 1 && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                    Repeat Buyer
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 mb-6">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Orders</p>
                  <p className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    {c.orderCount} <ShoppingBag size={18} className="text-slate-300" />
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Discount</p>
                  <p className={`text-2xl font-black flex items-center gap-2 ${c.discount > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {c.discount || 0}% <Gift size={18} className={c.discount > 0 ? 'text-emerald-400' : 'text-slate-300'} />
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => setSelectedCustomer(c)}
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
                >
                  Set Discount
                </Button>
                {c.discount > 0 && (
                  <Button 
                    onClick={() => sendDiscountMessage(c.id, c.discount)}
                    disabled={sendingMsg}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Send size={16} className="mr-2" /> {sendingMsg ? 'Sending...' : 'Notify'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-none shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Apply Discount</CardTitle>
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600 mb-6">
                Apply a percentage discount for <strong>{selectedCustomer.name}</strong> ({selectedCustomer.id}). The AI bot will automatically apply this to their next order total.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Discount Percentage (%)</label>
                  <input 
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-lg font-bold"
                  />
                </div>
                
                <Button 
                  onClick={() => applyDiscount(selectedCustomer.id, discountValue)}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-6"
                >
                  Save Discount
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
