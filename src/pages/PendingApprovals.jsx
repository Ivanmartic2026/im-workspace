import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Clock, FileText, Calendar, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function PendingApprovals() {
  const [reviewComment, setReviewComment] = useState({});
  const queryClient = useQueryClient();

  const { data: approvalRequests = [] } = useQuery({
    queryKey: ['approval-requests'],
    queryFn: () => base44.entities.ApprovalRequest.list('-created_date'),
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => base44.entities.LeaveRequest.list('-created_date'),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries-anomaly'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date'),
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => base44.entities.DrivingJournalEntry.list('-created_date'),
  });

  const pendingApprovals = approvalRequests.filter(r => r.status === 'pending');
  const pendingLeave = leaveRequests.filter(r => r.status === 'pending');
  const anomalyTimeEntries = timeEntries.filter(e => e.anomaly_flag === true);
  const pendingJournal = journalEntries.filter(e => e.status === 'pending_review');

  const approveApprovalMutation = useMutation({
    mutationFn: async ({ id, comment }) => {
      const approval = approvalRequests.find(a => a.id === id);
      
      // Update approval request
      await base44.entities.ApprovalRequest.update(id, {
        status: 'approved',
        reviewed_by: (await base44.auth.me()).email,
        reviewed_at: new Date().toISOString(),
        review_comment: comment
      });

      // Apply changes to related entity
      if (approval.related_entity_type === 'TimeEntry' && approval.related_entity_id) {
        await base44.entities.TimeEntry.update(approval.related_entity_id, {
          ...approval.requested_data,
          edit_reason: approval.reason,
          edited_by: (await base44.auth.me()).email,
          edited_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries-anomaly'] });
    },
  });

  const rejectApprovalMutation = useMutation({
    mutationFn: async ({ id, comment }) => {
      await base44.entities.ApprovalRequest.update(id, {
        status: 'rejected',
        reviewed_by: (await base44.auth.me()).email,
        reviewed_at: new Date().toISOString(),
        review_comment: comment
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
    },
  });

  const approveLeave = useMutation({
    mutationFn: async ({ id, comment }) => {
      await base44.entities.LeaveRequest.update(id, {
        status: 'approved',
        reviewed_by: (await base44.auth.me()).email,
        reviewed_at: new Date().toISOString(),
        review_comment: comment
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  const rejectLeave = useMutation({
    mutationFn: async ({ id, comment }) => {
      await base44.entities.LeaveRequest.update(id, {
        status: 'rejected',
        reviewed_by: (await base44.auth.me()).email,
        reviewed_at: new Date().toISOString(),
        review_comment: comment
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  const approveJournal = useMutation({
    mutationFn: async ({ id, comment }) => {
      await base44.entities.DrivingJournalEntry.update(id, {
        status: 'approved',
        reviewed_by: (await base44.auth.me()).email,
        reviewed_at: new Date().toISOString(),
        review_comment: comment
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    },
  });

  const rejectJournal = useMutation({
    mutationFn: async ({ id, comment }) => {
      await base44.entities.DrivingJournalEntry.update(id, {
        status: 'rejected',
        reviewed_by: (await base44.auth.me()).email,
        reviewed_at: new Date().toISOString(),
        review_comment: comment
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Väntande godkännanden</h1>
          <p className="text-slate-500 text-sm">Granska och godkänn alla avvikelser och ansökningar</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="border-0 shadow-sm bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tidjusteringar</p>
                  <p className="text-xl font-bold text-slate-900">{pendingApprovals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ledighetsansökningar</p>
                  <p className="text-xl font-bold text-slate-900">{pendingLeave.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-rose-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tidsavvikelser</p>
                  <p className="text-xl font-bold text-slate-900">{anomalyTimeEntries.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Körrappporter</p>
                  <p className="text-xl font-bold text-slate-900">{pendingJournal.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="time-adjustments">
          <TabsList className="w-full bg-white shadow-sm rounded-lg p-1 mb-6">
            <TabsTrigger value="time-adjustments" className="rounded-md">
              Tidjusteringar ({pendingApprovals.length})
            </TabsTrigger>
            <TabsTrigger value="leave" className="rounded-md">
              Ledighet ({pendingLeave.length})
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="rounded-md">
              Avvikelser ({anomalyTimeEntries.length})
            </TabsTrigger>
            <TabsTrigger value="journal" className="rounded-md">
              Körjournal ({pendingJournal.length})
            </TabsTrigger>
          </TabsList>

          {/* Time Adjustments */}
          <TabsContent value="time-adjustments" className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                  <p className="text-slate-500">Inga väntande tidjusteringar</p>
                </CardContent>
              </Card>
            ) : (
              pendingApprovals.map(approval => (
                <Card key={approval.id} className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{approval.requester_name}</span>
                      <Badge className="bg-amber-100 text-amber-700 border-0">Väntar</Badge>
                    </CardTitle>
                    <p className="text-sm text-slate-500">{approval.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-sm font-semibold text-slate-700 mb-2">Anledning:</p>
                      <p className="text-sm text-slate-600">{approval.reason}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-2">Nuvarande tider:</p>
                        <div className="bg-rose-50 rounded-lg p-3 space-y-1">
                          <p className="text-sm font-mono">In: {approval.original_data?.clock_in_time ? format(new Date(approval.original_data.clock_in_time), 'HH:mm', { locale: sv }) : '-'}</p>
                          <p className="text-sm font-mono">Ut: {approval.original_data?.clock_out_time ? format(new Date(approval.original_data.clock_out_time), 'HH:mm', { locale: sv }) : '-'}</p>
                          <p className="text-sm font-semibold">Totalt: {approval.original_data?.total_hours?.toFixed(2) || '-'}h</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-2">Begärda tider:</p>
                        <div className="bg-emerald-50 rounded-lg p-3 space-y-1">
                          <p className="text-sm font-mono">In: {approval.requested_data?.clock_in_time ? format(new Date(approval.requested_data.clock_in_time), 'HH:mm', { locale: sv }) : '-'}</p>
                          <p className="text-sm font-mono">Ut: {approval.requested_data?.clock_out_time ? format(new Date(approval.requested_data.clock_out_time), 'HH:mm', { locale: sv }) : '-'}</p>
                          <p className="text-sm font-semibold">Totalt: {approval.requested_data?.total_hours?.toFixed(2) || '-'}h</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Kommentar:</label>
                      <Textarea
                        value={reviewComment[approval.id] || ''}
                        onChange={(e) => setReviewComment(prev => ({ ...prev, [approval.id]: e.target.value }))}
                        placeholder="Valfri kommentar..."
                        className="min-h-[60px]"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => approveApprovalMutation.mutate({ 
                          id: approval.id, 
                          comment: reviewComment[approval.id] 
                        })}
                        disabled={approveApprovalMutation.isPending}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        {approveApprovalMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Godkänn
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => rejectApprovalMutation.mutate({ 
                          id: approval.id, 
                          comment: reviewComment[approval.id] 
                        })}
                        disabled={rejectApprovalMutation.isPending}
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        {rejectApprovalMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Neka
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Leave Requests */}
          <TabsContent value="leave" className="space-y-3">
            {pendingLeave.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                  <p className="text-slate-500">Inga väntande ledighetsansökningar</p>
                </CardContent>
              </Card>
            ) : (
              pendingLeave.map(leave => (
                <Card key={leave.id} className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{leave.employee_email}</span>
                      <Badge className="bg-blue-100 text-blue-700 border-0">Väntar</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Typ:</p>
                        <p className="text-sm font-semibold text-slate-900">{leave.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Antal dagar:</p>
                        <p className="text-sm font-semibold text-slate-900">{leave.days}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Från:</p>
                        <p className="text-sm font-semibold text-slate-900">{leave.start_date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Till:</p>
                        <p className="text-sm font-semibold text-slate-900">{leave.end_date}</p>
                      </div>
                    </div>

                    {leave.reason && (
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm font-semibold text-slate-700 mb-2">Anledning:</p>
                        <p className="text-sm text-slate-600">{leave.reason}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Kommentar:</label>
                      <Textarea
                        value={reviewComment[leave.id] || ''}
                        onChange={(e) => setReviewComment(prev => ({ ...prev, [leave.id]: e.target.value }))}
                        placeholder="Valfri kommentar..."
                        className="min-h-[60px]"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => approveLeave.mutate({ 
                          id: leave.id, 
                          comment: reviewComment[leave.id] 
                        })}
                        disabled={approveLeave.isPending}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Godkänn
                      </Button>
                      <Button
                        onClick={() => rejectLeave.mutate({ 
                          id: leave.id, 
                          comment: reviewComment[leave.id] 
                        })}
                        disabled={rejectLeave.isPending}
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Neka
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Anomalies */}
          <TabsContent value="anomalies" className="space-y-3">
            {anomalyTimeEntries.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                  <p className="text-slate-500">Inga tidsavvikelser</p>
                </CardContent>
              </Card>
            ) : (
              anomalyTimeEntries.map(entry => (
                <Card key={entry.id} className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{entry.employee_email}</span>
                      <Badge className="bg-rose-100 text-rose-700 border-0">Avvikelse</Badge>
                    </CardTitle>
                    <p className="text-sm text-slate-500">{entry.date}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-rose-50 rounded-lg p-4">
                      <p className="text-sm font-semibold text-rose-900 mb-1">Avvikelse:</p>
                      <p className="text-sm text-rose-700">{entry.anomaly_reason}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">Instämplad:</p>
                        <p className="text-sm font-mono font-semibold text-slate-900">
                          {entry.clock_in_time ? format(new Date(entry.clock_in_time), 'HH:mm', { locale: sv }) : '-'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">Utstämplad:</p>
                        <p className="text-sm font-mono font-semibold text-slate-900">
                          {entry.clock_out_time ? format(new Date(entry.clock_out_time), 'HH:mm', { locale: sv }) : '-'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">Totalt:</p>
                        <p className="text-sm font-mono font-semibold text-slate-900">
                          {entry.total_hours?.toFixed(2) || '0'}h
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Journal Entries */}
          <TabsContent value="journal" className="space-y-3">
            {pendingJournal.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                  <p className="text-slate-500">Inga väntande körrapporter</p>
                </CardContent>
              </Card>
            ) : (
              pendingJournal.map(journal => (
                <Card key={journal.id} className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{journal.driver_name || journal.driver_email}</span>
                      <Badge className="bg-purple-100 text-purple-700 border-0">Väntar granskning</Badge>
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                      {journal.start_time && format(new Date(journal.start_time), 'PPP HH:mm', { locale: sv })}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">Fordon:</p>
                        <p className="text-sm font-semibold text-slate-900">{journal.registration_number || '-'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">Sträcka:</p>
                        <p className="text-sm font-semibold text-slate-900">{journal.distance_km} km</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">Typ:</p>
                        <p className="text-sm font-semibold text-slate-900">{journal.trip_type || 'Väntar'}</p>
                      </div>
                    </div>

                    {journal.purpose && (
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm font-semibold text-slate-700 mb-2">Syfte:</p>
                        <p className="text-sm text-slate-600">{journal.purpose}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Kommentar:</label>
                      <Textarea
                        value={reviewComment[journal.id] || ''}
                        onChange={(e) => setReviewComment(prev => ({ ...prev, [journal.id]: e.target.value }))}
                        placeholder="Valfri kommentar..."
                        className="min-h-[60px]"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => approveJournal.mutate({ 
                          id: journal.id, 
                          comment: reviewComment[journal.id] 
                        })}
                        disabled={approveJournal.isPending}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Godkänn
                      </Button>
                      <Button
                        onClick={() => rejectJournal.mutate({ 
                          id: journal.id, 
                          comment: reviewComment[journal.id] 
                        })}
                        disabled={rejectJournal.isPending}
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Neka
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}