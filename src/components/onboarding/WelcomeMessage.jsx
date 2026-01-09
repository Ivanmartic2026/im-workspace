import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function WelcomeMessage({ employee }) {
  const [welcomeData, setWelcomeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWelcome = async () => {
      try {
        const response = await base44.functions.invoke('generateWelcomeMessage', {
          employee_id: employee.id
        });
        setWelcomeData(response.data);
      } catch (error) {
        console.error('Failed to generate welcome message:', error);
      } finally {
        setLoading(false);
      }
    };

    if (employee?.id) {
      fetchWelcome();
    }
  }, [employee?.id]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!welcomeData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Välkommen {welcomeData.employee_name}!
              </h3>
              <p className="text-sm text-indigo-600">{welcomeData.role} · {welcomeData.department}</p>
            </div>
          </div>
          <div className="prose prose-sm text-slate-700 whitespace-pre-line">
            {welcomeData.message}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}