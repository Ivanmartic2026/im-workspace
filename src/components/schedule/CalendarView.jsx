import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { Clock, MapPin, Users } from "lucide-react";
import { motion } from "framer-motion";

const typeColors = {
  skift: "bg-blue-500",
  möte: "bg-violet-500",
  utbildning: "bg-emerald-500",
  event: "bg-amber-500"
};

const typeLabels = {
  skift: "Skift",
  möte: "Möte",
  utbildning: "Utbildning",
  event: "Event"
};

export default function CalendarView({ events, selectedDate, onSelectDate, currentUserEmail }) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (date) => {
    return events.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, date);
    });
  };

  const isMyEvent = (event) => {
    return event.assigned_to?.includes(currentUserEmail) || event.created_by === currentUserEmail;
  };

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {weekDays.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const hasEvents = getEventsForDay(day).length > 0;
          const isToday = isSameDay(day, new Date());
          
          return (
            <motion.button
              key={day.toISOString()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelectDate(day)}
              className={`
                flex flex-col items-center justify-center min-w-[64px] py-3 px-2 rounded-2xl transition-all
                ${isSelected 
                  ? 'bg-slate-900 text-white shadow-lg' 
                  : isToday 
                    ? 'bg-slate-100 text-slate-900'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              <span className="text-xs font-medium uppercase opacity-60">
                {format(day, 'EEE', { locale: sv })}
              </span>
              <span className={`text-xl font-semibold mt-1 ${isSelected ? 'text-white' : ''}`}>
                {format(day, 'd')}
              </span>
              {hasEvents && (
                <div className={`h-1.5 w-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-slate-900'}`} />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Events List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-500">
          {format(selectedDate, "EEEE d MMMM", { locale: sv })}
        </h3>
        
        {getEventsForDay(selectedDate).length === 0 ? (
          <Card className="border-0 shadow-sm bg-slate-50">
            <CardContent className="py-12 text-center">
              <p className="text-slate-400">Inga händelser denna dag</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {getEventsForDay(selectedDate).map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className={`border-0 shadow-sm overflow-hidden ${isMyEvent(event) ? 'ring-2 ring-blue-200' : ''}`}>
                  <div className="flex">
                    <div className={`w-1.5 ${typeColors[event.type]}`} />
                    <CardContent className="py-4 px-5 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-900 truncate">{event.title}</h4>
                            {isMyEvent(event) && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                                Min
                              </Badge>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{event.description}</p>
                          )}
                        </div>
                        <Badge className={`${typeColors[event.type]} text-white border-0 text-xs`}>
                          {typeLabels[event.type]}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {format(parseISO(event.start_time), 'HH:mm')}
                            {event.end_time && ` - ${format(parseISO(event.end_time), 'HH:mm')}`}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.assigned_to?.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            <span>{event.assigned_to.length} deltagare</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}