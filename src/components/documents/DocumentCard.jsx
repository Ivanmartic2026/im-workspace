import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const categoryColors = {
  personalhandbok: "bg-violet-100 text-violet-700",
  policy: "bg-blue-100 text-blue-700",
  rutin: "bg-emerald-100 text-emerald-700",
  mall: "bg-amber-100 text-amber-700",
  övrigt: "bg-slate-100 text-slate-700"
};

const categoryLabels = {
  personalhandbok: "Personalhandbok",
  policy: "Policy",
  rutin: "Rutin",
  mall: "Mall",
  övrigt: "Övrigt"
};

export default function DocumentCard({ document, onAcknowledge, currentUserEmail, index = 0 }) {
  const acknowledged = document.acknowledged_by?.some(a => a.email === currentUserEmail);
  const acknowledgedCount = document.acknowledged_by?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="group hover:shadow-md transition-all duration-300 border-0 shadow-sm overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-slate-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{document.title}</h3>
                  {document.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{document.description}</p>
                  )}
                </div>
                
                {document.file_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => window.open(document.file_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge className={`${categoryColors[document.category]} border-0 text-xs font-medium`}>
                  {categoryLabels[document.category]}
                </Badge>
                <span className="text-xs text-slate-400">v{document.version}</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-400">
                  {format(new Date(document.updated_date || document.created_date), "d MMM yyyy", { locale: sv })}
                </span>
              </div>

              {document.requires_acknowledgment && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  {acknowledged ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Du har bekräftat</span>
                      </div>
                      <span className="text-xs text-slate-400">{acknowledgedCount} har bekräftat</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">Kräver bekräftelse</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onAcknowledge(document.id)}
                        className="h-8 rounded-full text-xs"
                      >
                        Bekräfta läst
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}