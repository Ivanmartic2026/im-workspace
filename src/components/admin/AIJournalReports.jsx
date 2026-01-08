import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, FileDown, FileText } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function AIJournalReports() {
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [filters, setFilters] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    vehicleId: 'all',
    employeeEmail: 'all',
    tripType: 'all',
    reportType: 'summary'
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const handleGenerateReport = async () => {
    setGenerating(true);
    
    try {
      const entries = await base44.entities.DrivingJournalEntry.list();
      
      // Filter entries
      const filteredEntries = entries.filter(entry => {
        const entryDate = new Date(entry.start_time);
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        
        const matchesDate = entryDate >= start && entryDate <= end;
        const matchesVehicle = filters.vehicleId === 'all' || entry.vehicle_id === filters.vehicleId;
        const matchesEmployee = filters.employeeEmail === 'all' || entry.driver_email === filters.employeeEmail;
        const matchesType = filters.tripType === 'all' || entry.trip_type === filters.tripType;
        
        return matchesDate && matchesVehicle && matchesEmployee && matchesType;
      });

      if (filteredEntries.length === 0) {
        alert('Inga resor hittades för valda filter');
        setGenerating(false);
        return;
      }

      // Generate AI report
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Skapa en detaljerad körjournalsrapport baserat på följande data:

Period: ${filters.startDate} till ${filters.endDate}
Antal resor: ${filteredEntries.length}
Total körsträcka: ${filteredEntries.reduce((sum, e) => sum + (e.distance_km || 0), 0).toFixed(1)} km

Resetyp: ${filters.tripType === 'all' ? 'Alla' : filters.tripType}

Resor:
${filteredEntries.slice(0, 50).map((entry, i) => `
${i + 1}. ${format(new Date(entry.start_time), 'yyyy-MM-dd HH:mm')}
   Fordon: ${entry.registration_number || 'Okänd'}
   Förare: ${entry.driver_name || entry.driver_email || 'Okänd'}
   Typ: ${entry.trip_type || 'Okänd'}
   Sträcka: ${(entry.distance_km || 0).toFixed(1)} km
   Tid: ${Math.round((entry.duration_minutes || 0))} min
   ${entry.purpose ? `Syfte: ${entry.purpose}` : ''}
   ${entry.project_code ? `Projekt: ${entry.project_code}` : ''}
   ${entry.customer ? `Kund: ${entry.customer}` : ''}
`).join('\n')}

Skapa en rapport med:
1. Sammanfattning (övergripande statistik och insights)
2. Analys av resmönster
3. Kostnadsbedömning (använd schablon 18,50 kr/mil för tjänsteresor)
4. Rekommendationer för optimering
5. Potentiella avvikelser eller observationer

Använd svensk språk och professionell ton. Var koncis men informativ.`,
        add_context_from_internet: false
      });

      setGeneratedReport({
        content: response,
        filters: filters,
        entries: filteredEntries,
        generatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Kunde inte generera rapport: ' + error.message);
    }
    
    setGenerating(false);
  };

  const handleExportPDF = async () => {
    if (!generatedReport) return;
    
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportJournalPDF', {
        startDate: filters.startDate,
        endDate: filters.endDate,
        vehicleId: filters.vehicleId !== 'all' ? filters.vehicleId : null,
        employeeEmail: filters.employeeEmail !== 'all' ? filters.employeeEmail : null,
        aiReport: generatedReport.content
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-rapport_${filters.startDate}_${filters.endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      alert('Kunde inte exportera PDF: ' + error.message);
    }
    setExporting(false);
  };

  const handleExportCSV = async () => {
    if (!generatedReport) return;
    
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportJournalCSV', {
        startDate: filters.startDate,
        endDate: filters.endDate,
        vehicleId: filters.vehicleId !== 'all' ? filters.vehicleId : null,
        employeeEmail: filters.employeeEmail !== 'all' ? filters.employeeEmail : null
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `körjournal_${filters.startDate}_${filters.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      alert('Kunde inte exportera CSV: ' + error.message);
    }
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">AI Körjournalrapporter</h2>
                <p className="text-sm text-slate-500">Generera intelligenta rapporter med AI-analys</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Från datum</Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Till datum</Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fordon</Label>
                  <Select value={filters.vehicleId} onValueChange={(value) => setFilters({ ...filters, vehicleId: value })}>
                    <SelectTrigger>
                      <SelectValue />
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

                <div>
                  <Label>Förare</Label>
                  <Select value={filters.employeeEmail} onValueChange={(value) => setFilters({ ...filters, employeeEmail: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alla förare</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.user_email} value={emp.user_email}>
                          {emp.user_email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Resetyp</Label>
                <Select value={filters.tripType} onValueChange={(value) => setFilters({ ...filters, tripType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla typer</SelectItem>
                    <SelectItem value="tjänst">Tjänsteresa</SelectItem>
                    <SelectItem value="privat">Privatresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerateReport}
                disabled={generating}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Genererar AI-rapport...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generera AI-rapport
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {generatedReport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Genererad rapport</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportPDF}
                    disabled={exporting}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={exporting}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>

              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                  {generatedReport.content}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Rapport genererad: {format(new Date(generatedReport.generatedAt), 'PPpp', { locale: { code: 'sv' } })}
                  {' • '}
                  {generatedReport.entries.length} resor analyserade
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}