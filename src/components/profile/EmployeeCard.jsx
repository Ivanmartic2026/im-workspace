import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, MapPin, Building2, User2 } from "lucide-react";
import { motion } from "framer-motion";

const departmentColors = {
  Ledning: "bg-violet-100 text-violet-700",
  HR: "bg-emerald-100 text-emerald-700",
  Sälj: "bg-blue-100 text-blue-700",
  Marknad: "bg-pink-100 text-pink-700",
  IT: "bg-cyan-100 text-cyan-700",
  Ekonomi: "bg-amber-100 text-amber-700",
  Produktion: "bg-orange-100 text-orange-700",
  Kundtjänst: "bg-rose-100 text-rose-700",
  Övrigt: "bg-slate-100 text-slate-700"
};

export default function EmployeeCard({ employee, user, onClick, index = 0 }) {
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
    >
      <Card 
        className="border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
        onClick={onClick}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-slate-100 group-hover:ring-slate-200 transition-all">
              <AvatarImage src={employee.profile_image} />
              <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 text-lg font-medium">
                {getInitials(user?.full_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate group-hover:text-slate-700 transition-colors">
                    {user?.full_name || employee.user_email}
                  </h3>
                  {employee.job_title && (
                    <p className="text-sm text-slate-500 truncate">{employee.job_title}</p>
                  )}
                </div>
                <Badge className={`${departmentColors[employee.department]} border-0 text-xs flex-shrink-0`}>
                  {employee.department}
                </Badge>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                <a 
                  href={`mailto:${employee.user_email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                >
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[140px]">{employee.user_email}</span>
                </a>
                {employee.phone && (
                  <a 
                    href={`tel:${employee.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                  >
                    <Phone className="h-3 w-3" />
                    <span>{employee.phone}</span>
                  </a>
                )}
                {employee.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{employee.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}