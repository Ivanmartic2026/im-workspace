import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Car } from "lucide-react";

export default function CostAnalysisCard({ vehicleAnalysis }) {
  if (!vehicleAnalysis || vehicleAnalysis.length === 0) {
    return null;
  }

  // Sortera efter totalkostnad
  const sortedAnalysis = [...vehicleAnalysis].sort((a, b) => b.totalCost - a.totalCost);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          <CardTitle className="text-base">Kostnadsanalys per fordon</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedAnalysis.map((vehicle, index) => {
          const costPerKm = vehicle.distance > 0 ? vehicle.totalCost / vehicle.distance : 0;
          const isHighCost = costPerKm > 5; // Över 5 kr/km anses högt

          return (
            <div key={vehicle.vehicleId} className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-900">{vehicle.registrationNumber}</span>
                  {index === 0 && (
                    <Badge variant="outline" className="text-xs">
                      Högst kostnad
                    </Badge>
                  )}
                </div>
                <span className="text-lg font-bold text-slate-900">
                  {vehicle.totalCost.toLocaleString('sv-SE')} kr
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-slate-500">Sträcka</p>
                  <p className="font-semibold text-slate-900">{vehicle.distance.toFixed(0)} km</p>
                </div>
                <div>
                  <p className="text-slate-500">Resor</p>
                  <p className="font-semibold text-slate-900">{vehicle.trips}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-slate-500">Kr/km</p>
                    {isHighCost ? (
                      <TrendingUp className="h-3 w-3 text-rose-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-emerald-500" />
                    )}
                  </div>
                  <p className={`font-semibold ${isHighCost ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {costPerKm.toFixed(2)} kr
                  </p>
                </div>
              </div>

              {vehicle.make && (
                <p className="text-xs text-slate-400 mt-2">
                  {vehicle.make} {vehicle.model} · {vehicle.fuelType}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}