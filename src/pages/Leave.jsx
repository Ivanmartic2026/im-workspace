import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, CalendarPlus } from "lucide-react";
import LeaveBalanceCard from "@/components/leave/LeaveBalanceCard";
import LeaveRequestCard from "@/components/leave/LeaveRequestCard";
import CreateLeaveModal from "@/components/leave/CreateLeaveModal";
import ClockInOutCard from "@/components/time/ClockInOutCard";
import TimeEntryList from "@/components/time/TimeEntryList";
import TimeStats from "@/components/time/TimeStats";
import TimeHistory from "@/components/time/TimeHistory";
import { motion, AnimatePresence } from "framer-motion";

export default function Leave() {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('time');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u) {
        const employees = await base44.entities.Employee.filter({ user_email: u.email });
        if (employees.length > 0) setEmployee(employees[0]);
      }
    });
  }, []);

  const { data: myRequests = [], isLoading: loadingMine } = useQuery({
    queryKey: ['myLeaveRequests', user?.email],
    queryFn: () => base44.entities.LeaveRequest.filter({ employee_email: user?.email }, '-created_date'),
    enabled: !!user,
  });

  const { data: teamRequests = [], isLoading: loadingTeam } = useQuery({
    queryKey: ['teamLeaveRequests'],
    queryFn: () => base44.entities.LeaveRequest.filter({ status: 'pending' }, '-created_date'),
    enabled: user?.role === 'admin',
  });

  const { data: timeEntries = [], refetch: refetchTimeEntries } = useQuery({
    queryKey: ['timeEntries', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const entries = await base44.entities.TimeEntry.filter({ employee_email: user.email }, '-created_date', 30);
      return entries;
    },
    enabled: !!user?.email
  });

  const activeTimeEntry = timeEntries.find(entry => entry.status === 'active');

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeaveRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLeaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['teamLeaveRequests'] });
    },
  });

  const handleApprove = (requestId) => {
    updateRequestMutation.mutate({
      id: requestId,
      data: {
        status: 'approved',
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString()
      }
    });
  };

  const handleReject = (requestId) => {
    updateRequestMutation.mutate({
      id: requestId,
      data: {
        status: 'rejected',
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString()
      }
    });
  };

  const pendingRequests = myRequests.filter(r => r.status === 'pending');
  const historyRequests = myRequests.filter(r => r.status !== 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Tid & Frånvaro</h1>
            <p className="text-sm text-slate-500 mt-1">Stämpla och hantera ledighet</p>
          </div>

          {/* Balance Cards */}
          <LeaveBalanceCard
            vacationBalance={employee?.vacation_balance || 25}
            flexBalance={employee?.flex_balance || 0}
          />
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="w-full h-auto p-1 bg-white shadow-sm rounded-2xl grid grid-cols-3">
            <TabsTrigger value="time" className="rounded-xl text-xs data-[state=active]:shadow-sm">
              Tidrapport
            </TabsTrigger>
            <TabsTrigger value="mine" className="rounded-xl text-xs data-[state=active]:shadow-sm">
              Ledighet
            </TabsTrigger>
            {user?.role === 'admin' && (
              <TabsTrigger value="team" className="rounded-xl text-xs data-[state=active]:shadow-sm">
                Team ({teamRequests.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Time Tab */}
          <TabsContent value="time" className="mt-6 space-y-6">
            <ClockInOutCard 
              userEmail={user?.email}
              activeEntry={activeTimeEntry}
              onUpdate={() => {
                refetchTimeEntries();
                queryClient.invalidateQueries({ queryKey: ['employees'] });
              }}
            />
            
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Översikt</h3>
              <TimeStats entries={timeEntries} />
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Historik</h3>
              <TimeHistory entries={timeEntries} />
            </div>
          </TabsContent>

          <TabsContent value="mine" className="mt-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Mina ansökningar</h3>
              <Button 
                onClick={() => setShowCreateModal(true)}
                size="sm"
                className="rounded-full shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Ansök
              </Button>
            </div>

            {/* Pending */}
            {pendingRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-3">Väntar på godkännande</h3>
                <div className="space-y-3">
                  {pendingRequests.map((request, idx) => (
                    <LeaveRequestCard
                      key={request.id}
                      request={request}
                      index={idx}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Historik</h3>
              <AnimatePresence mode="popLayout">
                {loadingMine ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
                    ))}
                  </div>
                ) : historyRequests.length === 0 && pendingRequests.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <CalendarPlus className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Inga ansökningar ännu</p>
                    <Button 
                      variant="link" 
                      onClick={() => setShowCreateModal(true)}
                      className="mt-2"
                    >
                      Skapa din första ansökan
                    </Button>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {historyRequests.map((request, idx) => (
                      <LeaveRequestCard
                        key={request.id}
                        request={request}
                        index={idx}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          {user?.role === 'admin' && (
            <TabsContent value="team" className="mt-6">
              <h3 className="font-semibold text-slate-900 mb-4">Väntande ansökningar</h3>
              <AnimatePresence mode="popLayout">
                {loadingTeam ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
                    ))}
                  </div>
                ) : teamRequests.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <p className="text-slate-500">Inga väntande ansökningar</p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {teamRequests.map((request, idx) => (
                      <LeaveRequestCard
                        key={request.id}
                        request={request}
                        isManager={true}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        showEmployee={true}
                        index={idx}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <CreateLeaveModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['myLeaveRequests'] })}
        userEmail={user?.email}
      />
    </div>
  );
}