import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Users, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DriverStatsTable({ driverStats }) {
  if (!driverStats || driverStats.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <p className="text-sm text-slate-500">Ingen förardata att visa</p>
        </CardContent>
      </Card>
    );
  }

  // Hitta högsta värden för highlighting
  const maxDistance = Math.max(...driverStats.map(d => d.totalDistance));
  const maxTrips = Math.max(...driverStats.map(d => d.tripCount));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-base">Statistik per förare</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Förare</TableHead>
                <TableHead className="text-right">Resor</TableHead>
                <TableHead className="text-right">Total distans</TableHead>
                <TableHead className="text-right">Snitt/resa</TableHead>
                <TableHead className="text-right">Tjänst</TableHead>
                <TableHead className="text-right">Privat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driverStats
                .sort((a, b) => b.totalDistance - a.totalDistance)
                .map((driver, idx) => (
                  <TableRow key={driver.driverEmail} className="hover:bg-slate-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {idx === 0 && driver.totalDistance === maxDistance && (
                          <Award className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-sm">{driver.driverName || driver.driverEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant="outline" 
                        className={driver.tripCount === maxTrips ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}
                      >
                        {driver.tripCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={driver.totalDistance === maxDistance ? 'text-emerald-700 font-bold' : ''}>
                        {driver.totalDistance.toFixed(0)} km
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-600">
                      {driver.avgDistance.toFixed(1)} km
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs text-blue-600">{driver.businessTrips}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs text-purple-600">{driver.privateTrips}</span>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}