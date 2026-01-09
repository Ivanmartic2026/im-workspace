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
import { Camera, Save, Loader2, Mail, Phone, MapPin, Building2, Briefcase, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import PushNotificationSetup from '@/components/notifications/PushNotificationSetup';

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
    if (employee) {
      setFormData(employee);
    }
  }, [employee]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (employee) {
        return base44.entities.Employee.update(employee.id, data);
      } else {
        return base44.entities.Employee.create({ ...data, user_email: user.email });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEmployee'] });
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {/* Avatar */}
          <div className="relative inline-block">
            <Avatar className="h-28 w-28 ring-4 ring-white shadow-lg">
              <AvatarImage src={formData.profile_image || employee?.profile_image} />
              <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 text-2xl font-medium">
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

          <h1 className="text-2xl font-bold text-slate-900 mt-4">{user.full_name}</h1>
          <p className="text-slate-500">{formData.job_title || employee?.job_title || 'Ingen titel'}</p>
          {(formData.department || employee?.department) && (
            <Badge className="mt-2 bg-slate-100 text-slate-700 border-0">
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
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{user.email}</p>
                  </div>
                </a>

                {(employee?.phone || formData.phone) && (
                  <a 
                    href={`tel:${employee?.phone || formData.phone}`}
                    className="flex items-center gap-4 p-4 border-t hover:bg-slate-50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Telefon</p>
                      <p className="text-sm font-medium text-slate-900">{employee?.phone || formData.phone}</p>
                    </div>
                  </a>
                )}

                {(employee?.location || formData.location) && (
                  <div className="flex items-center gap-4 p-4 border-t">
                    <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Plats</p>
                      <p className="text-sm font-medium text-slate-900">{employee?.location || formData.location}</p>
                    </div>
                  </div>
                )}

                {(employee?.department || formData.department) && (
                  <div className="flex items-center gap-4 p-4 border-t">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Avdelning</p>
                      <p className="text-sm font-medium text-slate-900">{employee?.department || formData.department}</p>
                    </div>
                  </div>
                )}

                {employee?.start_date && (
                  <div className="flex items-center gap-4 p-4 border-t">
                    <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Anställd sedan</p>
                      <p className="text-sm font-medium text-slate-900">
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
                  <p className="text-xs text-slate-500 mb-2">Om mig</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{employee?.bio || formData.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {employee?.skills?.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs text-slate-500 mb-3">Kompetenser</p>
                  <div className="flex flex-wrap gap-2">
                    {employee.skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="bg-slate-100 text-slate-700">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Push Notifications */}
            <PushNotificationSetup user={user} />

            {/* Logout */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-4 p-4 w-full text-left hover:bg-slate-50 transition-colors text-rose-600"
                >
                  <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Logga ut</span>
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}