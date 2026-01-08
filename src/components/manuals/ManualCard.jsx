import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, AlertCircle, Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

const categoryColors = {
  produkt: 'bg-blue-100 text-blue-700 border-blue-200',
  säkerhet: 'bg-rose-100 text-rose-700 border-rose-200',
  hr_policy: 'bg-purple-100 text-purple-700 border-purple-200',
  it_system: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  fordon: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  arbetsrutiner: 'bg-amber-100 text-amber-700 border-amber-200',
  allmänt: 'bg-slate-100 text-slate-700 border-slate-200'
};

const priorityColors = {
  låg: 'bg-slate-100 text-slate-700',
  normal: 'bg-blue-100 text-blue-700',
  hög: 'bg-amber-100 text-amber-700',
  kritisk: 'bg-rose-100 text-rose-700'
};

export default function ManualCard({ manual, user, isAdmin }) {
  const hasAcknowledged = manual.acknowledged_by?.some(a => a.email === user?.email);
  const needsAcknowledgment = manual.requires_acknowledgment && !hasAcknowledged;

  return (
    <Link to={createPageUrl('ManualDetail') + `?id=${manual.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Card className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer h-full ${
          needsAcknowledgment ? 'ring-2 ring-amber-200' : ''
        }`}>
          <CardContent className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={categoryColors[manual.category]} variant="outline">
                    {manual.category}
                  </Badge>
                  {needsAcknowledgment && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200" variant="outline">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Läs & bekräfta
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">
                  {manual.title}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2">
                  {manual.description}
                </p>
              </div>
              <div className="ml-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
              </div>
            </div>

            {/* Tags */}
            {manual.tags && manual.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {manual.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {manual.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{manual.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>v{manual.version}</span>
                </div>
                {manual.requires_acknowledgment && (
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{manual.acknowledged_by?.length || 0}</span>
                  </div>
                )}
              </div>
              <Badge className={priorityColors[manual.priority]} variant="outline">
                {manual.priority}
              </Badge>
            </div>

            {/* Acknowledgment Status */}
            {manual.requires_acknowledgment && (
              <div className={`mt-3 p-2 rounded-lg flex items-center gap-2 ${
                hasAcknowledged 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {hasAcknowledged ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Bekräftad</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Väntar på bekräftelse</span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}