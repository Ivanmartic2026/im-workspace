import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from "lucide-react";

export default function MonthlyTrendsChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <p className="text-sm text-slate-500">Ingen data att visa</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <CardTitle className="text-base">Trender över tid</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
              yAxisId="left"
              label={{ value: 'km', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
              yAxisId="right"
              orientation="right"
              label={{ value: 'Antal resor', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line 
              type="monotone" 
              dataKey="totalDistance" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Total distans (km)"
              yAxisId="left"
              dot={{ fill: '#10b981', r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="tripCount" 
              stroke="#6366f1" 
              strokeWidth={2}
              name="Antal resor"
              yAxisId="right"
              dot={{ fill: '#6366f1', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}