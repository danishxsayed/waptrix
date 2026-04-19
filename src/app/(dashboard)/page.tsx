"use client";
export const dynamic = "force-dynamic";


import { 
  Send, 
  CheckCircle2, 
  Users, 
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const stats = [
  { 
    name: "Total Messages Sent", 
    value: "12,482", 
    icon: Send, 
    change: "+12.5%", 
    trend: "up",
    color: "jade"
  },
  { 
    name: "Delivery Rate", 
    value: "98.2%", 
    icon: CheckCircle2, 
    change: "+0.4%", 
    trend: "up",
    color: "info"
  },
  { 
    name: "Total Contacts", 
    value: "4,209", 
    icon: Users, 
    change: "+240", 
    trend: "up",
    color: "warning"
  },
  { 
    name: "Active Templates", 
    value: "18", 
    icon: MessageSquare, 
    change: "-2", 
    trend: "down",
    color: "danger"
  },
];

const chartData = [
  { date: 'Apr 04', sent: 400 },
  { date: 'Apr 06', sent: 1200 },
  { date: 'Apr 08', sent: 900 },
  { date: 'Apr 10', sent: 1800 },
  { date: 'Apr 12', sent: 1400 },
  { date: 'Apr 14', sent: 2200 },
  { date: 'Apr 16', sent: 1900 },
  { date: 'Apr 18', sent: 2600 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="glass-card flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-lg bg-${stat.color}/10 border border-${stat.color}/20`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}`} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.trend === 'up' ? 'text-jade' : 'text-danger'}`}>
                {stat.change}
                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              </div>
            </div>
            <div>
              <p className="text-text-muted text-sm font-medium">{stat.name}</p>
              <h3 className="text-3xl font-bold mt-1 font-syne">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold font-syne">Message Volume</h3>
              <p className="text-xs text-text-muted">Volume over the last 14 days</p>
            </div>
            <select className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none">
              <option>Last 14 days</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#273042" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#8896AB" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#8896AB" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#161B26', 
                    border: '1px solid #273042',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#10B981' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSent)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card">
          <h3 className="text-lg font-bold mb-6 font-syne">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-4 bg-surface hover:bg-card border border-border rounded-xl group transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-jade/10 rounded-lg flex items-center justify-center">
                  <Send className="w-5 h-5 text-jade" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">New Campaign</p>
                  <p className="text-[10px] text-text-muted">Blast messages to segment</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-jade transition-colors" />
            </button>

            <button className="w-full flex items-center justify-between p-4 bg-surface hover:bg-card border border-border rounded-xl group transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-info" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Import Contacts</p>
                  <p className="text-[10px] text-text-muted">Upload CSV or XLSX</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-info transition-colors" />
            </button>

            <button className="w-full flex items-center justify-between p-4 bg-surface hover:bg-card border border-border rounded-xl group transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-warning" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Create Template</p>
                  <p className="text-[10px] text-text-muted">Build a Meta approved template</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-warning transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
