"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SubjectDemoData } from "@/lib/demo-data";

const tooltipStyle = {
  background: "#141827",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 12,
  color: "#f4f5fb",
  fontSize: 12,
};

export function ProgressChart({ data }: { data: SubjectDemoData }) {
  return (
    <div aria-label="Illustrative mastery progress trend over five weeks" className="h-[230px] w-full">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data.progressTrend} margin={{ top: 12, right: 8, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="progress-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
          <XAxis axisLine={false} dataKey="week" tick={{ fill: "#778096", fontSize: 10 }} tickLine={false} />
          <YAxis axisLine={false} domain={[0, 100]} tick={{ fill: "#778096", fontSize: 10 }} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, "Mastery"]} />
          <Area dataKey="progress" fill="url(#progress-fill)" stroke="#b9a2ff" strokeWidth={2.5} type="monotone" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopicDistributionChart({ data }: { data: SubjectDemoData }) {
  const distribution = [
    { name: "Strong", value: data.topics.filter((topic) => topic.status === "Strong").length, color: "#6ee7b7" },
    { name: "Medium", value: data.topics.filter((topic) => topic.status === "Medium").length, color: "#fcd34d" },
    { name: "Weak", value: data.topics.filter((topic) => topic.status === "Weak").length, color: "#fda4af" },
    { name: "Not assessed", value: data.topics.filter((topic) => topic.status === "Not Assessed").length, color: "#64748b" },
  ];

  return (
    <div aria-label="Illustrative distribution of topic mastery statuses" className="h-[180px] w-full">
      <ResponsiveContainer height="100%" width="100%">
        <PieChart>
          <Pie data={distribution} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={4} stroke="none">
            {distribution.map((entry) => <Cell fill={entry.color} key={entry.name} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopicProgressChart({ data }: { data: SubjectDemoData }) {
  const chartTopics = data.topics.filter((topic) => topic.mastery !== null).slice(0, 2);

  return (
    <div aria-label="Illustrative topic mastery across three attempts" className="h-[250px] w-full">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data.topicProgressHistory} margin={{ top: 12, right: 10, bottom: 0, left: -22 }}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
          <XAxis axisLine={false} dataKey="attempt" tick={{ fill: "#778096", fontSize: 10 }} tickLine={false} />
          <YAxis axisLine={false} domain={[0, 100]} tick={{ fill: "#778096", fontSize: 10 }} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${value}%`, name]} />
          {chartTopics.map((topic, index) => (
            <Line
              dataKey={topic.id}
              dot={{ fill: index === 0 ? "#c4b5fd" : "#67e8f9", r: 3 }}
              key={topic.id}
              name={topic.name}
              stroke={index === 0 ? "#c4b5fd" : "#67e8f9"}
              strokeWidth={index === 0 ? 2.5 : 2}
              type="monotone"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
