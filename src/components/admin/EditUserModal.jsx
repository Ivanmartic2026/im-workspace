import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function EditUserModal({ employee, users, onClose }) {
  const [fullName, setFullName] = useState('');
  const queryClient = useQueryClient();

  const user = users?.find(u => u.email === employee.user_email);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Update user's full name via service role (admin privilege)
      await base44.asServiceRole.entities.User.update(user.id, {
        full_name: fullName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    }
  });

  const handleSave = () => {
    if (fullName.trim()) {
      updateMutation.mutate();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Redigera användarnamn</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={employee.user_email} disabled className="bg-slate-50" />
          </div>

          <div className="space-y-2">
            <Label>Fullständigt namn</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="För- och efternamn"
              className="h-11"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending || !fullName.trim()}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              'Spara'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}