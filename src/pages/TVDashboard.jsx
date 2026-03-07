import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, Clock, Briefcase, AlertTriangle, PlayCircle, 
  Calendar, TrendingUp, MapPin, Activity, BarChart3
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
         differenceInHours, eachDayOfInterval, isToday } from "date-fns";
import { sv } from "date-fns/locale";

export default function TVDashboard() {
  const [now, setNow] = useState(new Date());

  // Tick clock every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const today = format(now, 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: employees = [] } = useQuery({
    queryKey: ['tv-employees'],
    queryFn: () => base44.entities.Employee.list(),
    refetchInterval: 60000,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['tv-time-entries'],
    queryFn: () => base44.entities.TimeEntry.list(),
    refetchInterval: 30000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['tv-projects'],
    queryFn: () => base44.entities.Project.list(),
    refetchInterval: 120000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['tv-users'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 120000,
  });

  // Currently clocked in
  const clockedInEntries = timeEntries.filter(e => e.status === 'active');
  const clockedInList = clockedInEntries.map(entry => {
    const user = users.find(u => u.email === entry.employee_email);
    const emp = employees.find(e => e.user_email === entry.employee_email);
    const projId = entry.project_allocations?.[0]?.project_id;
    const proj = projects.find(p => p.id === projId);
    const hoursIn = entry.clock_in_time ? differenceInHours(now, new Date(entry.clock_in_time)) : 0;
    return {
      name: user?.full_name || entry.employee_email,
      department: emp?.department || '',
      project: proj?.name || '–',
      clockInTime: entry.clock_in_time ? format(new Date(entry.clock_in_time), 'HH:mm') : '–',
      hoursIn,
      warning: hoursIn >= 10,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Week entries
  const weekEntries = timeEntries.filter(e => e.date >= weekStart && e.date <= weekEnd);
  const monthEntries = timeEntries.filter(e => e.date >= monthStart && e.date <= monthEnd);

  const weekDays = eachDayOfInterval({
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 })
  });

  // Per-employee week summary
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

  // Active projects
  const activeProjects = projects.filter(p => p.status === 'pågående').map(p => {
    const hours = timeEntries.reduce((s, e) => {
      const a = e.project_allocations?.find(a => a.project_id === p.id);
      return s + (a?.hours || 0);
    }, 0);
    const activeNow = clockedInEntries.filter(e => e.project_allocations?.some(a => a.project_id === p.id)).length;
    const budgetPct = p.budget_hours ? Math.min(100, (hours / p.budget_hours) * 100) : null;
    return { ...p, hours, activeNow, budgetPct };
  }).sort((a, b) => b.activeNow - a.activeNow || b.hours - a.hours);

  // Monthly summary per employee
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const monthEntries = timeEntries.filter(e => e.date >= monthStart && e.date <= monthEnd);
  const employeeMonthSummary = users.map(user => {
    const empEntries = monthEntries.filter(e => e.employee_email === user.email && e.status === 'completed');
    const totalMonthHours = empEntries.reduce((s, e) => s + (e.total_hours || 0), 0);
    const emp = employees.find(e => e.user_email === user.email);
    return { name: user.full_name, department: emp?.department || '', totalMonthHours };
  }).filter(e => e.name && e.totalMonthHours > 0).sort((a, b) => b.totalMonthHours - a.totalMonthHours);

  const totalWeekHours = weekEntries.filter(e => e.status === 'completed').reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalMonthHours = monthEntries.filter(e => e.status === 'completed').reduce((s, e) => s + (e.total_hours || 0), 0);
  const forgottenCount = clockedInList.filter(e => e.warning).length;

  const dayLabels = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

  return (
    <div style={{ width: '1920px', minHeight: '1080px', background: '#0f172a', color: 'white', fontFamily: 'system-ui, sans-serif', padding: '32px', boxSizing: 'border-box', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6951895d1643f7057890a865/daf37ea55_LogoLIGGANDE_IMvision_svartkopiaepskopia2.png"
            alt="IM Vision"
            style={{ height: '40px', filter: 'brightness(0) invert(1)', objectFit: 'contain' }}
          />
          <div style={{ width: '1px', height: '40px', background: '#334155' }} />
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9' }}>Realtidsdashboard</div>
            <div style={{ fontSize: '14px', color: '#64748b', textTransform: 'capitalize' }}>
              {format(now, "EEEE d MMMM yyyy", { locale: sv })}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '52px', fontWeight: '800', letterSpacing: '-2px', color: '#f1f5f9', lineHeight: 1 }}>
            {format(now, 'HH:mm:ss')}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
            <Activity style={{ width: '12px', height: '12px', color: '#22c55e' }} />
            Uppdateras automatiskt var 30s
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Instämplade nu', value: clockedInList.length, icon: PlayCircle, color: '#22c55e', bg: '#052e16' },
          { label: 'Timmar denna vecka', value: totalWeekHours.toFixed(0) + 'h', icon: Clock, color: '#60a5fa', bg: '#0c1a3a' },
          { label: 'Timmar denna månad', value: totalMonthHours.toFixed(0) + 'h', icon: Calendar, color: '#c084fc', bg: '#1a0a2e' },
          { label: 'Glömda utstämplingar', value: forgottenCount, icon: AlertTriangle, color: forgottenCount > 0 ? '#fbbf24' : '#475569', bg: forgottenCount > 0 ? '#1c1100' : '#0f172a' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}22`, borderRadius: '16px', padding: '24px' }}>
            <Icon style={{ width: '28px', height: '28px', color, marginBottom: '12px' }} />
            <div style={{ fontSize: '42px', fontWeight: '800', color: '#f1f5f9', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '6px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Main Grid: 4 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr 0.8fr', gap: '16px', alignItems: 'start' }}>

        {/* Column 1: Clocked In */}
        <div style={{ background: '#1e293b', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PlayCircle style={{ width: '18px', height: '18px', color: '#22c55e' }} />
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>Instämplade just nu</span>
            <span style={{ marginLeft: 'auto', background: '#16a34a22', color: '#22c55e', borderRadius: '99px', padding: '2px 10px', fontSize: '13px', fontWeight: '600' }}>
              {clockedInList.length}
            </span>
          </div>
          <div style={{ padding: '12px', maxHeight: '560px', overflowY: 'auto' }}>
            {clockedInList.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#475569', padding: '40px 0', fontSize: '15px' }}>Ingen instämplad just nu</div>
            ) : clockedInList.map((e, i) => (
              <div key={i} style={{ 
                background: e.warning ? '#1c110066' : '#0f172a', 
                border: `1px solid ${e.warning ? '#fbbf2444' : '#1e293b'}`,
                borderRadius: '12px', padding: '12px 14px', marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>{e.name}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', marginLeft: '16px' }}>{e.department}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Briefcase style={{ width: '11px', height: '11px' }} />
                      {e.project}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9' }}>Kl {e.clockInTime}</div>
                    <div style={{ fontSize: '12px', color: e.warning ? '#fbbf24' : '#64748b', fontWeight: e.warning ? '600' : '400' }}>
                      {e.hoursIn}h inne {e.warning ? '⚠' : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Active Projects */}
        <div style={{ background: '#1e293b', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Briefcase style={{ width: '18px', height: '18px', color: '#c084fc' }} />
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>Aktiva projekt</span>
          </div>
          <div style={{ padding: '12px' }}>
            {activeProjects.map((p, i) => (
              <div key={p.id} style={{ background: '#0f172a', borderRadius: '12px', padding: '14px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{p.project_code}{p.customer ? ` • ${p.customer}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#f1f5f9' }}>{p.hours.toFixed(0)}h</div>
                    {p.budget_hours && <div style={{ fontSize: '11px', color: '#64748b' }}>av {p.budget_hours}h</div>}
                  </div>
                </div>
                {p.budget_hours && (
                  <div style={{ height: '6px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ 
                      height: '100%', 
                      borderRadius: '99px',
                      width: `${p.budgetPct}%`,
                      background: p.budgetPct >= 90 ? '#ef4444' : p.budgetPct >= 70 ? '#f59e0b' : '#22c55e',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                )}
                {p.activeNow > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#22c55e' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
                    {p.activeNow} person{p.activeNow > 1 ? 'er' : ''} aktiv{p.activeNow > 1 ? 'a' : ''} nu
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Weekly + Monthly per employee */}
        <div style={{ background: '#1e293b', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp style={{ width: '18px', height: '18px', color: '#60a5fa' }} />
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>Tidsöversikt medarbetare</span>
          </div>
          {/* Day headers */}
          <div style={{ padding: '10px 14px 0', display: 'grid', gridTemplateColumns: '140px repeat(7,1fr) 50px 60px', gap: '4px', fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
            <div></div>
            {dayLabels.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', color: format(weekDays[i], 'yyyy-MM-dd') === today ? '#60a5fa' : '#64748b' }}>{d}</div>
            ))}
            <div style={{ textAlign: 'center' }}>Vka</div>
            <div style={{ textAlign: 'center' }}>Mån</div>
          </div>
          <div style={{ padding: '6px 14px 14px', maxHeight: '540px', overflowY: 'auto' }}>
            {employeeSummary.map((emp, i) => (
              <div key={emp.email || i} style={{ 
                display: 'grid', gridTemplateColumns: '140px repeat(7,1fr) 50px 60px', gap: '4px', 
                alignItems: 'center', background: i % 2 === 0 ? '#0f172a' : 'transparent',
                borderRadius: '8px', padding: '7px 6px', marginBottom: '2px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: emp.isActive ? '#22c55e' : '#334155', boxShadow: emp.isActive ? '0 0 4px #22c55e' : 'none', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</span>
                </div>
                {emp.dayHours.map((h, di) => (
                  <div key={di} style={{ textAlign: 'center', fontSize: '12px', fontWeight: '600',
                    color: h === 0 ? '#334155' : h >= 8 ? '#22c55e' : h >= 6 ? '#60a5fa' : '#f59e0b'
                  }}>
                    {h > 0 ? h.toFixed(1) : '–'}
                  </div>
                ))}
                <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '700', color: emp.weekHours >= 40 ? '#22c55e' : '#f1f5f9' }}>
                  {emp.weekHours.toFixed(0)}h
                </div>
                <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#c084fc' }}>
                  {emp.monthHours.toFixed(0)}h
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

        {/* Column 4: Monthly per employee */}
        <div style={{ background: '#1e293b', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 style={{ width: '18px', height: '18px', color: '#f472b6' }} />
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>Månadsranking</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b' }}>
              {format(now, 'MMMM', { locale: sv })}
            </span>
          </div>
          <div style={{ padding: '10px 12px 14px', maxHeight: '560px', overflowY: 'auto' }}>
            {employeeMonthSummary.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#475569', padding: '40px 0', fontSize: '14px' }}>Inga timmar denna månad</div>
            ) : employeeMonthSummary.map((emp, i) => {
              const maxH = employeeMonthSummary[0]?.totalMonthHours || 1;
              const pct = (emp.totalMonthHours / maxH) * 100;
              return (
                <div key={i} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '11px', color: '#475569', fontWeight: '700', width: '18px', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#f472b6', marginLeft: '8px', flexShrink: 0 }}>{emp.totalMonthHours.toFixed(0)}h</span>
                  </div>
                  <div style={{ height: '5px', background: '#0f172a', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, background: i === 0 ? '#f472b6' : i === 1 ? '#c084fc' : '#60a5fa', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#334155' }}>
        IM Vision • Realtidsdashboard • Uppdateras automatiskt
      </div>
    </div>
  );
}