import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, Filter, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

export default function TimesheetApproval() {
  const queryClient = useQueryClient();
  const [filterProject, setFilterProject] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me()
  });

  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ['timesheetApproval'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 500)
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timesheetApproval'] })
  });

  const getEmployeeName = (email) => {
    const emp = employees.find(e => e.user_email === email);
    return emp?.display_name || email;
  };

  const getProjectName = (projectId) => {
    if (!projectId) return '—';
    const proj = projects.find(p => p.id === projectId);
    return proj ? `${proj.project_code} – ${proj.name}` : projectId;
  };

  const applyFilters = (entries) => {
    return entries.filter(e => {
      if (filterProject !== 'all' && e.project_id !== filterProject) return false;
      if (filterFrom && e.date < filterFrom) return false;
      if (filterTo && e.date > filterTo) return false;
      return true;
    });
  };

  const pending = applyFilters(allEntries.filter(e => e.approval_status === 'pending' || !e.approval_status));
  const approved = applyFilters(allEntries.filter(e => e.approval_status === 'approved'));

  const handleApprove = async (entry) => {
    setProcessingId(entry.id);
    await updateMutation.mutateAsync({
      id: entry.id,
      data: {
        approval_status: 'approved',
        approved_by: currentUser?.email,
        approved_at: new Date().toISOString()
      }
    });

    // Try to create Fortnox order (best-effort)
    try {
      const proj = projects.find(p => p.id === entry.project_id);
      const projectNumber = proj?.fortnoxProjectNumber || entry.fortnoxProjectNumber;
      if (projectNumber) {
        const res = await base44.functions.invoke('createFortnoxOrder', {
          timeEntryId: entry.id,
          projectNumber,
          employeeName: getEmployeeName(entry.employee_email),
          hours: entry.total_hours || 0,
          hourlyRate: proj?.hourly_rate || 0,
          description: entry.notes || entry.category || '',
          date: entry.date
        });
        if (res.data?.success) {
          toast.success(`Godkänd! Fortnox order ${res.data.orderNumber} skapad.`);
        } else {
          toast.success('Godkänd! (Fortnox-order kunde inte skapas automatiskt)');
        }
      } else {
        toast.success('Tidpost godkänd!');
      }
    } catch {
      toast.success('Tidpost godkänd!');
    }
    setProcessingId(null);
  };

  const handleReject = async (entry) => {
    setProcessingId(entry.id);
    await updateMutation.mutateAsync({
      id: entry.id,
      data: { approval_status: 'rejected' }
    });
    toast.success('Tidpost avvisad.');
    setProcessingId(null);
  };

  const EntryRow = ({ entry, showActions = true }) => {
    const proj = projects.find(p => p.id === entry.project_id);
    const hourlyRate = proj?.hourly_rate || 0;
    const hours = entry.total_hours || 0;
    const cost = hours * hourlyRate;
    const isProcessing = processingId === entry.id;

    return (
      <tr className="border-b border-slate-100 hover:bg-slate-50">
        <td className="py-3 px-3 text-sm text-slate-600">
          {entry.date ? format(new Date(entry.date), 'd MMM yyyy', { locale: sv }) : '—'}
        </td>
        <td className="py-3 px-3 text-sm font-medium text-slate-900">
          {getEmployeeName(entry.employee_email)}
        </td>
        <td className="py-3 px-3 text-sm text-slate-600">
          {getProjectName(entry.project_id)}
        </td>
        <td className="py-3 px-3 text-sm text-right font-semibold text-slate-900">
          {hours.toFixed(1)}h
        </td>
        <td className="py-3 px-3 text-sm text-slate-500 max-w-[200px] truncate">
          {entry.notes || entry.category || '—'}
        </td>
        <td className="py-3 px-3 text-sm text-right text-slate-600">
          {hourlyRate > 0 ? `${hourlyRate} kr/h` : '—'}
        </td>
        <td className="py-3 px-3 text-sm text-right font-semibold text-slate-900">
          {cost > 0 ? `${cost.toFixed(0)} kr` : '—'}
        </td>
        <td className="py-3 px-3">
          {showActions ? (
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                className="text-green-700 border-green-300 hover:bg-green-50 h-8 gap-1"
                disabled={isProcessing}
                onClick={() => handleApprove(entry)}
              >
                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                Godkänn
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-50 h-8 gap-1"
                disabled={isProcessing}
                onClick={() => handleReject(entry)}
              >
                <XCircle className="h-3 w-3" />
                Avvisa
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              {entry.approval_status === 'approved' && (
                <Badge className="bg-green-100 text-green-800 border-0">
                  {entry.fortnox_order_number ? `Order ${entry.fortnox_order_number}` : 'Godkänd'}
                </Badge>
              )}
              {entry.approval_status === 'rejected' && (
                <Badge className="bg-red-100 text-red-800 border-0">Avvisad</Badge>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  };

  const TableHeader = () => (
    <thead>
      <tr className="border-b-2 border-slate-200 bg-slate-50">
        <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Datum</th>
        <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Medarbetare</th>
        <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Projekt</th>
        <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Timmar</th>
        <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Beskrivning</th>
        <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Timpris</th>
        <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Kostnad</th>
        <th className="py-3 px-3"></th>
      </tr>
    </thead>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tidsgodkännande</h1>
          <p className="text-slate-500 text-sm mt-1">Granska och godkänn medarbetarnas tidrapporter</p>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-52 h-9">
                  <SelectValue placeholder="Alla projekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla projekt</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_code} – {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="w-36 h-9" placeholder="Från" />
              <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="w-36 h-9" placeholder="Till" />
              {(filterProject !== 'all' || filterFrom || filterTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setFilterProject('all'); setFilterFrom(''); setFilterTo(''); }}>
                  Rensa filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-amber-500" />
              Väntande godkännande
              <Badge className="bg-amber-100 text-amber-800 border-0 ml-1">{pending.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : pending.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">Inga väntande tidrapporter</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <TableHeader />
                  <tbody>
                    {pending.map(entry => <EntryRow key={entry.id} entry={entry} showActions={true} />)}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approved */}
        {approved.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Godkända
                <Badge className="bg-green-100 text-green-800 border-0 ml-1">{approved.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <TableHeader />
                  <tbody>
                    {approved.slice(0, 50).map(entry => <EntryRow key={entry.id} entry={entry} showActions={false} />)}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}