import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Umbrella, Clock, HeartPulse } from "lucide-react";
import LeaveRequestForm from "@/components/time/LeaveRequestForm";
import FlexRegistration from "@/components/time/FlexRegistration";

export default function QuickTimeActions({ user, employee }) {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Button
          variant="outline"
          onClick={() => setActiveModal('ledighet')}
          className="h-20 flex flex-col items-center justify-center gap-2 bg-white hover:bg-blue-50 border-slate-200"
        >
          <Umbrella className="h-5 w-5 text-blue-600" />
          <span className="text-xs font-medium">Ledighet</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => setActiveModal('flex')}
          className="h-20 flex flex-col items-center justify-center gap-2 bg-white hover:bg-emerald-50 border-slate-200"
        >
          <Clock className="h-5 w-5 text-emerald-600" />
          <span className="text-xs font-medium">Flex</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => setActiveModal('sjuk')}
          className="h-20 flex flex-col items-center justify-center gap-2 bg-white hover:bg-rose-50 border-slate-200"
        >
          <HeartPulse className="h-5 w-5 text-rose-600" />
          <span className="text-xs font-medium">Sjuk</span>
        </Button>
      </div>

      {/* Ledighet Modal */}
      <Dialog open={activeModal === 'ledighet'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ansök om ledighet</DialogTitle>
          </DialogHeader>
          <LeaveRequestForm
            userEmail={user?.email}
            userName={user?.full_name}
            employee={employee}
            onClose={() => setActiveModal(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Flex Modal */}
      <Dialog open={activeModal === 'flex'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrera flex</DialogTitle>
          </DialogHeader>
          <FlexRegistration
            userEmail={user?.email}
            userName={user?.full_name}
            employee={employee}
            onClose={() => setActiveModal(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Sjuk Modal */}
      <Dialog open={activeModal === 'sjuk'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sjukanmälan</DialogTitle>
          </DialogHeader>
          <LeaveRequestForm
            userEmail={user?.email}
            userName={user?.full_name}
            employee={employee}
            defaultType="sjuk"
            onClose={() => setActiveModal(null)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}