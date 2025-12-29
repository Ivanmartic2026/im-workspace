import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Check, X, Edit, MapPin, Clock, Navigation, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export default function SuggestionsView({ suggestions, onAccept, onReject, onEdit, isLoading }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const handleStartEdit = (suggestion) => {
    setEditingId(suggestion.entryId);
    setEditData({
      trip_type: suggestion.suggestion.tripType,
      purpose: suggestion.suggestion.purpose || '',
      project_code: suggestion.suggestion.projectCode || '',
      customer: suggestion.suggestion.customer || '',
      notes: ''
    });
  };

  const handleSaveEdit = (entryId) => {
    onEdit(entryId, editData);
    setEditingId(null);
    setEditData({});
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-emerald-600 bg-emerald-50';
    if (confidence >= 60) return 'text-amber-600 bg-amber-50';
    return 'text-rose-600 bg-rose-50';
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500">Analyserar resor med AI...</p>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga förslag</h3>
          <p className="text-slate-500 text-sm">
            Välj resor att analysera för att få AI-förslag
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-indigo-600" />
        <h3 className="font-semibold text-slate-900">AI-förslag</h3>
        <Badge variant="outline" className="ml-auto">
          {suggestions.length} {suggestions.length === 1 ? 'resa' : 'resor'}
        </Badge>
      </div>

      <AnimatePresence>
        {suggestions.map((suggestion) => {
          const entry = suggestion.originalEntry;
          const ai = suggestion.suggestion;
          const isEditing = editingId === suggestion.entryId;

          if (suggestion.error) {
            return (
              <motion.div
                key={suggestion.entryId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="border-0 shadow-sm border-l-4 border-l-rose-500">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-rose-600">
                      <AlertCircle className="h-5 w-5" />
                      <p className="text-sm font-medium">{suggestion.error}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={suggestion.entryId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  {/* Resinfo */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-slate-900">
                        {entry.registration_number || 'Okänt fordon'}
                      </h4>
                      <Badge className={getConfidenceColor(ai.confidence)}>
                        <Sparkles className="h-3 w-3 mr-1" />
                        {ai.confidence}% säker
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {format(new Date(entry.start_time), 'PPp', { locale: sv })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-slate-400" />
                        {entry.distance_km?.toFixed(1)} km • {Math.round(entry.duration_minutes)} min
                      </div>
                      {entry.start_location && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{entry.start_location.address}</span>
                        </div>
                      )}
                      {entry.end_location && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{entry.end_location.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Förslag */}
                  {isEditing ? (
                    <div className="space-y-3 p-4 bg-indigo-50 rounded-lg mb-4">
                      <div>
                        <Label className="text-xs">Typ av resa</Label>
                        <Select 
                          value={editData.trip_type} 
                          onValueChange={(v) => setEditData({...editData, trip_type: v})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tjänst">Tjänsteresa</SelectItem>
                            <SelectItem value="privat">Privatresa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {editData.trip_type === 'tjänst' && (
                        <>
                          <div>
                            <Label className="text-xs">Syfte</Label>
                            <Textarea
                              value={editData.purpose}
                              onChange={(e) => setEditData({...editData, purpose: e.target.value})}
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Projektkod</Label>
                              <Input
                                value={editData.project_code}
                                onChange={(e) => setEditData({...editData, project_code: e.target.value})}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Kund</Label>
                              <Input
                                value={editData.customer}
                                onChange={(e) => setEditData({...editData, customer: e.target.value})}
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Anteckningar</Label>
                            <Textarea
                              value={editData.notes}
                              onChange={(e) => setEditData({...editData, notes: e.target.value})}
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                        </>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          className="flex-1"
                        >
                          Avbryt
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(suggestion.entryId)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                        >
                          Spara ändringar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-indigo-50 rounded-lg mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <span className="text-sm font-semibold text-indigo-900">AI-förslag:</span>
                        <Badge className="bg-indigo-100 text-indigo-800">
                          {ai.tripType === 'tjänst' ? 'Tjänsteresa' : 'Privatresa'}
                        </Badge>
                      </div>

                      {ai.tripType === 'tjänst' && (
                        <div className="space-y-2 text-sm">
                          {ai.purpose && (
                            <div>
                              <span className="font-medium text-indigo-800">Syfte:</span>
                              <p className="text-indigo-700 mt-0.5">{ai.purpose}</p>
                            </div>
                          )}
                          {(ai.projectCode || ai.customer) && (
                            <div className="flex gap-3 text-xs">
                              {ai.projectCode && (
                                <Badge variant="outline" className="border-indigo-300 text-indigo-700">
                                  Projekt: {ai.projectCode}
                                </Badge>
                              )}
                              {ai.customer && (
                                <Badge variant="outline" className="border-indigo-300 text-indigo-700">
                                  Kund: {ai.customer}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {ai.reasoning && (
                        <div className="mt-3 pt-3 border-t border-indigo-200">
                          <p className="text-xs text-indigo-600 italic">{ai.reasoning}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Knappar */}
                  {!isEditing && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReject(suggestion.entryId)}
                        className="flex-1"
                      >
                        <X className="h-3 w-3 mr-2" />
                        Avvisa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartEdit(suggestion)}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-2" />
                        Redigera
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onAccept(suggestion.entryId, ai)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Check className="h-3 w-3 mr-2" />
                        Godkänn
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}