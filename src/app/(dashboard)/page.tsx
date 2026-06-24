"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Send,
  CheckCircle2,
  Users,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  AlertCircle
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const fetchAnalytics = async () => {
    setFetchError("");
    setIsLoading(true);
    try {
      const res = await axios.get("/api/analytics");
      setData(res.data);
    } catch (err: any) {
      setFetchError(err.response?.data?.error || "Failed to load dashboard metrics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-jade border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted text-sm font-medium animate-pulse font-syne">
            Loading dashboard metrics...
          </p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 bg-danger/10 border border-danger/20 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-danger" />
          </div>
          <div>
            <p className="font-bold text-text-primary font-syne">Failed to load dashboard</p>
            <p className="text-sm text-text-muted mt-1">{fetchError}</p>
          </div>
          <button onClick={fetchAnalytics} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: "Total Messages Sent",
      value: data?.stats?.totalSent?.toLocaleString() ?? "0",
      icon: Send,
      change: data?.stats?.totalSent > 0 ? "+100%" : "+0%",
      trend: "up",
      color: "jade"
    },
    {
      name: "Delivery Rate",
      value: `${data?.stats?.deliveryRate ?? 100}%`,
      icon: CheckCircle2,
      change: data?.stats?.deliveryRate >= 90 ? "+0.5%" : "-1.2%",
      trend: data?.stats?.deliveryRate >= 90 ? "up" : "down",
      color: "info"
    },
    {
      name: "Total Contacts",
      value: data?.stats?.totalContacts?.toLocaleString() ?? "0",
      icon: Users,
      change: data?.stats?.totalContacts > 0 ? `+${data.stats.totalContacts}` : "+0",
      trend: "up",
      color: "warning"
    },
    {
      name: "Active Templates",
      value: data?.stats?.activeTemplates?.toLocaleString() ?? "0",
      icon: MessageSquare,
      change: data?.stats?.activeTemplates > 0 ? `+${data.stats.activeTemplates}` : "+0",
      trend: "up",
      color: "danger"
    }
  ];

  const chartData = data?.chartData || [];

  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    jade: { bg: "bg-jade/10", border: "border-jade/20", text: "text-jade" },
    info: { bg: "bg-info/10", border: "border-info/20", text: "text-info" },
    warning: { bg: "bg-warning/10", border: "border-warning/20", text: "text-warning" },
    danger: { bg: "bg-danger/10", border: "border-danger/20", text: "text-danger" }
  };

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const colors = colorMap[stat.color] || colorMap.jade;
          return (
            <div key={stat.name} className="glass-card flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg border ${colors.bg} ${colors.border}`}>
                  <stat.icon className={`w-5 h-5 ${colors.text}`} />
                </div>
              <div
                className={`flex items-center gap-1 text-xs font-bold ${
                  stat.trend === "up" ? "text-jade" : "text-danger"
                }`}
              >
                {stat.change}
                {stat.trend === "up" ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
              </div>
            </div>
            <div>
              <p className="text-text-muted text-sm font-medium">{stat.name}</p>
              <h3 className="text-3xl font-bold mt-1 font-syne">{stat.value}</h3>
            </div>
          </div>
          );
        })}
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
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
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
                    backgroundColor: "#161B26",
                    border: "1px solid #273042",
                    borderRadius: "12px",
                    fontSize: "12px"
                  }}
                  itemStyle={{ color: "#10B981" }}
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
            <button
              onClick={() => router.push("/campaigns?new=true")}
              className="w-full flex items-center justify-between p-4 bg-surface hover:bg-card border border-border rounded-xl group transition-all"
            >
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

            <button
              onClick={() => router.push("/contacts?import=true")}
              className="w-full flex items-center justify-between p-4 bg-surface hover:bg-card border border-border rounded-xl group transition-all"
            >
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

            <button
              onClick={() => router.push("/templates")}
              className="w-full flex items-center justify-between p-4 bg-surface hover:bg-card border border-border rounded-xl group transition-all"
            >
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
