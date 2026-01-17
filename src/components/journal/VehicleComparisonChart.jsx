import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Car } from "lucide-react";

export default function VehicleComparisonChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <p className="text-sm text-slate-500">Ingen fordonsdata att visa</p>
        </CardContent>
      </Card>
    );
  }

  // Sortera och ta topp 10 fordon
  const topVehicles = [...data]
    .sort((a, b) => b.distance - a.distance)
    .slice(0, 10)
    .map(v => ({
      ...v,
      name: v.registrationNumber || 'Okänt'
    }));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-base">Jämförelse per fordon (Topp 10)</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topVehicles} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number"
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
              label={{ value: 'km', position: 'insideBottom', style: { fontSize: 12 } }}
            />
            <YAxis 
              dataKey="name" 
              type="category"
              tick={{ fontSize: 11 }}
              stroke="#94a3b8"
              width={80}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value) => `${value.toFixed(0)} km`}
            />
            <Bar dataKey="distance" fill="#8b5cf6" name="Körsträcka" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}