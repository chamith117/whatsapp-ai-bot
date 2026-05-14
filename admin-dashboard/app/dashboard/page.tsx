import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ShoppingCart, Package, MessageSquare, TrendingUp } from "lucide-react";

export default function DashboardOverview() {
  const stats = [
    { name: "Total Orders", value: "128", icon: ShoppingCart, change: "+12%", color: "bg-blue-500" },
    { name: "Active Products", value: "45", icon: Package, change: "+3", color: "bg-emerald-500" },
    { name: "Recent Chats", value: "892", icon: MessageSquare, change: "+48", color: "bg-purple-500" },
    { name: "Conversion Rate", value: "3.2%", icon: TrendingUp, change: "+0.4%", color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500">Welcome back! Here's what's happening with your bot.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                    <p className={`text-xs font-medium mt-2 ${stat.change.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stat.change} <span className="text-slate-400 font-normal ml-1">vs last month</span>
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color} text-white`}>
                    <Icon size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-500 text-center py-12">
              Order history will appear here once connected to Firestore.
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Bot Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-500 text-center py-12">
              Chat activity metrics will appear here.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
