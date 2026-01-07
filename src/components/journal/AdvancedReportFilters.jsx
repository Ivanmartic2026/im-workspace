import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Filter, X } from "lucide-react";

export default function AdvancedReportFilters({ 
  filters, 
  onFiltersChange, 
  vehicles = [], 
  employees = [],
  onClear 
}) {
  const handleChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-600" />
            <h3 className="font-semibold text-slate-900">Filtrera rapport</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Rensa
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Från datum</Label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Till datum</Label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Fordon</Label>
            <Select value={filters.vehicleId} onValueChange={(value) => handleChange('vehicleId', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Alla fordon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla fordon</SelectItem>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.registration_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Förare</Label>
            <Select value={filters.driverId} onValueChange={(value) => handleChange('driverId', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Alla förare" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla förare</SelectItem>
                {employees.map(e => (
                  <SelectItem key={e.user_email} value={e.user_email}>
                    {e.user_email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Fordonstyp</Label>
            <Select value={filters.vehicleType} onValueChange={(value) => handleChange('vehicleType', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Alla typer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla typer</SelectItem>
                <SelectItem value="personbil">Personbil</SelectItem>
                <SelectItem value="lätt lastbil">Lätt lastbil</SelectItem>
                <SelectItem value="lastbil">Lastbil</SelectItem>
                <SelectItem value="skåpbil">Skåpbil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Resetyp</Label>
            <Select value={filters.tripType} onValueChange={(value) => handleChange('tripType', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Alla typer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla typer</SelectItem>
                <SelectItem value="tjänst">Tjänsteresa</SelectItem>
                <SelectItem value="privat">Privatresa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}