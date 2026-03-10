import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, Briefcase, AlertTriangle, PlayCircle, 
  Calendar, TrendingUp, BarChart3, Trophy,
  Car, Umbrella, Newspaper, Activity, Users
} from "lucide-react";
import { 
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  differenceInMinutes, eachDayOfInterval, addDays, parseISO, isAfter
} from "date-fns";
import { sv } from "date-fns/locale";

const DEPT_COLORS = {
  'Support & Service': '#38bdf8',
  'Installation': '#4ade80',
  'Sales': '#f472b6',
  'Rental': '#fb923c',
  'Warehouse & Production': '#a78bfa',
  'Management': '#fbbf24',
};

const VEHICLE_STATUS_COLORS = { aktiv: '#22c55e', service: '#f59e0b', skadad: '#ef4444', avställd: '#64748b' };
const VEHICLE_STATUS_LABELS = { aktiv: 'Aktiv', service: 'På service', skadad: 'Skadad', avställd: 'Avställd' };
const LEAVE_ICONS = { semester: '🏖️', sjuk: '🤒', vab: '👶', tjänstledigt: '📋', föräldraledigt: '👨‍👩‍👧', annat: '📌' };

const PAGE_DURATION = 120;

function PulsingDot({ color = '#22c55e', size = 10 }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: 0.4, animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
      <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'block', boxShadow: `0 0 6px ${color}` }} />
    </span>
  );
}

function AutoScroll({ children, height, speed = 0.4 }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const posRef = useRef(0);
  const pauseRef = useRef(false);

  useEffect(() => {
    posRef.current = 0;
    pauseRef.current = false;
    const outer = outerRef.current;
    if (!outer) return;
    const timer = setInterval(() => {
      if (pauseRef.current) return;
      const inner = innerRef.current;
      if (!inner) return;
      const maxScroll = inner.scrollHeight - outer.clientHeight;
      if (maxScroll <= 20) return;
      posRef.current += speed;
      if (posRef.current >= maxScroll) {
        posRef.current = 0;
        pauseRef.current = true;
        setTimeout(() => { pauseRef.current = false; }, 3000);
      }
      outer.scrollTop = posRef.current;
    }, 30);
    return () => clearInterval(timer);
  }, [children, speed]);

  return (
    <div ref={outerRef} style={{ height, overflow: 'hidden' }}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

const CARD = { background: '#1e293b', borderRadius: '20px', overflow: 'hidden' };

function CardHeader({ icon, label, badge, badgeColor = '#22c55e', extra }) {
  return (
    <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #253346', display: 'flex', alignItems: 'center', gap: '12px' }}>
      {icon}
      <span style={{ fontSize: '17px', fontWeight: '700', color: '#f1f5f9' }}>{label}</span>
      {badge !== undefined && (
        <span style={{ marginLeft: 'auto', background: `${badgeColor}22`, color: badgeColor, borderRadius: '99px', padding: '3px 14px', fontSize: '14px', fontWeight: '700' }}>{badge}</span>
      )}
      {extra}
    </div>
  );
}

export default function TVDashboard() {
  const [now, setNow] = useState(new Date());
  const [page, setPage] = useState(0);
  const [pageTimer, setPageTimer] = useState(PAGE_DURATION);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / 1920;
      const scaleY = window.innerHeight / 1080;
      setScale(Math.min(scaleX, scaleY));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setPageTimer(prev => {
        if (prev <= 1) { setPage(p => (p + 1) % 2); return PAGE_DURATION; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const today = format(now, 'yyyy-MM-dd');
  const tomorrow = format(addDays(now, 1), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: employees = [] } = useQuery({ queryKey: ['tv-employees'], queryFn: () => base44.entities.Employee.list(), refetchInterval: 60000 });
  const { data: timeEntries = [] } = useQuery({ queryKey: ['tv-time-entries'], queryFn: () => base44.entities.TimeEntry.list(), refetchInterval: 30000 });
  const { data: projects = [] } = useQuery({ queryKey: ['tv-projects'], queryFn: () => base44.entities.Project.list(), refetchInterval: 120000 });
  const { data: users = [] } = useQuery({ queryKey: ['tv-users'], queryFn: () => base44.entities.User.list(), refetchInterval: 120000 });
  const { data: leaveRequests = [] } = useQuery({ queryKey: ['tv-leaves'], queryFn: () => base44.entities.LeaveRequest.filter({ status: 'approved' }), refetchInterval: 120000 });
  const { data: vehicles = [] } = useQuery({ queryKey: ['tv-vehicles'], queryFn: () => base44.entities.Vehicle.list(), refetchInterval: 120000 });
  const { data: newsPosts = [] } = useQuery({ queryKey: ['tv-news'], queryFn: () => base44.entities.NewsPost.list('-created_date', 10), refetchInterval: 300000 });
  const { data: scheduleEvents = [] } = useQuery({ queryKey: ['tv-events'], queryFn: () => base44.entities.ScheduleEvent.list(), refetchInterval: 120000 });

  // --- Computed ---
  const clockedInEntries = timeEntries.filter(e => e.status === 'active');

  const clockedInList = clockedInEntries.map(entry => {
    const user = users.find(u => u.email === entry.employee_email);
    const emp = employees.find(e => e.user_email === entry.employee_email);
    const proj = projects.find(p => p.id === entry.project_allocations?.[0]?.project_id);
    const totalMins = entry.clock_in_time ? differenceInMinutes(now, new Date(entry.clock_in_time)) : 0;
    const hoursIn = Math.floor(totalMins / 60);
    return {
      name: user?.full_name || entry.employee_email,
      department: emp?.department || '',
      project: proj?.name || '–',
      clockInTime: entry.clock_in_time ? format(new Date(entry.clock_in_time), 'HH:mm') : '–',
      hoursIn, minsIn: totalMins % 60,
      durationText: `${hoursIn}h ${totalMins % 60}m`,
      warning: hoursIn >= 10,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const weekEntries = timeEntries.filter(e => e.date >= weekStart && e.date <= weekEnd);
  const monthEntries = timeEntries.filter(e => e.date >= monthStart && e.date <= monthEnd);
  const weekDays = eachDayOfInterval({ start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });

  const employeeSummary = users.map(user => {
    const isActive = clockedInEntries.some(e => e.employee_email === user.email);
    const empWeek = weekEntries.filter(e => e.employee_email === user.email);
    const empMonth = monthEntries.filter(e => e.employee_email === user.email);
    const weekHours = empWeek.filter(e => e.status === 'completed').reduce((s, e) => s + (e.total_hours || 0), 0);
    const monthHours = empMonth.filter(e => e.status === 'completed').reduce((s, e) => s + (e.total_hours || 0), 0);
    const dayHours = weekDays.map(day => {
      const ds = format(day, 'yyyy-MM-dd');
      const de = empWeek.find(e => e.date === ds && e.status === 'completed');
      return de?.total_hours || 0;
    });
    const emp = employees.find(e => e.user_email === user.email);
    return { name: user.full_name, department: emp?.department || '', isActive, weekHours, monthHours, dayHours };
  }).filter(e => e.name).sort((a, b) => b.weekHours - a.weekHours);

  const activeProjects = projects.filter(p => p.status === 'pågående').map(p => {
    const getHoursFromEntry = (e) => e.project_allocations?.find(a => a.project_id === p.id)?.hours || (e.project_id === p.id ? (e.total_hours || 0) : 0);
    const projEntries = timeEntries.filter(e => e.project_allocations?.some(a => a.project_id === p.id) || e.project_id === p.id);
    const hours = projEntries.reduce((s, e) => s + getHoursFromEntry(e), 0);
    const weekHours = weekEntries.filter(e => e.project_allocations?.some(a => a.project_id === p.id) || e.project_id === p.id).reduce((s, e) => s + getHoursFromEntry(e), 0);
    const activeNow = clockedInEntries.filter(e => e.project_allocations?.some(a => a.project_id === p.id) || e.project_id === p.id).length;
    const budgetPct = p.budget_hours ? Math.min(100, (hours / p.budget_hours) * 100) : null;
    const lastActivity = projEntries.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.date || '';
    return { ...p, hours, weekHours, activeNow, budgetPct, lastActivity };
  }).sort((a, b) => b.activeNow - a.activeNow || b.lastActivity.localeCompare(a.lastActivity));

  const recentProjects = [...activeProjects]
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))
    .slice(0, 10)
    .sort((a, b) => b.hours - a.hours);

  const employeeMonthSummary = users.map(user => {
    const totalMonthHours = monthEntries.filter(e => e.employee_email === user.email && e.status === 'completed').reduce((s, e) => s + (e.total_hours || 0), 0);
    const emp = employees.find(e => e.user_email === user.email);
    return { name: user.full_name, department: emp?.department || '', totalMonthHours };
  }).filter(e => e.name && e.totalMonthHours > 0).sort((a, b) => b.totalMonthHours - a.totalMonthHours);

  const totalWeekHours = weekEntries.filter(e => e.status === 'completed').reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalMonthHours = monthEntries.filter(e => e.status === 'completed').reduce((s, e) => s + (e.total_hours || 0), 0);
  const forgottenCount = clockedInList.filter(e => e.warning).length;

  // Leave
  const absentToday = leaveRequests.filter(lr => lr.start_date <= today && lr.end_date >= today).map(lr => {
    const user = users.find(u => u.email === lr.employee_email);
    const emp = employees.find(e => e.user_email === lr.employee_email);
    return { name: user?.full_name || lr.employee_email, type: lr.type, department: emp?.department || '' };
  });

  const upcomingLeaves = leaveRequests
    .filter(lr => lr.start_date >= tomorrow && lr.start_date <= weekEnd)
    .map(lr => {
      const user = users.find(u => u.email === lr.employee_email);
      return { name: user?.full_name || lr.employee_email, type: lr.type, startDate: lr.start_date, endDate: lr.end_date };
    }).sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Department warnings
  const allDepts = ['Support & Service', 'Installation', 'Sales', 'Rental'];
  const deptsWithActiveEmployees = new Set(clockedInList.map(e => e.department));
  const deptsWithEmployees = new Set(employees.map(e => e.department));
  const emptyDepts = allDepts.filter(d => deptsWithEmployees.has(d) && !deptsWithActiveEmployees.has(d));

  // News + Events
  const importantNews = newsPosts.filter(n => n.is_important).slice(0, 3);
  const displayNews = importantNews.length > 0 ? importantNews : newsPosts.slice(0, 3);
  const upcomingEvents = scheduleEvents
    .filter(e => e.start_time && isAfter(new Date(e.start_time), now))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 4);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a1120', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
    <div style={{
      width: '1920px', minHeight: '1080px',
      background: 'linear-gradient(-45deg, #0a1120, #0d1f3c, #0a1120, #10182e)',
      backgroundSize: '400% 400%',
      animation: 'gradientBG 15s ease infinite',
      color: 'white', fontFamily: '"Inter", system-ui, sans-serif',
      padding: '24px 30px', boxSizing: 'border-box', overflow: 'hidden',
      transformOrigin: 'top left',
      transform: `scale(${scale})`,
    }}>
      <style>{`
        @keyframes ping { 0%{transform:scale(1);opacity:.4} 75%,100%{transform:scale(2);opacity:0} }
        @keyframes gradientBG { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6951895d1643f7057890a865/daf37ea55_LogoLIGGANDE_IMvision_svartkopiaepskopia2.png" alt="IM Vision" style={{ height: '42px', filter: 'brightness(0) invert(1)', objectFit: 'contain' }} />
          <div style={{ width: '1px', height: '42px', background: '#253346' }} />
          <div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.5px' }}>
              {page === 0 ? 'Realtidsdashboard' : 'Status & Frånvaro'}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', textTransform: 'capitalize', marginTop: '2px' }}>
              {format(now, "EEEE d MMMM yyyy", { locale: sv })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Page indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[0, 1].map(p => (
                <div key={p} onClick={() => { setPage(p); setPageTimer(PAGE_DURATION); }} style={{
                  width: page === p ? '32px' : '10px', height: '10px', borderRadius: '99px',
                  background: page === p ? '#60a5fa' : '#253346',
                  transition: 'all 0.4s ease', cursor: 'pointer'
                }} />
              ))}
            </div>
            <span style={{ fontSize: '11px', color: '#334155' }}>byter om {pageTimer}s</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', borderRadius: '12px', padding: '7px 14px' }}>
            <PulsingDot color="#22c55e" size={8} />
            <span style={{ fontSize: '12px', color: '#64748b' }}>Live</span>
          </div>
          <div style={{ fontSize: '56px', fontWeight: '800', letterSpacing: '-3px', color: '#f1f5f9', lineHeight: 1 }}>
            {format(now, 'HH:mm')}
            <span style={{ fontSize: '30px', color: '#475569' }}>:{format(now, 'ss')}</span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
        {[
          { label: 'Instämplade nu', value: clockedInList.length, Icon: PlayCircle, color: '#22c55e', bg: '#0d2318' },
          { label: 'Timmar denna vecka', value: totalWeekHours.toFixed(0) + 'h', Icon: Clock, color: '#60a5fa', bg: '#0c1a3a' },
          { label: 'Timmar denna månad', value: totalMonthHours.toFixed(0) + 'h', Icon: Calendar, color: '#c084fc', bg: '#160e2e' },
          { label: 'Lediga idag', value: absentToday.length, Icon: Umbrella, color: '#fb923c', bg: '#1c0f00' },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}30`, borderRadius: '16px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: `${color}18`, borderRadius: '12px', padding: '12px', flexShrink: 0 }}>
              <Icon style={{ width: '28px', height: '28px', color }} />
            </div>
            <div>
              <div style={{ fontSize: '44px', fontWeight: '800', color: '#f1f5f9', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '14px', color: '#64748b', marginTop: '3px' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {(forgottenCount > 0 || emptyDepts.length > 0) && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          {forgottenCount > 0 && (
            <div style={{ flex: 1, background: '#1c0e00', border: '1px solid #f9731640', borderRadius: '12px', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle style={{ width: '16px', height: '16px', color: '#f97316', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#fb923c', fontWeight: '700' }}>Glömt stämpla ut: </span>
              <span style={{ fontSize: '13px', color: '#fdba74' }}>{clockedInList.filter(e => e.warning).map(e => `${e.name} (${e.hoursIn}h)`).join('  •  ')}</span>
            </div>
          )}
          {emptyDepts.length > 0 && (
            <div style={{ flex: 1, background: '#0e1f3c', border: '1px solid #60a5fa30', borderRadius: '12px', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users style={{ width: '16px', height: '16px', color: '#60a5fa', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#93c5fd', fontWeight: '700' }}>Ingen instämplad: </span>
              <span style={{ fontSize: '13px', color: '#bfdbfe' }}>{emptyDepts.join('  •  ')}</span>
            </div>
          )}
        </div>
      )}

      {/* PAGE 1: Main Dashboard */}
      {page === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1.3fr 0.9fr', gap: '14px', alignItems: 'start' }}>

          {/* Clocked In */}
          <div style={CARD}>
            <CardHeader icon={<PlayCircle style={{ width: '18px', height: '18px', color: '#22c55e' }} />} label="Instämplade just nu" badge={clockedInList.length} />
            <AutoScroll height={548}>
              <div style={{ padding: '12px' }}>
                {clockedInList.length === 0
                  ? <div style={{ textAlign: 'center', color: '#475569', padding: '60px 0', fontSize: '16px' }}>Ingen instämplad just nu</div>
                  : clockedInList.map((e, i) => {
                      const dc = DEPT_COLORS[e.department] || '#94a3b8';
                      return (
                        <div key={i} style={{ background: e.warning ? '#1c0e0088' : '#0f1a2e', border: `1px solid ${e.warning ? '#f9731650' : '#1e3a5f'}`, borderLeft: `4px solid ${dc}`, borderRadius: '12px', padding: '11px 13px', marginBottom: '7px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                <PulsingDot color="#22c55e" size={8} />
                                <span style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>{e.name}</span>
                              </div>
                              <span style={{ fontSize: '11px', color: dc, fontWeight: '600', background: `${dc}18`, borderRadius: '5px', padding: '1px 7px', marginLeft: '16px' }}>{e.department}</span>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Briefcase style={{ width: '11px', height: '11px' }} />{e.project}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                              <div style={{ fontSize: '20px', fontWeight: '800', color: e.warning ? '#f97316' : '#f1f5f9' }}>{e.durationText}</div>
                              <div style={{ fontSize: '12px', color: '#475569' }}>sedan {e.clockInTime}</div>
                              {e.warning && <div style={{ fontSize: '11px', color: '#f97316', fontWeight: '700' }}>⚠ Länge inne!</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </AutoScroll>
          </div>

          {/* Active Projects - top 10 by hours, static */}
          <div style={CARD}>
            <CardHeader icon={<Briefcase style={{ width: '18px', height: '18px', color: '#c084fc' }} />} label="Senaste 10 projekt" badge={recentProjects.length} badgeColor="#c084fc" />
            <div style={{ padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 4px 6px 4px' }}>Senaste aktivitet • mest timmar</div>
              {recentProjects.length === 0
                ? <div style={{ textAlign: 'center', color: '#475569', padding: '60px 0', fontSize: '16px' }}>Inga aktiva projekt</div>
                : recentProjects.map((p, i) => (
                    <div key={p.id} style={{ background: '#0f1a2e', border: '1px solid #1e3a5f', borderLeft: `4px solid ${i === 0 ? '#c084fc' : i === 1 ? '#a78bfa' : '#475569'}`, borderRadius: '12px', padding: '11px 14px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {p.lastActivity ? `Senaste: ${format(parseISO(p.lastActivity), 'd MMM', { locale: sv })}` : p.project_code}
                          {p.activeNow > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22c55e', fontWeight: '700' }}>
                              <PulsingDot color="#22c55e" size={6} /> aktiv nu
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#c084fc' }}>{p.hours.toFixed(0)}h</div>
                        <div style={{ fontSize: '10px', color: '#60a5fa' }}>v.{p.weekHours.toFixed(0)}h denna vecka</div>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Employee Time + Mini bar charts */}
          <div style={CARD}>
            <CardHeader icon={<TrendingUp style={{ width: '18px', height: '18px', color: '#60a5fa' }} />} label={`Personalens timmar – v.${format(now, 'w')}`} />
            <div style={{ padding: '8px 16px 4px', display: 'grid', gridTemplateColumns: '148px 1fr 76px 70px', gap: '6px', fontSize: '10px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <div>Medarbetare</div>
              <div style={{ paddingLeft: '4px' }}>Mån – Sön</div>
              <div style={{ textAlign: 'center' }}>Vecka</div>
              <div style={{ textAlign: 'center' }}>Månad</div>
            </div>
            <AutoScroll height={516}>
              <div style={{ padding: '4px 16px 12px' }}>
                {employeeSummary.map((emp, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '148px 1fr 76px 70px', gap: '6px',
                    alignItems: 'center',
                    background: i % 2 === 0 ? '#0f1a2e' : 'transparent',
                    borderRadius: '10px', padding: '7px 10px', marginBottom: '2px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      {emp.isActive ? <PulsingDot color="#22c55e" size={8} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#253346', display: 'inline-block', flexShrink: 0 }} />}
                      <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</span>
                    </div>
                    {/* Mini bar chart */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '28px', paddingLeft: '4px' }}>
                      {emp.dayHours.map((h, di) => {
                        const isT = format(weekDays[di], 'yyyy-MM-dd') === today;
                        const barH = h > 0 ? Math.max(4, (h / 10) * 26) : 2;
                        return (
                          <div key={di} title={`${h.toFixed(1)}h`} style={{
                            width: '11px', height: `${barH}px`,
                            background: h >= 8 ? '#22c55e' : h >= 6 ? '#60a5fa' : h > 0 ? '#f59e0b' : '#253346',
                            borderRadius: '2px 2px 0 0',
                            outline: isT ? '1.5px solid #60a5fa' : 'none',
                          }} />
                        );
                      })}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '15px', fontWeight: '700', color: emp.weekHours >= 40 ? '#22c55e' : '#f1f5f9' }}>
                      {emp.weekHours.toFixed(0)}h
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#c084fc' }}>
                      {emp.monthHours.toFixed(0)}h
                    </div>
                  </div>
                ))}
                {employeeSummary.length === 0 && <div style={{ textAlign: 'center', color: '#475569', padding: '40px 0', fontSize: '16px' }}>Inga data denna vecka</div>}
              </div>
            </AutoScroll>
          </div>

          {/* Monthly Ranking */}
          <div style={CARD}>
            <CardHeader
              icon={<Trophy style={{ width: '18px', height: '18px', color: '#f472b6' }} />}
              label="Månadsranking"
              extra={<span style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b', textTransform: 'capitalize' }}>{format(now, 'MMMM', { locale: sv })}</span>}
            />
            <AutoScroll height={548}>
              <div style={{ padding: '12px 14px' }}>
                {employeeMonthSummary.length === 0
                  ? <div style={{ textAlign: 'center', color: '#475569', padding: '60px 0', fontSize: '16px' }}>Inga timmar</div>
                  : employeeMonthSummary.map((emp, i) => {
                      const pct = (emp.totalMonthHours / (employeeMonthSummary[0]?.totalMonthHours || 1)) * 100;
                      const barColor = i === 0 ? '#f472b6' : i === 1 ? '#c084fc' : '#60a5fa';
                      return (
                        <div key={i} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: i < 3 ? '18px' : '12px', width: '24px', textAlign: 'center', flexShrink: 0, color: '#475569', fontWeight: '700' }}>
                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                              </span>
                              <span style={{ fontSize: '15px', color: '#e2e8f0', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</span>
                            </div>
                            <span style={{ fontSize: '17px', fontWeight: '800', color: barColor, marginLeft: '8px', flexShrink: 0 }}>{emp.totalMonthHours.toFixed(0)}h</span>
                          </div>
                          <div style={{ height: '7px', background: '#0f1a2e', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, background: barColor, boxShadow: `0 0 6px ${barColor}60` }} />
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </AutoScroll>
          </div>
        </div>
      )}

      {/* PAGE 2: Vehicles, Absences, News & Events */}
      {page === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', alignItems: 'start' }}>

          {/* Vehicles */}
          <div style={CARD}>
            <CardHeader icon={<Car style={{ width: '18px', height: '18px', color: '#38bdf8' }} />} label="Fordonsöversikt" badge={vehicles.length} badgeColor="#38bdf8" />
            <AutoScroll height={590}>
              <div style={{ padding: '12px' }}>
                {vehicles.length === 0
                  ? <div style={{ textAlign: 'center', color: '#475569', padding: '60px 0', fontSize: '16px' }}>Inga fordon</div>
                  : vehicles.map((v, i) => {
                      const sc = VEHICLE_STATUS_COLORS[v.status] || '#64748b';
                      return (
                        <div key={i} style={{ background: '#0f1a2e', borderLeft: `4px solid ${sc}`, borderRadius: '12px', padding: '12px 15px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>{v.make} {v.model}</div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{v.registration_number}</div>
                            {v.assigned_driver && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>👤 {v.assigned_driver}</div>}
                          </div>
                          <div style={{ background: `${sc}22`, color: sc, borderRadius: '8px', padding: '4px 12px', fontSize: '13px', fontWeight: '700', flexShrink: 0, marginLeft: '12px' }}>
                            {VEHICLE_STATUS_LABELS[v.status] || v.status}
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </AutoScroll>
          </div>

          {/* Absences */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={CARD}>
              <CardHeader icon={<Umbrella style={{ width: '18px', height: '18px', color: '#fb923c' }} />} label="Lediga idag" badge={absentToday.length} badgeColor="#fb923c" />
              <div style={{ padding: '12px', maxHeight: '270px', overflowY: 'auto' }}>
                {absentToday.length === 0
                  ? <div style={{ textAlign: 'center', color: '#475569', padding: '30px 0', fontSize: '15px' }}>Alla är på plats idag 👍</div>
                  : absentToday.map((a, i) => {
                      const dc = DEPT_COLORS[a.department] || '#94a3b8';
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#0f1a2e', borderRadius: '10px', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px' }}>{LEAVE_ICONS[a.type] || '📌'}</span>
                            <div>
                              <div style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>{a.name}</div>
                              <div style={{ fontSize: '11px', color: dc }}>{a.department}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '12px', color: '#94a3b8', background: '#1e293b', borderRadius: '6px', padding: '3px 8px' }}>{a.type}</span>
                        </div>
                      );
                    })
                }
              </div>
            </div>

            <div style={CARD}>
              <CardHeader icon={<Calendar style={{ width: '18px', height: '18px', color: '#a78bfa' }} />} label="Kommande ledigheter (veckan)" />
              <div style={{ padding: '12px', maxHeight: '280px', overflowY: 'auto' }}>
                {upcomingLeaves.length === 0
                  ? <div style={{ textAlign: 'center', color: '#475569', padding: '30px 0', fontSize: '15px' }}>Inga kommande ledigheter</div>
                  : upcomingLeaves.map((l, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#0f1a2e', borderRadius: '10px', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '18px' }}>{LEAVE_ICONS[l.type] || '📌'}</span>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>{l.name}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#a78bfa', fontWeight: '600' }}>
                          {format(parseISO(l.startDate), 'd MMM', { locale: sv })}
                          {l.startDate !== l.endDate && ` – ${format(parseISO(l.endDate), 'd MMM', { locale: sv })}`}
                        </div>
                      </div>
                    ))
                }
              </div>
            </div>
          </div>

          {/* News + Events */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={CARD}>
              <CardHeader icon={<Newspaper style={{ width: '18px', height: '18px', color: '#f472b6' }} />} label="Nyheter" />
              <div style={{ padding: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {displayNews.length === 0
                  ? <div style={{ textAlign: 'center', color: '#475569', padding: '30px 0', fontSize: '15px' }}>Inga nyheter</div>
                  : displayNews.map((n, i) => (
                      <div key={i} style={{ background: '#0f1a2e', borderLeft: `3px solid ${n.is_important ? '#f472b6' : '#334155'}`, borderRadius: '10px', padding: '11px 13px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          {n.is_important && <span style={{ fontSize: '16px', flexShrink: 0 }}>🔔</span>}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', marginBottom: '3px' }}>{n.title}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {n.content?.replace(/<[^>]*>/g, '')}
                            </div>
                            {n.created_date && (
                              <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px' }}>
                                {format(new Date(n.created_date), 'd MMM yyyy', { locale: sv })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                }
              </div>
            </div>

            <div style={CARD}>
              <CardHeader icon={<Activity style={{ width: '18px', height: '18px', color: '#34d399' }} />} label="Kommande händelser" />
              <div style={{ padding: '12px', maxHeight: '270px', overflowY: 'auto' }}>
                {upcomingEvents.length === 0
                  ? <div style={{ textAlign: 'center', color: '#475569', padding: '30px 0', fontSize: '15px' }}>Inga kommande händelser</div>
                  : upcomingEvents.map((e, i) => (
                      <div key={i} style={{ background: '#0f1a2e', borderRadius: '10px', padding: '11px 13px', marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ background: '#34d39918', borderRadius: '10px', padding: '9px 12px', flexShrink: 0, textAlign: 'center', minWidth: '50px' }}>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#34d399', lineHeight: 1 }}>{format(new Date(e.start_time), 'd')}</div>
                          <div style={{ fontSize: '10px', color: '#475569', textTransform: 'capitalize' }}>{format(new Date(e.start_time), 'MMM', { locale: sv })}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', marginBottom: '2px' }}>{e.title}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {format(new Date(e.start_time), 'HH:mm')}{e.location ? ` • ${e.location}` : ''}
                          </div>
                        </div>
                      </div>
                    ))
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#253346' }}>IM Vision • Realtidsdashboard</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1].map(p => (
            <div key={p} style={{ height: '3px', width: page === p ? '36px' : '14px', background: page === p ? '#60a5fa' : '#253346', borderRadius: '99px', transition: 'all 0.4s ease' }} />
          ))}
        </div>
        <span style={{ fontSize: '12px', color: '#253346' }}>{format(now, 'HH:mm:ss')}</span>
      </div>
    </div>
    </div>
  );
}