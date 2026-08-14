"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Send } from "lucide-react";

export default function MessageChart({
  data,
  isLoading,
  fetchError,
}: {
  data: { date: string; sent: number }[];
  isLoading?: boolean;
  fetchError?: string;
}) {
  const hasData = data.some(d => d.sent > 0);

  return (
    <div className="h-72 w-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-sm rounded-xl z-10">
          <div className="w-7 h-7 border-4 border-jade border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {fetchError && data.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <p className="text-xs text-danger">{fetchError}</p>
        </div>
      )}
      {!hasData && !isLoading ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-3">
          <Send className="w-8 h-8 text-text-muted opacity-20" />
          <p className="text-sm font-semibold text-text-muted">No messages in this period</p>
          <p className="text-xs text-text-muted opacity-60">Try a wider date range.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}   />
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
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#8896AB"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#161B26",
                border: "1px solid #273042",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              itemStyle={{ color: "#10B981" }}
            />
            <Area
              type="monotone"
              dataKey="sent"
              name="Sent"
              stroke="#10B981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSent)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
