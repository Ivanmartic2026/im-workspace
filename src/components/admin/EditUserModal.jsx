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
      if (!user?.id) {
        throw new Error('Användare hittades inte');
      }
      
      if (!fullName.trim()) {
        throw new Error('Namn kan inte vara tomt');
      }
      
      // Update user's full name
      // Note: Built-in User entity fields can only be updated through auth.updateMe for own profile
      // For admin updating other users, we need to use a different approach
      try {
        // Try with service role first
        await base44.asServiceRole.entities.User.update(user.id, {
          full_name: fullName.trim()
        });
      } catch (error) {
        // If that fails, user entity built-in fields might be protected
        // We can only update through employee entity custom fields or create a workaround
        console.error('Could not update User entity:', error);
        throw new Error('Systemet tillåter inte att ändra användarnamn. Detta är en plattformsbegränsning för säkerhet.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
    onError: (error) => {
      console.error('Update error:', error);
      alert('Kunde inte spara: ' + error.message);
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
              autoFocus
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