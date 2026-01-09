import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Send, Users, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const departments = ["Ledning", "HR", "Sälj", "Marknad", "IT", "Ekonomi", "Produktion", "Kundtjänst", "Övrigt"];

export default function BulkNotifications() {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'normal',
    target_type: 'all',
    target_departments: [],
    target_emails: []
  });
  const [success, setSuccess] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      let targetEmails = [];

      if (formData.target_type === 'all') {
        targetEmails = employees.map(e => e.user_email);
      } else if (formData.target_type === 'departments') {
        targetEmails = employees
          .filter(e => formData.target_departments.includes(e.department))
          .map(e => e.user_email);
      } else if (formData.target_type === 'custom') {
        targetEmails = formData.target_emails;
      }

      // Create notifications for all targets
      const notifications = targetEmails.map(email => ({
        recipient_email: email,
        type: 'system',
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        is_read: false,
        sent_via: ['app', 'push']
      }));

      // Bulk create
      for (const notification of notifications) {
        await base44.entities.Notification.create(notification);
      }

      return { count: notifications.length };
    },
    onSuccess: (data) => {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          title: '',
          message: '',
          priority: 'normal',
          target_type: 'all',
          target_departments: [],
          target_emails: []
        });
      }, 3000);
    },
  });

  const handleDepartmentToggle = (dept) => {
    setFormData(prev => ({
      ...prev,
      target_departments: prev.target_departments.includes(dept)
        ? prev.target_departments.filter(d => d !== dept)
        : [...prev.target_departments, dept]
    }));
  };

  const getRecipientCount = () => {
    if (formData.target_type === 'all') return employees.length;
    if (formData.target_type === 'departments') {
      return employees.filter(e => formData.target_departments.includes(e.department)).length;
    }
    return formData.target_emails.length;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMutation.mutate();
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Skicka massnotiser
        </CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center"
          >
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Notiser skickade!</h3>
            <p className="text-slate-500">Meddelandet har skickats till alla valda mottagare</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="T.ex. Viktigt meddelande"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Meddelande *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Skriv ditt meddelande här..."
                className="min-h-[120px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioritet</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Låg</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Hög</SelectItem>
                  <SelectItem value="urgent">Brådskande</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Mottagare</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.target_type === 'all'}
                    onChange={() => setFormData(prev => ({ ...prev, target_type: 'all' }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Alla medarbetare ({employees.length})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.target_type === 'departments'}
                    onChange={() => setFormData(prev => ({ ...prev, target_type: 'departments' }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Specifika avdelningar</span>
                </label>

                {formData.target_type === 'departments' && (
                  <div className="ml-6 space-y-2 pt-2">
                    {departments.map(dept => (
                      <label key={dept} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={formData.target_departments.includes(dept)}
                          onCheckedChange={() => handleDepartmentToggle(dept)}
                        />
                        <span className="text-sm text-slate-700">{dept}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {getRecipientCount()} mottagare valda
                </span>
              </div>
              <Button
                type="submit"
                disabled={sendMutation.isPending || !formData.title || !formData.message}
              >
                {sendMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Skickar...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Skicka notis
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}