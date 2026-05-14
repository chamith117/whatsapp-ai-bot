"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";


export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics & Insights</h1>
        <p className="text-slate-500">Performance metrics for your WhatsApp AI Business Assistant.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Interaction Volume</CardTitle>
            <CardDescription>Daily message counts over the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <div className="flex items-end justify-between h-full gap-2 px-4 pb-8">
              {[45, 78, 62, 95, 120, 85, 110].map((height, i) => (
                <div key={i} className="flex-1 group relative">
                  <div 
                    className="w-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors rounded-t-lg"
                    style={{ height: `${height}%` }}
                  ></div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 uppercase">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Intent Distribution</CardTitle>
            <CardDescription>What are customers asking about most?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Product Inquiries</span>
                <span className="text-slate-900 font-bold">42%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-[42%] h-full bg-blue-500"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Order Status</span>
                <span className="text-slate-900 font-bold">28%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-[28%] h-full bg-emerald-500"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Pricing & Promos</span>
                <span className="text-slate-900 font-bold">15%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-[15%] h-full bg-purple-500"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Store Info</span>
                <span className="text-slate-900 font-bold">15%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-[15%] h-full bg-slate-400"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Response Accuracy (RAG Confidence)</CardTitle>
          <CardDescription>Percentage of queries successfully answered via Knowledge Base context.</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl font-bold text-emerald-600">94.8%</div>
            <p className="text-slate-500 mt-2">Overall Accuracy Rate</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
