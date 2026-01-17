import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Activity } from "lucide-react";

const COLORS = {
  'tjänst': '#4f46e5',
  'privat': '#8b5cf6',
  'väntar': '#f59e0b'
};

export default function TripTypeChart({ data }) {
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
          <Activity className="h-5 w-5 text-indigo-600" />
          <CardTitle className="text-base">Fördelning per resetyp</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Summary stats below chart */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
          {data.map((item) => (
            <div key={item.name} className="text-center">
              <div 
                className="h-2 w-full rounded mb-1" 
                style={{ backgroundColor: COLORS[item.name] || '#94a3b8' }}
              />
              <p className="text-xs text-slate-500 capitalize">{item.name}</p>
              <p className="text-sm font-bold text-slate-900">{item.value} resor</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}