import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Save, Loader2, Mail, Phone, MapPin, Building2, Briefcase, LogOut, Settings, Trash2, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PushNotificationSetup from '@/components/notifications/PushNotificationSetup';
import SettingsCard from '@/components/profile/SettingsCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const departments = ["Ledning", "HR", "Sälj", "Marknad", "IT", "Ekonomi", "Produktion", "Kundtjänst", "Övrigt"];

export default function Profile() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['myEmployee', user?.email],
    queryFn: async () => {
      const employees = await base44.entities.Employee.filter({ user_email: user?.email });
      return employees[0] || null;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (employee || user) {
      setFormData({
        ...employee,
        display_name: employee?.display_name || user?.full_name || ''
      });
    }
  }, [employee, user]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Update or create employee record with display_name
      if (employee?.id) {
        await base44.entities.Employee.update(employee.id, data);
      } else {
        await base44.entities.Employee.create({ ...data, user_email: user.email });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['myEmployee'] });
      setIsEditing(false);
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, profile_image: file_url }));
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:bg-[#111]">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {/* Avatar */}
          <div className="relative inline-block">
            <Avatar className="h-28 w-28 ring-4 ring-white dark:ring-white/[0.06] shadow-lg">
              <AvatarImage src={formData.profile_image || employee?.profile_image} />
              <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 dark:from-white/[0.08] dark:to-white/[0.04] text-slate-600 dark:text-neutral-200 text-2xl font-medium">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <label className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center cursor-pointer shadow-lg hover:bg-slate-800 transition-colors">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                {uploading ? (
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 text-white" />
                )}
              </label>
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-neutral-100 mt-4">{employee?.display_name || user.full_name}</h1>
          <p className="text-slate-500 dark:text-neutral-500">{formData.job_title || employee?.job_title || 'Ingen titel'}</p>
          {(formData.department || employee?.department) && (
            <Badge className="mt-2 bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-neutral-300 border-0">
              {formData.department || employee?.department}
            </Badge>
          )}
        </motion.div>

        {/* Actions */}
        <div className="flex justify-center gap-3 mb-8">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-full px-6">
                Avbryt
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={updateMutation.isPending}
                className="rounded-full px-6"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Spara
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="rounded-full px-6">
              Redigera profil
            </Button>
          )}
        </div>

        {/* Profile Form */}
        {isEditing ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Förnamn</Label>
                    <Input
                      value={(formData.display_name ?? user.full_name)?.split(' ')[0] || ''}
                      onChange={(e) => {
                        const firstName = e.target.value;
                        const lastName = (formData.display_name ?? user.full_name)?.split(' ').slice(1).join(' ') || '';
                        setFormData(prev => ({ ...prev, display_name: `${firstName} ${lastName}`.trim() }));
                      }}
                      placeholder="Förnamn"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Efternamn</Label>
                    <Input
                      value={(formData.display_name ?? user.full_name)?.split(' ').slice(1).join(' ') || ''}
                      onChange={(e) => {
                        const firstName = (formData.display_name ?? user.full_name)?.split(' ')[0] || '';
                        const lastName = e.target.value;
                        setFormData(prev => ({ ...prev, display_name: `${firstName} ${lastName}`.trim() }));
                      }}
                      placeholder="Efternamn"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="070-123 45 67"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plats</Label>
                    <Input
                      value={formData.location || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Stockholm"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Titel</Label>
                    <Input
                      value={formData.job_title || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                      placeholder="Din titel"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Avdelning</Label>
                    <Select
                      value={formData.department || ''}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Välj avdelning" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Om mig</Label>
                  <Textarea
                    value={formData.bio || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Berätta lite om dig själv..."
                    className="min-h-[100px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Contact Info */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <a
                  href={`mailto:${user.email}`}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-neutral-500">Email</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-neutral-100 truncate">{user.email}</p>
                  </div>
                </a>

                {(employee?.phone || formData.phone) && (
                  <a
                    href={`tel:${employee?.phone || formData.phone}`}
                    className="flex items-center gap-4 p-4 border-t dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-neutral-500">Telefon</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">{employee?.phone || formData.phone}</p>
                    </div>
                  </a>
                )}

                {(employee?.location || formData.location) && (
                  <div className="flex items-center gap-4 p-4 border-t dark:border-white/[0.06]">
                    <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-neutral-500">Plats</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">{employee?.location || formData.location}</p>
                    </div>
                  </div>
                )}

                {(employee?.department || formData.department) && (
                  <div className="flex items-center gap-4 p-4 border-t dark:border-white/[0.06]">
                    <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-neutral-500">Avdelning</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">{employee?.department || formData.department}</p>
                    </div>
                  </div>
                )}

                {employee?.start_date && (
                  <div className="flex items-center gap-4 p-4 border-t dark:border-white/[0.06]">
                    <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-neutral-500">Anställd sedan</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">
                        {format(new Date(employee.start_date), "d MMMM yyyy", { locale: sv })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bio */}
            {(employee?.bio || formData.bio) && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs text-slate-500 dark:text-neutral-500 mb-2">Om mig</p>
                  <p className="text-sm text-slate-700 dark:text-neutral-300 leading-relaxed">{employee?.bio || formData.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {employee?.skills?.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs text-slate-500 dark:text-neutral-500 mb-3">Kompetenser</p>
                  <div className="flex flex-wrap gap-2">
                    {employee.skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-neutral-300">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Onboarding Section */}
            {employee?.onboarding_status && employee.onboarding_status !== 'not_started' && (
              <Link to={createPageUrl('MyOnboarding')}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${employee.onboarding_status === 'completed' ? 'bg-green-100 dark:bg-green-500/10' : 'bg-blue-100 dark:bg-blue-500/10'}`}>
                        {employee.onboarding_status === 'completed'
                          ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                          : <Clock className="h-5 w-5 text-blue-600" />
                        }
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">Min onboarding</p>
                        <p className="text-xs text-slate-500 dark:text-neutral-500">
                          {employee.onboarding_status === 'completed' ? 'Slutförd' : 'Pågående'}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* Push Notifications */}
            <PushNotificationSetup user={user} />

            {/* App Settings */}
            <SettingsCard user={user} />

            {/* Logout and Delete Account */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-4 p-4 w-full text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors text-rose-600"
                >
                  <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Logga ut</span>
                </button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button 
                      className="flex items-center gap-4 p-4 w-full text-left hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-rose-600 border-t dark:border-white/[0.06]"
                    >
                      <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                        <Trash2 className="h-4 w-4" />
                      </div>
                      <span className="font-medium">Radera konto</span>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Är du säker?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Detta kommer permanent radera ditt konto och all associerad data. 
                        Denna åtgärd kan inte ångras.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          window.location.href = `mailto:info@imvision.se?subject=Account Deletion Request&body=I would like to request the deletion of my account.%0D%0A%0D%0AUser Email: ${encodeURIComponent(user.email)}`;
                        }}
                        className="bg-rose-600 hover:bg-rose-700"
                      >
                        Radera permanent
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}