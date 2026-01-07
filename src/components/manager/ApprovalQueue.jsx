import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, Calendar, Edit } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import { useState } from 'react';

export default function ApprovalQueue({ approvals, leaveRequests, employees }) {
  const [reviewComment, setReviewComment] = useState({});
  const queryClient = useQueryClient();

  const updateApprovalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ApprovalRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    }
  });

  const updateLeaveMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeaveRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
    }
  });

  const updateTimeEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    }
  });

  const handleApproveTimeAdjustment = async (approval) => {
    await updateApprovalMutation.mutateAsync({
      id: approval.id,
      data: {
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        review_comment: reviewComment[approval.id] || ''
      }
    });

    // Apply the changes to the TimeEntry
    if (approval.related_entity_id && approval.requested_data) {
      await updateTimeEntryMutation.mutateAsync({
        id: approval.related_entity_id,
        data: {
          ...approval.requested_data,
          status: 'approved',
          edit_reason: approval.reason,
          edited_at: new Date().toISOString()
        }
      });
    }
  };

  const handleRejectApproval = (approval) => {
    updateApprovalMutation.mutate({
      id: approval.id,
      data: {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        review_comment: reviewComment[approval.id] || ''
      }
    });
  };

  const handleApproveLeave = (leave) => {
    updateLeaveMutation.mutate({
      id: leave.id,
      data: {
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        review_comment: reviewComment[leave.id] || ''
      }
    });
  };

  const handleRejectLeave = (leave) => {
    updateLeaveMutation.mutate({
      id: leave.id,
      data: {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        review_comment: reviewComment[leave.id] || ''
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Time Adjustments */}
      {approvals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Tidsjusteringar</h3>
          {approvals.map((approval, index) => (
            <motion.div
              key={approval.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Edit className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{approval.requester_name}</p>
                      <p className="text-sm text-slate-600 mt-1">{approval.description}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {format(new Date(approval.created_date), 'd MMM yyyy HH:mm', { locale: sv })}
                      </p>
                    </div>
                  </div>

                  {approval.reason && (
                    <div className="p-3 bg-slate-50 rounded-lg mb-3">
                      <p className="text-xs text-slate-500 mb-1">Anledning:</p>
                      <p className="text-sm text-slate-700">{approval.reason}</p>
                    </div>
                  )}

                  {approval.original_data && approval.requested_data && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-3 bg-rose-50 rounded-lg">
                        <p className="text-xs text-rose-700 mb-2 font-medium">Nuvarande:</p>
                        <p className="text-sm text-rose-900">
                          In: {format(new Date(approval.original_data.clock_in_time), 'HH:mm')}
                        </p>
                        {approval.original_data.clock_out_time && (
                          <p className="text-sm text-rose-900">
                            Ut: {format(new Date(approval.original_data.clock_out_time), 'HH:mm')}
                          </p>
                        )}
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg">
                        <p className="text-xs text-emerald-700 mb-2 font-medium">Förslag:</p>
                        <p className="text-sm text-emerald-900">
                          In: {format(new Date(approval.requested_data.clock_in_time), 'HH:mm')}
                        </p>
                        {approval.requested_data.clock_out_time && (
                          <p className="text-sm text-emerald-900">
                            Ut: {format(new Date(approval.requested_data.clock_out_time), 'HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <Textarea
                    placeholder="Kommentar (valfritt)"
                    value={reviewComment[approval.id] || ''}
                    onChange={(e) => setReviewComment(prev => ({ ...prev, [approval.id]: e.target.value }))}
                    className="mb-3 h-20 resize-none"
                  />

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleRejectApproval(approval)}
                      variant="outline"
                      className="flex-1"
                      disabled={updateApprovalMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Neka
                    </Button>
                    <Button
                      onClick={() => handleApproveTimeAdjustment(approval)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={updateApprovalMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Godkänn
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Leave Requests */}
      {leaveRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Ledighetsansökningar</h3>
          {leaveRequests.map((leave, index) => (
            <motion.div
              key={leave.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{leave.employee_email}</p>
                      <p className="text-sm text-slate-600 mt-1">{leave.type}</p>
                      <p className="text-sm text-slate-600">
                        {format(new Date(leave.start_date), 'd MMM', { locale: sv })} - {format(new Date(leave.end_date), 'd MMM yyyy', { locale: sv })}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{leave.days} dag{leave.days !== 1 ? 'ar' : ''}</p>
                    </div>
                  </div>

                  {leave.reason && (
                    <div className="p-3 bg-slate-50 rounded-lg mb-3">
                      <p className="text-xs text-slate-500 mb-1">Motivering:</p>
                      <p className="text-sm text-slate-700">{leave.reason}</p>
                    </div>
                  )}

                  <Textarea
                    placeholder="Kommentar (valfritt)"
                    value={reviewComment[leave.id] || ''}
                    onChange={(e) => setReviewComment(prev => ({ ...prev, [leave.id]: e.target.value }))}
                    className="mb-3 h-20 resize-none"
                  />

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleRejectLeave(leave)}
                      variant="outline"
                      className="flex-1"
                      disabled={updateLeaveMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Neka
                    </Button>
                    <Button
                      onClick={() => handleApproveLeave(leave)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={updateLeaveMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Godkänn
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {approvals.length === 0 && leaveRequests.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm text-slate-500">Inga väntande godkännanden</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}