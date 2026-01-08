import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Users, Loader2, CheckSquare, Square, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AssignManualModal({ open, onClose, manual, onSuccess }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  useEffect(() => {
    if (manual && open) {
      setSelectedEmployees(manual.assigned_to || []);
    }
  }, [manual, open]);

  const enrichedEmployees = employees.map(emp => {
    const user = users.find(u => u.email === emp.user_email);
    return {
      ...emp,
      full_name: user?.full_name || emp.user_email,
      email: emp.user_email
    };
  });

  const filteredEmployees = enrichedEmployees.filter(emp => {
    const matchesSearch = 
      emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const toggleEmployee = (email) => {
    setSelectedEmployees(prev => 
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const selectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.email));
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      await base44.entities.Manual.update(manual.id, {
        assigned_to: selectedEmployees,
        is_public: selectedEmployees.length === 0
      });

      // Send notifications to newly assigned employees
      const previousAssignments = manual.assigned_to || [];
      const newAssignments = selectedEmployees.filter(email => !previousAssignments.includes(email));

      if (newAssignments.length > 0) {
        const notificationPromises = newAssignments.map(email => {
          const employee = enrichedEmployees.find(e => e.email === email);
          return base44.entities.Notification.create({
            recipient_email: email,
            type: 'system',
            title: 'Ny manual tilldelad',
            message: `Du har tilldelats manualen "${manual.title}". ${manual.requires_acknowledgment ? 'Bekräftelse krävs.' : ''}`,
            priority: manual.priority === 'kritisk' || manual.priority === 'hög' ? 'high' : 'normal',
            related_entity_id: manual.id,
            related_entity_type: 'Manual',
            sent_via: ['app']
          });
        });

        await Promise.all(notificationPromises);
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error assigning manual:', error);
      alert('Kunde inte tilldela manual: ' + error.message);
    }

    setLoading(false);
  };

  if (!manual) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Fördela manual till personal</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">{manual.title}</p>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Stats */}
          <div className="flex items-center justify-between mb-4 p-3 bg-indigo-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-900">
                {selectedEmployees.length} av {enrichedEmployees.length} valda
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={selectAll}
              className="text-xs"
            >
              {selectedEmployees.length === filteredEmployees.length ? (
                <>
                  <Square className="h-3 w-3 mr-1" />
                  Avmarkera alla
                </>
              ) : (
                <>
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Markera alla
                </>
              )}
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Sök namn, e-post, avdelning..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Employee List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Inga medarbetare hittades</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredEmployees.map(employee => {
                  const isSelected = selectedEmployees.includes(employee.email);
                  
                  return (
                    <div
                      key={employee.email}
                      onClick={() => toggleEmployee(employee.email)}
                      className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          className="pointer-events-none"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{employee.full_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {employee.email}
                            </p>
                            {employee.department && (
                              <Badge variant="outline" className="text-xs">
                                {employee.department}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Spara tilldelning
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}