"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MonthlyTrendChartProps {
  data: Array<{ month: string; income: number; expense: number; balance: number }>;
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant">
      <h3 className="font-h3 text-h3 text-on-surface mb-4">Tren Bulanan (6 Bulan Terakhir)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#43474e" }} />
            <YAxis tick={{ fontSize: 12, fill: "#43474e" }} tickFormatter={(value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value)} />
            <Tooltip
              formatter={(value: number) => [new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value), ""]}
              contentStyle={{ backgroundColor: "#faf9fc", border: "1px solid #c4c6cf", borderRadius: "8px" }}
            />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", strokeWidth: 2 }} name="Pemasukan" />
            <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444", strokeWidth: 2 }} name="Pengeluaran" />
            <Line type="monotone" dataKey="balance" stroke="#022448" strokeWidth={2} dot={{ fill: "#022448", strokeWidth: 2 }} name="Saldo" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}