import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function InviteModal({ open, onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [success, setSuccess] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      await base44.users.inviteUser(email, role);
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        setEmail('');
        setRole('user');
        setSuccess(false);
        onClose();
      }, 2000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    inviteMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bjud in användare</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-900">Inbjudan skickad!</p>
            <p className="text-sm text-slate-500 mt-1">Användaren har fått en e-postinbjudan</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="namn@foretag.se"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Roll</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Användare</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending || !email}
                className="flex-1"
              >
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Skickar...
                  </>
                ) : (
                  'Skicka inbjudan'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}