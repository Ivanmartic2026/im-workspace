import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, XCircle, Clock, User, Calendar, Lock, Unlock
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const submissionStatusConfig = {
  inskickad: { label: 'Väntar på attest', color: 'bg-blue-100 text-blue-700', icon: Clock },
  godkänd: { label: 'Godkänd', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  nekad: { label: 'Nekad', color: 'bg-rose-100 text-rose-700', icon: XCircle }
};

export default function AdminWeeklyReports({ currentUser }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState(null); // 'approve' or 'reject'
  const queryClient = useQueryClient();

  // Fetch all pending reports
  const { data: pendingReports = [] } = useQuery({
    queryKey: ['weeklyReports', 'pending'],
    queryFn: async () => {
      const reports = await base44.entities.WeeklyReport.filter({
        submission_status: 'inskickad'
      }, '-submitted_at', 50);
      return reports;
    }
  });

  // Fetch employees for name lookup
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ reportId, action, comment }) => {
      const updateData = {
        submission_status: action === 'approve' ? 'godkänd' : 'nekad',
        is_locked: action === 'approve',
        reviewed_by: currentUser.email,
        reviewed_at: new Date().toISOString(),
        review_comment: comment
      };
      
      return await base44.entities.WeeklyReport.update(reportId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['weeklyReports']);
      setShowReviewDialog(false);
      setSelectedReport(null);
      setReviewComment('');
    }
  });

  const openReviewDialog = (report, action) => {
    setSelectedReport(report);
    setReviewAction(action);
    setReviewComment('');
    setShowReviewDialog(true);
  };

  const handleReview = () => {
    if (!selectedReport) return;
    
    reviewMutation.mutate({
      reportId: selectedReport.id,
      action: reviewAction,
      comment: reviewComment
    });
  };

  const getEmployeeName = (email) => {
    const employee = employees.find(e => e.user_email === email);
    return employee?.user_email || email;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Veckorapporter att attestera</h3>
          <p className="text-sm text-slate-500">{pendingReports.length} rapporter väntar</p>
        </div>
      </div>

      {pendingReports.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Inga rapporter att attestera</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {pendingReports.map((report, idx) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {getEmployeeName(report.employee_email)}
                          </h4>
                          <p className="text-sm text-slate-500">
                            Vecka {report.week_number}, {report.year}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">
                        Väntar
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Mål</p>
                        <p className="text-sm font-semibold text-slate-900">{report.target_hours}h</p>
                      </div>
                      <div className="text-center p-2 bg-emerald-50 rounded-lg">
                        <p className="text-xs text-emerald-600">Rapporterat</p>
                        <p className="text-sm font-semibold text-emerald-700">
                          {report.reported_hours?.toFixed(1)}h
                        </p>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600">Status</p>
                        <p className="text-sm font-semibold text-blue-700 capitalize">
                          {report.status?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    {report.submitted_at && (
                      <p className="text-xs text-slate-500 mb-4">
                        Inskickad {format(parseISO(report.submitted_at), "d MMM 'kl' HH:mm", { locale: sv })}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => openReviewDialog(report, 'reject')}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Neka
                      </Button>
                      <Button
                        onClick={() => openReviewDialog(report, 'approve')}
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Godkänn
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Review Dialog */}
      <AlertDialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewAction === 'approve' ? 'Godkänn veckorapport' : 'Neka veckorapport'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedReport && (
                <>
                  {getEmployeeName(selectedReport.employee_email)} - Vecka {selectedReport.week_number}, {selectedReport.year}
                  <br />
                  Rapporterad tid: {selectedReport.reported_hours?.toFixed(1)}h / {selectedReport.target_hours}h
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Kommentar {reviewAction === 'reject' ? '(obligatorisk)' : '(valfritt)'}
            </label>
            <Textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Skriv en kommentar..."
              className="min-h-[100px]"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReview}
              disabled={reviewAction === 'reject' && !reviewComment.trim()}
              className={reviewAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
            >
              {reviewAction === 'approve' ? 'Godkänn' : 'Neka'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}