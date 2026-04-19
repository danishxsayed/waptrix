"use client";
export const dynamic = "force-dynamic";


import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  Send, 
  CheckCircle2, 
  Eye, 
  AlertCircle,
  TrendingUp,
  Download
} from "lucide-react";

const stats = [
  { name: "Total Sent", value: "48.2k", icon: Send, color: "jade", trend: "+12%" },
  { name: "Delivered", value: "46.1k", icon: CheckCircle2, color: "info", trend: "95.6%" },
  { name: "Read Rate", value: "62.4%", icon: Eye, color: "warning", trend: "+4.2%" },
  { name: "Failed", value: "0.8k", icon: AlertCircle, color: "danger", trend: "1.6%" },
];

const dailyData = [
  { day: 'Mon', sent: 1200, delivered: 1100, read: 800 },
  { day: 'Tue', sent: 1900, delivered: 1800, read: 1200 },
  { day: 'Wed', sent: 1500, delivered: 1400, read: 900 },
  { day: 'Thu', sent: 2200, delivered: 2100, read: 1500 },
  { day: 'Fri', sent: 2700, delivered: 2600, read: 1800 },
  { day: 'Sat', sent: 1800, delivered: 1700, read: 1100 },
  { day: 'Sun', sent: 1300, delivered: 1250, read: 750 },
];

const statusData = [
  { name: 'Read', value: 62.4, color: '#10B981' },
  { name: 'Delivered', value: 33.2, color: '#0EA5E9' },
  { name: 'Failed', value: 1.6, color: '#F43F5E' },
  { name: 'Sent', value: 2.8, color: '#F59E0B' },
];

const campaignPerformance = [
  { name: "Summer Launch", date: "Apr 18, 2026", sent: 5000, readRate: "72%", status: "success" },
  { name: "Flash Sale #4", date: "Apr 16, 2026", sent: 12000, readRate: "58%", status: "success" },
  { name: "Order Updates", date: "Apr 14, 2026", sent: 850, readRate: "91%", status: "success" },
  { name: "Restock Notification", date: "Apr 12, 2026", sent: 3200, readRate: "65%", status: "success" },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-syne">Analytics Dashboard</h2>
          <p className="text-sm text-text-muted">In-depth performance insights of your WhatsApp campaigns.</p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="glass-card flex flex-col gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}/10 flex items-center justify-center border border-${stat.color}/20`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{stat.name}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-bold font-syne">{stat.value}</h3>
                <span className={`text-xs font-bold ${stat.trend.startsWith('+') || !stat.trend.includes('%') ? 'text-jade' : 'text-text-muted'}`}>
                  {stat.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold font-syne">Daily Performance</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-jade"></span>
                <span className="text-[10px] font-bold text-text-muted uppercase">Sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-info"></span>
                <span className="text-[10px] font-bold text-text-muted uppercase">Read</span>
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#273042" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  stroke="#8896AB" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#8896AB" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#161B26' }}
                  contentStyle={{ 
                    backgroundColor: '#161B26', 
                    border: '1px solid #273042',
                    borderRadius: '12px'
                  }}
                />
                <Bar dataKey="sent" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="read" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-bold font-syne mb-8 text-center">Status Breakdown</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#161B26', 
                    border: '1px solid #273042',
                    borderRadius: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {statusData.map((entry) => (
              <div key={entry.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-xs text-text-muted">{entry.name}</span>
                </div>
                <span className="text-xs font-bold">{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden !p-0">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold font-syne">Campaign Performance</h3>
          <button className="text-xs font-bold text-jade flex items-center gap-1 hover:underline">
            View All Campaigns <TrendingUp className="w-3 h-3" />
          </button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Campaign</th>
              <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Sent Date</th>
              <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Sent</th>
              <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Read Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {campaignPerformance.map((campaign, i) => (
              <tr key={i} className="hover:bg-card/50 transition-colors group">
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold text-text-primary">{campaign.name}</span>
                </td>
                <td className="px-6 py-4 text-xs text-text-muted">{campaign.date}</td>
                <td className="px-6 py-4 text-xs text-text-muted font-bold">
                  {campaign.sent.toLocaleString()} messages
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <div className="w-24 bg-surface rounded-full h-1.5 overflow-hidden">
                      <div className="bg-jade h-full" style={{ width: campaign.readRate }}></div>
                    </div>
                    <span className="text-xs font-bold text-jade">{campaign.readRate}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
