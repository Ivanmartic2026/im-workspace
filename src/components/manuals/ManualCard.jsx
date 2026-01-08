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
  produkt: 'from-blue-500 to-cyan-500',
  säkerhet: 'from-rose-500 to-pink-500',
  hr_policy: 'from-purple-500 to-indigo-500',
  it_system: 'from-cyan-500 to-teal-500',
  fordon: 'from-emerald-500 to-green-500',
  arbetsrutiner: 'from-amber-500 to-orange-500',
  allmänt: 'from-slate-500 to-gray-500'
};

const categoryBadgeColors = {
  produkt: 'bg-blue-100 text-blue-700 border-blue-200',
  säkerhet: 'bg-rose-100 text-rose-700 border-rose-200',
  hr_policy: 'bg-purple-100 text-purple-700 border-purple-200',
  it_system: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  fordon: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  arbetsrutiner: 'bg-amber-100 text-amber-700 border-amber-200',
  allmänt: 'bg-slate-100 text-slate-700 border-slate-200'
};

const priorityColors = {
  låg: 'bg-slate-100 text-slate-600 border-slate-200',
  normal: 'bg-blue-100 text-blue-600 border-blue-200',
  hög: 'bg-amber-100 text-amber-600 border-amber-200',
  kritisk: 'bg-rose-100 text-rose-600 border-rose-200'
};

export default function ManualCard({ manual, user, isAdmin }) {
  const hasAcknowledged = manual.acknowledged_by?.some(a => a.email === user?.email);
  const needsAcknowledgment = manual.requires_acknowledgment && !hasAcknowledged;

  return (
    <Link to={createPageUrl('ManualDetail') + `?id=${manual.id}`}>
      <motion.div
        whileHover={{ y: -6, transition: { duration: 0.2 } }}
        className="h-full"
      >
        <Card className={`border-0 shadow-lg hover:shadow-2xl transition-all cursor-pointer h-full bg-white overflow-hidden group ${
          needsAcknowledgment ? 'ring-2 ring-amber-300 ring-offset-2' : ''
        }`}>
          {/* Gradient Header */}
          <div className={`h-2 bg-gradient-to-r ${categoryColors[manual.category]}`} />
          
          <CardContent className="p-6">
            {/* Icon & Badges */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={categoryBadgeColors[manual.category]} variant="outline">
                    {manual.category}
                  </Badge>
                  {needsAcknowledgment && (
                    <Badge className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border-amber-300 shadow-sm" variant="outline">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Läs & bekräfta
                    </Badge>
                  )}
                </div>
              </div>
              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${categoryColors[manual.category]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <FileText className="h-7 w-7 text-white" />
              </div>
            </div>

            {/* Title & Description */}
            <div className="mb-4">
              <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 text-lg group-hover:text-indigo-600 transition-colors">
                {manual.title}
              </h3>
              <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                {manual.description}
              </p>
            </div>

            {/* Tags */}
            {manual.tags && manual.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {manual.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-slate-50 border-slate-200 text-slate-600">
                    {tag}
                  </Badge>
                ))}
                {manual.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 text-slate-600">
                    +{manual.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="font-medium">v{manual.version}</span>
                </div>
                {manual.requires_acknowledgment && (
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                    <Eye className="h-3.5 w-3.5" />
                    <span className="font-medium">{manual.acknowledged_by?.length || 0}</span>
                  </div>
                )}
              </div>
              <Badge className={`${priorityColors[manual.priority]} font-medium`} variant="outline">
                {manual.priority}
              </Badge>
            </div>

            {/* Acknowledgment Status */}
            {manual.requires_acknowledgment && (
              <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 shadow-sm ${
                hasAcknowledged 
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200'
              }`}>
                {hasAcknowledged ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-semibold">✓ Bekräftad</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-semibold">Väntar på bekräftelse</span>
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