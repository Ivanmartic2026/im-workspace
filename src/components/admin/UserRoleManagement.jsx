import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, UserPlus, Mail, Loader2, CheckCircle2, User, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function UserRoleManagement() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [editingUser, setEditingUser] = useState(null);
  const [newName, setNewName] = useState('');
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      await base44.users.inviteUser(email, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setInviteEmail('');
      toast.success('Inbjudan skickad!');
    },
    onError: (error) => {
      toast.error('Misslyckades: ' + error.message);
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      await base44.entities.User.update(userId, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Användarroll uppdaterad!');
    },
    onError: (error) => {
      toast.error('Misslyckades: ' + error.message);
    }
  });

  const updateNameMutation = useMutation({
    mutationFn: async ({ userId, full_name }) => {
      const response = await base44.functions.invoke('updateUserName', { userId, full_name });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      setNewName('');
      toast.success('Användarnamn uppdaterat!');
    },
    onError: (error) => {
      toast.error('Misslyckades: ' + error.message);
    }
  });

  const handleInvite = () => {
    if (!inviteEmail) {
      toast.error('Ange en email-adress');
      return;
    }
    inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const toggleRole = (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    updateUserMutation.mutate({ userId: user.id, role: newRole });
  };

  const handleEditName = (user) => {
    setEditingUser(user);
    setNewName(user.full_name || '');
  };

  const handleSaveName = () => {
    if (!newName.trim()) {
      toast.error('Namn kan inte vara tomt');
      return;
    }
    updateNameMutation.mutate({ 
      userId: editingUser.id, 
      full_name: newName.trim() 
    });
  };

  return (
    <div className="space-y-6">
      {/* Invite Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-slate-600" />
            Bjud in användare
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-4 py-2 rounded-md border border-slate-200 bg-white text-sm"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <Button 
              onClick={handleInvite}
              disabled={inviteUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {inviteUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Bjud in
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Användare med <strong>admin</strong>-roll har full åtkomst till systemet.
          </p>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-600" />
            Användare ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
            </div>
          ) : (
            <div className="space-y-2">
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                      {user.role === 'admin' ? (
                        <Shield className="h-5 w-5 text-blue-600" />
                      ) : (
                        <User className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{user.full_name || user.email}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      user.role === 'admin' 
                        ? 'bg-blue-100 text-blue-800 border-0' 
                        : 'bg-slate-100 text-slate-800 border-0'
                    }>
                      {user.role}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditName(user)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleRole(user)}
                      disabled={updateUserMutation.isPending}
                    >
                      {user.role === 'admin' ? 'Ta bort admin' : 'Gör till admin'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Name Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redigera användarnamn</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Email
              </label>
              <Input
                value={editingUser?.email || ''}
                disabled
                className="bg-slate-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Namn
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ange fullständigt namn"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingUser(null)}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSaveName}
              disabled={updateNameMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateNameMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Spara'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}