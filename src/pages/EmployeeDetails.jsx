import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, FileText, Users, Calendar, Upload, 
  Download, Trash2, Plus, Phone, Mail, AlertCircle, 
  Key, Eye, EyeOff, Copy, Clipboard
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UploadFileModal from '@/components/employees/UploadFileModal';
import EmergencyContactModal from '@/components/employees/EmergencyContactModal';
import ImportantDateModal from '@/components/employees/ImportantDateModal';
import AssignTemplateModal from '@/components/onboarding/AssignTemplateModal';
import CredentialsModal from '@/components/onboarding/CredentialsModal';

export default function EmployeeDetails() {
  const [user, setUser] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [showFileModal, setShowFileModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showPassword, setShowPassword] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
    const params = new URLSearchParams(window.location.search);
    setEmployeeId(params.get('id'));
  }, []);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const employees = await base44.entities.Employee.filter({ id: employeeId });
      return employees[0] || null;
    },
    enabled: !!employeeId,
  });

  const { data: employeeUser } = useQuery({
    queryKey: ['employeeUser', employee?.user_email],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: employee.user_email });
      return users[0] || null;
    },
    enabled: !!employee?.user_email,
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileUrl) => {
      const updatedFiles = (employee.files || []).filter(f => f.url !== fileUrl);
      return base44.entities.Employee.update(employee.id, { files: updatedFiles });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (index) => {
      const updatedContacts = [...(employee.emergency_contacts || [])];
      updatedContacts.splice(index, 1);
      return base44.entities.Employee.update(employee.id, { emergency_contacts: updatedContacts });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
    },
  });

  const deleteDateMutation = useMutation({
    mutationFn: async (index) => {
      const updatedDates = [...(employee.important_dates || [])];
      updatedDates.splice(index, 1);
      return base44.entities.Employee.update(employee.id, { important_dates: updatedDates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
    },
  });

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getCategoryLabel = (category) => {
    const labels = {
      contract: 'Kontrakt',
      certificate: 'Intyg',
      id: 'Legitimation',
      other: 'Övrigt'
    };
    return labels[category] || category;
  };

  const getDateTypeLabel = (type) => {
    const labels = {
      birthday: 'Födelsedag',
      anniversary: 'Jubileum',
      other: 'Övrigt'
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-slate-500">Laddar...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-slate-500">Medarbetare hittades inte</div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link to={createPageUrl('Employees')} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Tillbaka
          </Link>

          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 ring-4 ring-white shadow-lg">
              <AvatarImage src={employee.profile_image} />
              <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 text-2xl">
                {getInitials(employeeUser?.full_name || employee.user_email)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">
                {employeeUser?.full_name || employee.user_email}
              </h1>
              <p className="text-slate-500 mt-1">{employee.job_title || 'Ingen titel'}</p>
              <div className="flex items-center gap-2 mt-2">
                {employee.department && (
                  <Badge variant="secondary">{employee.department}</Badge>
                )}
                {employee.employment_type && (
                  <Badge variant="outline">{employee.employment_type}</Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="files">Filer</TabsTrigger>
            <TabsTrigger value="contacts">Kontakter</TabsTrigger>
            <TabsTrigger value="dates">Datum</TabsTrigger>
            {isAdmin && <TabsTrigger value="onboarding">Onboarding</TabsTrigger>}
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Kontaktinformation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <a href={`mailto:${employee.user_email}`} className="text-sm text-blue-600 hover:underline">
                    {employee.user_email}
                  </a>
                </div>
                {employee.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <a href={`tel:${employee.phone}`} className="text-sm text-blue-600 hover:underline">
                      {employee.phone}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {employee.bio && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Om</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{employee.bio}</p>
                </CardContent>
              </Card>
            )}

            {employee.contract_url && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Anställningskontrakt</CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={employee.contract_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    Visa kontrakt
                  </a>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            {isAdmin && (
              <Button onClick={() => setShowFileModal(true)} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Ladda upp fil
              </Button>
            )}

            {employee.files && employee.files.length > 0 ? (
              <div className="grid gap-3">
                {employee.files.map((file, index) => (
                  <Card key={index} className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-8 w-8 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{file.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryLabel(file.category)}
                            </Badge>
                            {file.uploaded_date && (
                              <span className="text-xs text-slate-500">
                                {format(new Date(file.uploaded_date), 'd MMM yyyy', { locale: sv })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a href={file.url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm('Ta bort denna fil?')) {
                                deleteFileMutation.mutate(file.url);
                              }
                            }}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Inga filer uppladdade ännu</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Emergency Contacts Tab */}
          <TabsContent value="contacts" className="space-y-4">
            {isAdmin && (
              <Button onClick={() => setShowContactModal(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Lägg till nödkontakt
              </Button>
            )}

            {employee.emergency_contacts && employee.emergency_contacts.length > 0 ? (
              <div className="grid gap-3">
                {employee.emergency_contacts.map((contact, index) => (
                  <Card key={index} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{contact.name}</p>
                          <p className="text-sm text-slate-500 mt-1">{contact.relationship}</p>
                          <div className="space-y-1 mt-3">
                            {contact.phone && (
                              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </a>
                            )}
                            {contact.email && (
                              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </a>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm('Ta bort denna kontakt?')) {
                                deleteContactMutation.mutate(index);
                              }
                            }}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Inga nödkontakter registrerade</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Onboarding Tab */}
          {isAdmin && (
            <TabsContent value="onboarding" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => setShowTemplateModal(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Tilldela mall
                </Button>
                <Button onClick={() => setShowCredentialsModal(true)} variant="outline" className="w-full">
                  <Key className="h-4 w-4 mr-2" />
                  Lägg till inlogg
                </Button>
              </div>

              {/* Onboarding Status */}
              {employee.assigned_onboarding_template_id && (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Onboarding-status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">
                      {employee.onboarding_status === 'not_started' && 'Ej startad'}
                      {employee.onboarding_status === 'in_progress' && 'Pågående'}
                      {employee.onboarding_status === 'completed' && 'Slutförd'}
                    </Badge>
                  </CardContent>
                </Card>
              )}

              {/* Credentials */}
              {employee.credentials && employee.credentials.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">Inloggningsuppgifter</h3>
                  {employee.credentials.map((cred, index) => (
                    <Card key={index} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{cred.system_name}</p>
                            <div className="space-y-2 mt-3 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 w-24">Användarnamn:</span>
                                <span className="font-mono text-slate-700">{cred.username}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    navigator.clipboard.writeText(cred.username);
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 w-24">Lösenord:</span>
                                <span className="font-mono text-slate-700">
                                  {showPassword[index] ? cred.password : '••••••••'}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setShowPassword(prev => ({ ...prev, [index]: !prev[index] }))}
                                >
                                  {showPassword[index] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    navigator.clipboard.writeText(cred.password);
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              {cred.url && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 w-24">URL:</span>
                                  <a href={cred.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                    {cred.url}
                                  </a>
                                </div>
                              )}
                              {cred.notes && (
                                <div className="flex items-start gap-2">
                                  <span className="text-slate-500 w-24">Notering:</span>
                                  <p className="text-slate-600 flex-1">{cred.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm('Ta bort denna inloggning?')) {
                                const updatedCredentials = employee.credentials.filter((_, i) => i !== index);
                                base44.entities.Employee.update(employee.id, { credentials: updatedCredentials })
                                  .then(() => queryClient.invalidateQueries({ queryKey: ['employee', employeeId] }));
                              }
                            }}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {(!employee.credentials || employee.credentials.length === 0) && !employee.assigned_onboarding_template_id && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <Key className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Ingen onboarding-information tillgänglig ännu</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Important Dates Tab */}
          <TabsContent value="dates" className="space-y-4">
            {isAdmin && (
              <Button onClick={() => setShowDateModal(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Lägg till viktigt datum
              </Button>
            )}

            {employee.important_dates && employee.important_dates.length > 0 ? (
              <div className="grid gap-3">
                {employee.important_dates
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((date, index) => (
                    <Card key={index} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{date.title}</p>
                              <p className="text-sm text-slate-500 mt-1">
                                {format(new Date(date.date), 'd MMMM yyyy', { locale: sv })}
                              </p>
                              <Badge variant="secondary" className="mt-2 text-xs">
                                {getDateTypeLabel(date.type)}
                              </Badge>
                              {date.notes && (
                                <p className="text-sm text-slate-600 mt-2">{date.notes}</p>
                              )}
                            </div>
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (window.confirm('Ta bort detta datum?')) {
                                  deleteDateMutation.mutate(index);
                                }
                              }}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Inga viktiga datum registrerade</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <UploadFileModal
        open={showFileModal}
        onClose={() => {
          setShowFileModal(false);
          queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
        }}
        employee={employee}
      />

      <EmergencyContactModal
        open={showContactModal}
        onClose={() => {
          setShowContactModal(false);
          queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
        }}
        employee={employee}
      />

      <ImportantDateModal
        open={showDateModal}
        onClose={() => {
          setShowDateModal(false);
          queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
        }}
        employee={employee}
      />

      <AssignTemplateModal
        open={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false);
          queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
        }}
        employee={employee}
      />

      <CredentialsModal
        open={showCredentialsModal}
        onClose={() => {
          setShowCredentialsModal(false);
          queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
        }}
        employee={employee}
      />
    </div>
  );
}