import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Upload, Loader2, FileText, X } from "lucide-react";

const categoryOptions = [
  { value: 'produkt_teknik', label: 'Produkt & Teknik' },
  { value: 'arbetsrutiner', label: 'Arbetsrutiner' },
  { value: 'it_system', label: 'IT & System' },
  { value: 'hr', label: 'HR' },
  { value: 'varumarke_allmant', label: 'Varumärke & Allmänt' }
];

const priorityOptions = [
  { value: 'låg', label: 'Låg' },
  { value: 'normal', label: 'Normal' },
  { value: 'hög', label: 'Hög' },
  { value: 'kritisk', label: 'Kritisk' }
];

export default function UploadManualModal({ open, onClose, onSuccess, editManual = null }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'varumarke_allmant',
    subcategory: '',
    sequence_order: null,
    version: '1.0',
    priority: 'normal',
    requires_acknowledgment: false,
    is_public: true,
    tags: [],
    expiry_date: '',
    parent_manual_id: null
  });

  // Hämta alla manualer för att visa tillgängliga grupper
  const { data: allManuals = [] } = useQuery({
    queryKey: ['manuals'],
    queryFn: () => base44.entities.Manual.list('-created_date', 200),
    enabled: open
  });

  // Filtrera endast parent manuals (grupper utan parent_manual_id)
  const parentManuals = allManuals.filter(m => !m.parent_manual_id);

  // Filtrera tillgängliga grupper baserat på vald kategori och underkategori
  const availableGroups = parentManuals.filter(m => 
    m.category === formData.category && 
    (!formData.subcategory || m.subcategory === formData.subcategory || !m.subcategory)
  );

  useEffect(() => {
    if (editManual) {
      setFormData({
        title: editManual.title || '',
        description: editManual.description || '',
        category: editManual.category || 'allmänt',
        subcategory: editManual.subcategory || '',
        sequence_order: editManual.sequence_order || null,
        version: editManual.version || '1.0',
        priority: editManual.priority || 'normal',
        requires_acknowledgment: editManual.requires_acknowledgment || false,
        is_public: editManual.is_public ?? true,
        tags: editManual.tags || [],
        expiry_date: editManual.expiry_date || '',
        parent_manual_id: editManual.parent_manual_id || null
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'varumarke_allmant',
        subcategory: '',
        sequence_order: null,
        version: '1.0',
        priority: 'normal',
        requires_acknowledgment: false,
        is_public: true,
        tags: [],
        expiry_date: '',
        parent_manual_id: null
      });
      setFile(null);
    }
  }, [editManual, open]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      alert('Fyll i titel');
      return;
    }

    // Om man skapar en grupp (utan parent_manual_id och utan fil)
    const isGroup = !editManual && !file && !formData.parent_manual_id;
    
    // Om man inte skapar en grupp, måste man ha en fil
    if (!isGroup && !editManual && !file) {
      alert('Välj en fil att ladda upp eller skapa en grupp');
      return;
    }

    setLoading(true);

    try {
      let file_url = editManual?.file_url;
      let file_type = editManual?.file_type;

      // Upload new file if provided
      if (file) {
        const uploadResponse = await base44.integrations.Core.UploadFile({ file });
        file_url = uploadResponse.file_url;
        
        const extension = file.name.split('.').pop().toLowerCase();
        file_type = ['pdf', 'docx', 'xlsx', 'pptx', 'jpg', 'jpeg', 'png', 'mp4', 'webm'].includes(extension) ? extension : 'annat';
      }

      const user = await base44.auth.me();
      
      const manualData = {
        ...formData,
        ...(file_url && { file_url }),
        ...(file_type && { file_type }),
        uploaded_by: user.email
      };

      if (editManual) {
        await base44.entities.Manual.update(editManual.id, manualData);
      } else {
        await base44.entities.Manual.create(manualData);
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving manual:', error);
      alert('Kunde inte spara manualen: ' + error.message);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editManual ? 'Redigera manual' : formData.parent_manual_id ? 'Lägg till innehål' : 'Skapa grupp eller ladda upp manual'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Text */}
          {!editManual && !formData.parent_manual_id && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-900">
              <p className="font-medium mb-1">💡 Två sätt att använda:</p>
              <ul className="text-xs space-y-1 ml-4 list-disc">
                <li>Skapa en <strong>grupp</strong>: Fyll i titel och beskrivning, hoppa över fil</li>
                <li>Lägg till <strong>innehål</strong>: Välj en grupp nedan och ladda upp en fil</li>
              </ul>
            </div>
          )}

          {/* File Upload */}
          {!editManual && !formData.parent_manual_id && (
            <div>
              <Label>Fil (valfri för grupper)</Label>
              <div className="mt-2">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  {file ? (
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-slate-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600">Klicka för att välja fil</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, PowerPoint, JPG, PNG, MP4</p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.mp4,.webm"
                  />
                </label>
              </div>
            </div>
          )}

          {/* File Upload for content */}
          {!editManual && formData.parent_manual_id && (
            <div>
              <Label>Fil *</Label>
              <div className="mt-2">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  {file ? (
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-slate-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600">Klicka för att välja fil</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, PowerPoint, JPG, PNG, MP4</p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.mp4,.webm"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <Label>Titel *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="T.ex. Användarmanual GPS-system"
            />
          </div>

          {/* Description */}
          <div>
            <Label>Beskrivning</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Kort beskrivning av manualens innehåll..."
              rows={3}
            />
          </div>

          {/* Category & Version */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kategori</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Version</Label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="1.0"
              />
            </div>
          </div>

          {/* Subcategory & Sequence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Underkategori (valfri)</Label>
              <Input
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                placeholder="t.ex. Grundläggande"
              />
            </div>

            <div>
              <Label>Ordningsföljd (valfri)</Label>
              <Input
                type="number"
                value={formData.sequence_order || ''}
                onChange={(e) => setFormData({ ...formData, sequence_order: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="t.ex. 1, 2, 3"
              />
            </div>
          </div>

          {/* Parent Manual / Group */}
          {availableGroups.length > 0 && (
            <div>
              <Label>Lägg till i grupp (valfri)</Label>
              <Select 
                value={formData.parent_manual_id || ''} 
                onValueChange={(value) => setFormData({ ...formData, parent_manual_id: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj en grupp..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Ingen grupp</SelectItem>
                  {availableGroups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority & Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prioritet</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Utgångsdatum (valfritt)</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Taggar</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Lägg till tagg..."
              />
              <Button type="button" onClick={addTag} variant="outline">
                Lägg till
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md text-sm">
                    <span>{tag}</span>
                    <button onClick={() => removeTag(tag)} className="text-slate-500 hover:text-slate-700">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <Checkbox
                id="public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
              <Label htmlFor="public" className="cursor-pointer">
                Synlig för alla (om avmarkerad kan du fördela till specifika personer)
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="ack"
                checked={formData.requires_acknowledgment}
                onCheckedChange={(checked) => setFormData({ ...formData, requires_acknowledgment: checked })}
              />
              <Label htmlFor="ack" className="cursor-pointer">
                Kräver bekräftelse från läsare
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-slate-900 hover:bg-slate-800"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editManual ? 'Uppdaterar...' : 'Laddar upp...'}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {editManual ? 'Uppdatera' : 'Ladda upp'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}