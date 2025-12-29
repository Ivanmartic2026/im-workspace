import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

export default function AdminTimeReview() {
  const [reviewComment, setReviewComment] = useState({});
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['timeEntriesReview'],
    queryFn: async () => {
      const all = await base44.entities.TimeEntry.list('-created_date', 100);
      return all.filter(e => e.status === 'pending_review' || e.anomaly_flag);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, comment }) => 
      base44.entities.TimeEntry.update(id, {
        status,
        review_comment: comment
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntriesReview'] });
      setReviewComment({});
    },
  });

  const handleApprove = (entry) => {
    reviewMutation.mutate({ 
      id: entry.id, 
      status: 'approved',
      comment: reviewComment[entry.id] || 'Godkänd'
    });
  };

  const handleReject = (entry) => {
    const comment = reviewComment[entry.id];
    if (!comment || comment.trim().length < 5) {
      alert('Vänligen ange en förklaring för avslag (minst 5 tecken)');
      return;
    }
    reviewMutation.mutate({ 
      id: entry.id, 
      status: 'rejected',
      comment 
    });
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Allt klart!</h3>
          <p className="text-slate-500">Inga tidrapporter behöver granskas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                {entries.length} {entries.length === 1 ? 'tidrapport kräver' : 'tidrapporter kräver'} granskning
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Korrigeringar och avvikelser som behöver godkännas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{entry.employee_email}</h3>
                    <p className="text-xs text-slate-500">
                      {format(new Date(entry.clock_in_time), 'PPp', { locale: sv })}
                    </p>
                  </div>
                  {entry.anomaly_flag && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Avvikelse
                    </Badge>
                  )}
                </div>

                {entry.edit_reason && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-3">
                    <p className="text-xs font-medium text-blue-900 mb-1">Förklaring från medarbetare:</p>
                    <p className="text-sm text-blue-800">{entry.edit_reason}</p>
                  </div>
                )}

                {entry.anomaly_reason && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mb-3">
                    <p className="text-xs font-medium text-amber-900 mb-1">Systemvarning:</p>
                    <p className="text-sm text-amber-800">{entry.anomaly_reason}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  {entry.original_clock_in_time && (
                    <div>
                      <p className="text-slate-500 text-xs">Ursprunglig tid:</p>
                      <p className="font-medium text-slate-900">
                        {format(new Date(entry.original_clock_in_time), 'HH:mm')} - 
                        {entry.original_clock_out_time && ` ${format(new Date(entry.original_clock_out_time), 'HH:mm')}`}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500 text-xs">Ny tid:</p>
                    <p className="font-medium text-slate-900">
                      {format(new Date(entry.clock_in_time), 'HH:mm')} - 
                      {entry.clock_out_time && ` ${format(new Date(entry.clock_out_time), 'HH:mm')}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Totalt:</p>
                    <p className="font-medium text-slate-900">{entry.total_hours?.toFixed(1)} h</p>
                  </div>
                  {entry.edited_by && (
                    <div>
                      <p className="text-slate-500 text-xs">Ändrad av:</p>
                      <p className="font-medium text-slate-900 text-xs truncate">{entry.edited_by}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="Lägg till kommentar (valfritt vid godkännande, obligatorisk vid avslag)..."
                    value={reviewComment[entry.id] || ''}
                    onChange={(e) => setReviewComment(prev => ({ ...prev, [entry.id]: e.target.value }))}
                    className="min-h-[60px] resize-none text-sm"
                  />
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReject(entry)}
                      disabled={reviewMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Avslå
                    </Button>
                    <Button
                      onClick={() => handleApprove(entry)}
                      disabled={reviewMutation.isPending}
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Godkänn
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}