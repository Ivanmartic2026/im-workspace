import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, CheckCircle2, Eye, Users, Calendar, User, Tag, AlertTriangle, Edit, Trash2, Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import AssignManualModal from '@/components/manuals/AssignManualModal';
import UploadManualModal from '@/components/manuals/UploadManualModal';

const categoryLabels = {
  produkt_teknik: 'Produkt & Teknik',
  arbetsrutiner: 'Arbetsrutiner',
  it_system: 'IT & System',
  hr: 'HR',
  varumarke_allmant: 'Varumärke & Allmänt'
};

const priorityColors = {
  låg: 'bg-slate-100 text-slate-700',
  normal: 'bg-blue-100 text-blue-700',
  hög: 'bg-amber-100 text-amber-700',
  kritisk: 'bg-rose-100 text-rose-700'
};

export default function ManualDetail() {
  const [user, setUser] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();
  
  const urlParams = new URLSearchParams(window.location.search);
  const manualId = urlParams.get('id');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: manuals = [] } = useQuery({
    queryKey: ['manuals'],
    queryFn: () => base44.entities.Manual.list(),
  });

  const manual = manuals.find(m => m.id === manualId);

  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      const acknowledged_by = manual.acknowledged_by || [];
      acknowledged_by.push({
        email: user.email,
        name: user.full_name,
        acknowledged_at: new Date().toISOString()
      });
      
      return base44.entities.Manual.update(manualId, { acknowledged_by });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manuals'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Manual.delete(manualId),
    onSuccess: () => {
      window.location.href = createPageUrl('Manuals');
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ rating, comment }) => {
      const feedback = manual.feedback || [];
      
      // Remove existing feedback from same user
      const filteredFeedback = feedback.filter(f => f.user_email !== user.email);
      
      // Add new feedback
      filteredFeedback.push({
        user_email: user.email,
        user_name: user.full_name,
        rating,
        comment,
        created_at: new Date().toISOString()
      });
      
      // Calculate new average
      const average_rating = filteredFeedback.reduce((sum, f) => sum + f.rating, 0) / filteredFeedback.length;
      
      return base44.entities.Manual.update(manualId, { 
        feedback: filteredFeedback,
        average_rating: Math.round(average_rating * 10) / 10
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manuals'] });
      setShowFeedbackForm(false);
      setRating(0);
      setComment('');
    },
  });

  const handleAcknowledge = async () => {
    if (window.confirm('Bekräfta att du har läst och förstått denna manual?')) {
      await acknowledgeMutation.mutateAsync();
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Är du säker på att du vill ta bort denna manual? Detta kan inte ångras.')) {
      await deleteMutation.mutateAsync();
    }
  };

  if (!manual) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Manual hittades inte</h3>
              <Link to={createPageUrl('Manuals')}>
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Tillbaka till manualer
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const hasAcknowledged = manual.acknowledged_by?.some(a => a.email === user?.email);
  const isAdmin = user?.role === 'admin';
  const userFeedback = manual.feedback?.find(f => f.user_email === user?.email);
  const averageRating = manual.average_rating || 0;
  const totalFeedback = manual.feedback?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="mb-6">
            <Link to={createPageUrl('Manuals')}>
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka till manualer
              </Button>
            </Link>

            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-slate-900 mb-3">{manual.title}</h1>
                {manual.description && (
                  <p className="text-slate-600 mb-4">{manual.description}</p>
                )}
                
                {/* Metadata Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Kategori</p>
                    <Badge variant="outline" className="font-medium">
                      {categoryLabels[manual.category]}
                    </Badge>
                  </div>
                  
                  {manual.subcategory && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Underkategori</p>
                      <Badge className="bg-blue-100 text-blue-700 font-medium">
                        {manual.subcategory}
                      </Badge>
                    </div>
                  )}
                  
                  {manual.sequence_order && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Ordning</p>
                      <Badge variant="outline" className="font-medium">
                        Steg {manual.sequence_order}
                      </Badge>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Prioritet</p>
                    <Badge className={priorityColors[manual.priority]}>
                      {manual.priority}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Version</p>
                    <Badge variant="outline" className="font-medium">v{manual.version}</Badge>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* File Preview */}
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-6">
              {manual.file_type === 'pdf' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">Dokumentvisning</h3>
                    <a href={manual.file_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Ladda ner
                      </Button>
                    </a>
                  </div>
                  <iframe 
                    src={`${manual.file_url}#toolbar=1&navpanes=1&scrollbar=1`}
                    className="w-full h-[800px] rounded-lg border border-slate-200"
                    title={manual.title}
                  />
                </div>
              )}

              {(manual.file_type === 'jpg' || manual.file_type === 'jpeg' || manual.file_type === 'png') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">Bildvisning</h3>
                    <a href={manual.file_url} download>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Ladda ner
                      </Button>
                    </a>
                  </div>
                  <img 
                    src={manual.file_url} 
                    alt={manual.title}
                    className="w-full rounded-lg border border-slate-200"
                  />
                </div>
              )}

              {(manual.file_type === 'mp4' || manual.file_type === 'webm') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">Videovisning</h3>
                    <a href={manual.file_url} download>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Ladda ner
                      </Button>
                    </a>
                  </div>
                  <video 
                    src={manual.file_url} 
                    controls
                    className="w-full rounded-lg border border-slate-200"
                  >
                    Din webbläsare stödjer inte videouppspelning.
                  </video>
                </div>
              )}

              {!['pdf', 'jpg', 'jpeg', 'png', 'mp4', 'webm'].includes(manual.file_type) && (
                <div className="text-center py-8">
                  <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Download className="h-8 w-8 text-slate-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">Förhandsvisning ej tillgänglig</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Filtyp: {manual.file_type?.toUpperCase()}
                  </p>
                  <a href={manual.file_url} download>
                    <Button className="bg-slate-900 hover:bg-slate-800">
                      <Download className="h-4 w-4 mr-2" />
                      Ladda ner dokument
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acknowledgment Card */}
          {manual.requires_acknowledgment && (
            <Card className={`border-0 shadow-sm mb-6 ${hasAcknowledged ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                    hasAcknowledged ? 'bg-emerald-100' : 'bg-amber-100'
                  }`}>
                    <CheckCircle2 className={`h-6 w-6 ${
                      hasAcknowledged ? 'text-emerald-600' : 'text-amber-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold ${hasAcknowledged ? 'text-emerald-900' : 'text-amber-900'}`}>
                      {hasAcknowledged ? 'Bekräftad' : 'Bekräftelse krävs'}
                    </h3>
                    <p className={`text-xs ${hasAcknowledged ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {hasAcknowledged ? 'Du har läst denna manual' : 'Bekräfta att du har läst'}
                    </p>
                  </div>
                  {!hasAcknowledged && (
                    <Button 
                      onClick={handleAcknowledge}
                      disabled={acknowledgeMutation.isPending}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Bekräfta läsning
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sequence Navigation */}
          {manual.subcategory && manual.sequence_order && (
            <Card className="border-0 shadow-sm mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-5">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                  Relaterade manualer i {manual.subcategory}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {manuals
                    .filter(m => m.subcategory === manual.subcategory && m.id !== manual.id)
                    .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
                    .map(relatedManual => (
                      <Link key={relatedManual.id} to={createPageUrl('ManualDetail') + `?id=${relatedManual.id}`}>
                        <Button size="sm" variant="outline" className="text-xs">
                          Steg {relatedManual.sequence_order}: {relatedManual.title}
                        </Button>
                      </Link>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Section for old file types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 hidden">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Download className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Ladda ner manual</h3>
                    <p className="text-xs text-slate-500">Filtyp: {manual.file_type?.toUpperCase()}</p>
                  </div>
                </div>
                <a href={manual.file_url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-slate-900 hover:bg-slate-800">
                    <Download className="h-4 w-4 mr-2" />
                    Öppna dokument
                  </Button>
                </a>
              </CardContent>
            </Card>

          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <>
              {/* Group Management */}
              {!manual.parent_manual_id && (
                <Card className="border-0 shadow-sm mb-6 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Lägg till innehål i denna grupp</p>
                          <p className="text-xs text-slate-600">
                            {manuals.filter(m => m.parent_manual_id === manual.id).length} manualer tilldelade
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setShowEditModal(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Lägg till innehål
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Assign to users */}
              <Card className="border-0 shadow-sm mb-6 bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Fördela till personal</p>
                        <p className="text-xs text-slate-600">
                          {manual.assigned_to?.length || 0} personer tilldelade
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowAssignModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Hantera tilldelning
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Metadata */}
          <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1 flex items-center gap-2">
                    <User className="h-3 w-3" />
                    Uppladdad av
                  </p>
                  <p className="text-sm font-medium text-slate-900">{manual.uploaded_by || 'Okänd'}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500 mb-1 flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Senast uppdaterad
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {format(new Date(manual.updated_date), 'PPP', { locale: sv })}
                  </p>
                </div>
              </div>

              {manual.tags && manual.tags.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2 flex items-center gap-2">
                    <Tag className="h-3 w-3" />
                    Taggar
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {manual.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {manual.expiry_date && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-700">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    Utgår: {format(new Date(manual.expiry_date), 'PPP', { locale: sv })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feedback Section */}
          <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  Betyg & Feedback
                </div>
                {averageRating > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= Math.round(averageRating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-slate-600">
                      {averageRating.toFixed(1)} ({totalFeedback})
                    </span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Feedback Form */}
              {user && !showFeedbackForm && !userFeedback && (
                <Button
                  onClick={() => setShowFeedbackForm(true)}
                  variant="outline"
                  className="w-full mb-4"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Lämna feedback
                </Button>
              )}

              {user && showFeedbackForm && (
                <div className="p-4 bg-slate-50 rounded-lg mb-4">
                  <div className="mb-4">
                    <label className="text-sm font-medium text-slate-900 mb-2 block">
                      Betyg
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-8 w-8 ${
                              star <= rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 hover:text-amber-200'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-sm font-medium text-slate-900 mb-2 block">
                      Kommentar (valfritt)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Dela dina tankar om denna manual..."
                      className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => feedbackMutation.mutate({ rating, comment })}
                      disabled={rating === 0 || feedbackMutation.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Skicka feedback
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowFeedbackForm(false);
                        setRating(0);
                        setComment('');
                      }}
                    >
                      Avbryt
                    </Button>
                  </div>
                </div>
              )}

              {/* User's existing feedback */}
              {userFeedback && (
                <div className="p-4 bg-emerald-50 rounded-lg mb-4 border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-emerald-900">Din feedback</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= userFeedback.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {userFeedback.comment && (
                    <p className="text-sm text-slate-600">{userFeedback.comment}</p>
                  )}
                </div>
              )}

              {/* Recent feedback */}
              {manual.feedback && manual.feedback.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900">Senaste feedback</h4>
                  {manual.feedback
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 5)
                    .map((feedback, index) => (
                      <div key={index} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {feedback.user_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {format(new Date(feedback.created_at), 'PPp', { locale: sv })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= feedback.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {feedback.comment && (
                          <p className="text-sm text-slate-600">{feedback.comment}</p>
                        )}
                      </div>
                    ))}
                  {manual.feedback.length > 5 && (
                    <p className="text-sm text-slate-500 text-center">
                      +{manual.feedback.length - 5} till
                    </p>
                  )}
                </div>
              )}

              {(!manual.feedback || manual.feedback.length === 0) && !showFeedbackForm && (
                <p className="text-sm text-slate-500 text-center py-4">
                  Ingen feedback ännu. Var den första att betygsätta!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Acknowledgments */}
          {manual.requires_acknowledgment && manual.acknowledged_by?.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Bekräftelser ({manual.acknowledged_by.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {manual.acknowledged_by.slice(0, 10).map((ack, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{ack.name}</p>
                        <p className="text-xs text-slate-500">{ack.email}</p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {format(new Date(ack.acknowledged_at), 'PPp', { locale: sv })}
                      </p>
                    </div>
                  ))}
                  {manual.acknowledged_by.length > 10 && (
                    <p className="text-sm text-slate-500 text-center pt-2">
                      +{manual.acknowledged_by.length - 10} till
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      <AssignManualModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        manual={manual}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['manuals'] });
          setShowAssignModal(false);
        }}
      />

      <UploadManualModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        editManual={manual}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['manuals'] });
          setShowEditModal(false);
        }}
      />
    </div>
  );
}