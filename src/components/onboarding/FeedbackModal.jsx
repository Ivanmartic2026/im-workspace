import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function FeedbackModal({ open, onClose, employee }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [formData, setFormData] = useState({
    helpful_aspects: '',
    improvement_suggestions: '',
    comment: ''
  });
  const [success, setSuccess] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const feedback = {
        overall_rating: rating,
        helpful_aspects: formData.helpful_aspects,
        improvement_suggestions: formData.improvement_suggestions,
        comment: formData.comment,
        submitted_at: new Date().toISOString()
      };

      await base44.entities.Employee.update(employee.id, {
        onboarding_feedback: feedback,
        onboarding_status: 'completed',
        onboarding_completed_date: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Feedback på din onboarding</DialogTitle>
        </DialogHeader>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
          >
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Tack för din feedback!</h3>
            <p className="text-slate-500">Din onboarding är nu slutförd</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Hur skulle du betygsätta din onboarding-upplevelse?</Label>
              <div className="flex gap-2 justify-center py-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 ${
                        star <= (hoveredRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="helpful">Vad var mest hjälpsamt i onboardingen?</Label>
              <Textarea
                id="helpful"
                value={formData.helpful_aspects}
                onChange={(e) => setFormData(prev => ({ ...prev, helpful_aspects: e.target.value }))}
                placeholder="Berätta om vad som fungerade bra..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="improvements">Finns det något som kan förbättras?</Label>
              <Textarea
                id="improvements"
                value={formData.improvement_suggestions}
                onChange={(e) => setFormData(prev => ({ ...prev, improvement_suggestions: e.target.value }))}
                placeholder="Dina förbättringsförslag..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Övriga kommentarer (valfritt)</Label>
              <Textarea
                id="comment"
                value={formData.comment}
                onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Något annat du vill dela med dig av..."
                className="min-h-[60px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={submitMutation.isPending || rating === 0}
                className="flex-1"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Skickar...
                  </>
                ) : (
                  'Skicka feedback'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}