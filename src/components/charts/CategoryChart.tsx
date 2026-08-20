"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = ["#10b981", "#ef4444", "#022448", "#f59e0b", "#16677a", "#8b5cf6", "#ec4899", "#06b6d4"];

interface CategoryChartProps {
  data: Array<{ name: string; value: number }>;
  title: string;
  color: string;
}

export function CategoryChart({ data, title, color }: CategoryChartProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant">
      <h3 className="font-h3 text-h3 text-on-surface mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e9e7eb" vertical={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: "#43474e" }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "#1a1c1e" }} width={100} />
            <Tooltip
              formatter={(value: number) => [new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value), ""]}
              contentStyle={{ backgroundColor: "#faf9fc", border: "1px solid #c4c6cf", borderRadius: "8px" }}
            />
            <Bar dataKey="value" fill={color} name={title} radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={["#10b981", "#ef4444", "#022448", "#f59e0b", "#16677a", "#8b5cf6", "#ec4899", "#06b6d4"][index % 8]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}