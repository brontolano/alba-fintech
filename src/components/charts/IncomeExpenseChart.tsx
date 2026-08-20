"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

const COLORS = ["#10b981", "#ef4444", "#022448", "#f59e0b", "#16677a"];

interface IncomeExpenseChartProps {
  data: Array<{ name: string; income: number; expense: number }>;
}

export function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant">
      <h3 className="font-h3 text-h3 text-on-surface mb-4">Pemasukan vs Pengeluaran per Unit</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e9e7eb" vertical={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: "#43474e" }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "#1a1c1e" }} width={80} />
            <Tooltip
              formatter={(value: number) => [new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value), ""]}
              contentStyle={{ backgroundColor: "#faf9fc", border: "1px solid #c4c6cf", borderRadius: "8px" }}
            />
            <Legend />
            <Bar dataKey="income" fill="#10b981" name="Pemasukan" radius={[0, 4, 4, 0]} />
            <Bar dataKey="expense" fill="#ef4444" name="Pengeluaran" radius={[4, 0, 0, 4]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}