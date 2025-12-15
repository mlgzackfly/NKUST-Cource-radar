"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";

type SummaryData = {
  totalReviews: number;
  avg: {
    coolness: number | null;
    usefulness: number | null;
    workload: number | null;
    attendance: number | null;
  };
};

type CourseSummaryChartProps = {
  summary: SummaryData;
};

const CourseSummaryChart = ({ summary }: CourseSummaryChartProps) => {
  const data = [
    { subject: "涼度", value: summary.avg.coolness, fullMark: 5 },
    { subject: "實用", value: summary.avg.usefulness, fullMark: 5 },
    { subject: "作業量", value: summary.avg.workload, fullMark: 5 },
    { subject: "出席", value: summary.avg.attendance, fullMark: 5 },
  ];

  const fmt = (v: number | null) => (v === null ? "—" : v.toFixed(1));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis angle={30} domain={[0, 5]} tickFormatter={(v) => fmt(v as number)} />
        <Radar name="平均分數" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default CourseSummaryChart;
