import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";

export default function UploadFileModal({ open, onClose, employee }) {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'other',
    notes: '',
    file: null,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const updatedFiles = [...(employee.files || []), data];
      return base44.entities.Employee.update(employee.id, { files: updatedFiles });
    },
    onSuccess: () => {
      setFormData({ name: '', category: 'other', notes: '', file: null });
      onClose();
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ 
        ...prev, 
        file,
        name: prev.name || file.name 
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: formData.file });
      
      await saveMutation.mutate({
        name: formData.name,
        url: file_url,
        category: formData.category,
        uploaded_date: new Date().toISOString(),
        notes: formData.notes,
      });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ladda upp fil</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Fil *</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-slate-400 transition-colors cursor-pointer">
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">
                  {formData.file ? formData.file.name : 'Klicka för att välja fil'}
                </p>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Filnamn *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="T.ex. Anställningskontrakt"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Kontrakt</SelectItem>
                <SelectItem value="certificate">Intyg</SelectItem>
                <SelectItem value="id">Legitimation</SelectItem>
                <SelectItem value="other">Övrigt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Frivillig beskrivning..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={uploading || !formData.file || !formData.name}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Laddar upp...
                </>
              ) : (
                'Ladda upp'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}