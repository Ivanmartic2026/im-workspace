import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { Loader2, ImagePlus, X } from "lucide-react";

export default function CreateNewsModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'allmänt',
    is_important: false,
    requires_acknowledgment: false,
    image_url: ''
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await base44.entities.NewsPost.create({
        ...formData,
        reactions: { likes: [], hearts: [], celebrates: [] },
        comments: []
      });
      onSuccess();
      onClose();
      setFormData({
        title: '',
        content: '',
        category: 'allmänt',
        is_important: false,
        requires_acknowledgment: false,
        image_url: ''
      });
    } catch (error) {
      console.error('Error creating post:', error);
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Skapa nyhet</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Rubrik</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ange rubrik..."
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Innehåll</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Skriv ditt meddelande..."
              className="min-h-[120px] resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allmänt">Allmänt</SelectItem>
                  <SelectItem value="ledning">Ledning</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bild</Label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                {formData.image_url ? (
                  <div className="relative h-11 rounded-lg border overflow-hidden bg-slate-50">
                    <img src={formData.image_url} alt="" className="h-full w-full object-cover" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-0.5 right-0.5 h-6 w-6 bg-white/80 hover:bg-white"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="image-upload"
                    className="flex items-center justify-center h-11 border-2 border-dashed rounded-lg cursor-pointer hover:border-slate-400 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <ImagePlus className="w-4 h-4 text-slate-400" />
                    )}
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div>
                <Label htmlFor="important" className="text-amber-800 font-medium">Markera som viktig</Label>
                <p className="text-xs text-amber-600 mt-0.5">Visas med markering högst upp</p>
              </div>
              <Switch
                id="important"
                checked={formData.is_important}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_important: checked }))}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <Label htmlFor="acknowledgment" className="text-blue-800 font-medium">Kräv bekräftelse</Label>
                <p className="text-xs text-blue-600 mt-0.5">Användare måste godkänna att de läst</p>
              </div>
              <Switch
                id="acknowledgment"
                checked={formData.requires_acknowledgment}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_acknowledgment: checked }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[100px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publicera'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}