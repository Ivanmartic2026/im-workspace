import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, Clock, Briefcase, AlertTriangle, PlayCircle, 
  Calendar, TrendingUp, MapPin, Activity, BarChart3, Trophy
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
         differenceInHours, differenceInMinutes, eachDayOfInterval, isToday } from "date-fns";
import { sv } from "date-fns/locale";

const DEPT_COLORS = {
  'Support & Service': '#38bdf8',
  'Installation': '#4ade80',
  'Sales': '#f472b6',
  'Rental': '#fb923c',
  'Warehouse & Production': '#a78bfa',
  'Management': '#fbbf24',
};

function PulsingDot({ color = '#22c55e', size = 10 }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: color, opacity: 0.4,
        animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite'
      }} />
      <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'block', boxShadow: `0 0 6px ${color}` }} />
      <style>{`@keyframes ping { 0%{transform:scale(1);opacity:.4} 75%,100%{transform:scale(2);opacity:0} }`}</style>
    </span>
  );
}

export default function TVDashboard() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const today = format(now, 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: employees = [] } = useQuery({ queryKey: ['tv-employees'], queryFn: () => base44.entities.Employee.list(), refetchInterval: 60000 });
  const { data: timeEntries = [] } = useQuery({ queryKey: ['tv-time-entries'], queryFn: () => base44.entities.TimeEntry.list(), refetchInterval: 30000 });
  const { data: projects = [] } = useQuery({ queryKey: ['tv-projects'], queryFn: () => base44.entities.Project.list(), refetchInterval: 120000 });
  const { data: users = [] } = useQuery({ queryKey: ['tv-users'], queryFn: () => base44.entities.User.list(), refetchInterval: 120000 });

  const clockedInEntries = timeEntries.filter(e => e.status === 'active');

  const clockedInList = clockedInEntries.map(entry => {
    const user = users.find(u => u.email === entry.employee_email);
    const emp = employees.find(e => e.user_email === entry.employee_email);
    const projId = entry.project_allocations?.[0]?.project_id;
    const proj = projects.find(p => p.id === projId);
    const totalMins = entry.clock_in_time ? differenceInMinutes(now, new Date(entry.clock_in_time)) : 0;
    const hoursIn = Math.floor(totalMins / 60);
    const minsIn = totalMins % 60;
    return {
      name: user?.full_name || entry.employee_email,
      department: emp?.department || '',
      project: proj?.name || '–',
      clockInTime: entry.clock_in_time ? format(new Date(entry.clock_in_time), 'HH:mm') : '–',
      hoursIn,
      minsIn,
      durationText: `${hoursIn}h ${minsIn}m`,
      warning: hoursIn >= 10,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const weekEntries = timeEntries.filter(e => e.date >= weekStart && e.date <= weekEnd);
  const monthEntries = timeEntries.filter(e => e.date >= monthStart && e.date <= monthEnd);

  const employeeSummary = users.map(user => {
    const isActive = clockedInEntries.some(e => e.employee_email === user.email);
    const empWeek = weekEntries.filter(e => e.employee_email === user.email);
    const empMonth = monthEntries.filter(e => e.employee_email === user.email);
    const weekHours = empWeek.filter(e => e.status === 'completed').reduce((s, e) => s + (e.total_hours || 0), 0);
    const monthHours = empMonth.filter(e => e.status === 'completed').reduce((s, e) => s + (e.total_hours || 0), 0);
    const emp = employees.find(e => e.user_email === user.email);
    const todayEntry = timeEntries.find(e => e.employee_email === user.email && e.date === today && e.status === 'completed');
    const todayHours = todayEntry?.total_hours || 0;
    return { name: user.full_name, department: emp?.department || '', isActive, weekHours, monthHours, todayHours };
  }).filter(e => e.name && (e.weekHours > 0 || e.isActive)).sort((a, b) => b.weekHours - a.weekHours);

  const activeProjects = projects.filter(p => p.status === 'pågående').map(p => {
    const hours = timeEntries.reduce((s, e) => {
      const a = e.project_allocations?.find(a => a.project_id === p.id);
      return s + (a?.hours || 0);
    }, 0);
    const activeNow = clockedInEntries.filter(e => e.project_allocations?.some(a => a.project_id === p.id)).length;
    const budgetPct = p.budget_hours ? Math.min(100, (hours / p.budget_hours) * 100) : null;
    return { ...p, hours, activeNow, budgetPct };
  }).sort((a, b) => b.activeNow - a.activeNow || b.hours - a.hours);

  const employeeMonthSummary = users.map(user => {
    const empEntries = monthEntries.filter(e => e.employee_email === user.email && e.status === 'completed');
    const totalMonthHours = empEntries.reduce((s, e) => s + (e.total_hours || 0), 0);
    const emp = employees.find(e => e.user_email === user.email);
    return { name: user.full_name, department: emp?.department || '', totalMonthHours };
  }).filter(e => e.name && e.totalMonthHours > 0).sort((a, b) => b.totalMonthHours - a.totalMonthHours);

  const totalWeekHours = weekEntries.filter(e => e.status === 'completed').reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalMonthHours = monthEntries.filter(e => e.status === 'completed').reduce((s, e) => s + (e.total_hours || 0), 0);
  const forgottenCount = clockedInList.filter(e => e.warning).length;

  const card = (children, style = {}) => (
    <div style={{ background: '#1e293b', borderRadius: '20px', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );

  const cardHeader = (icon, label, badge, badgeColor = '#22c55e', extra) => (
    <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #253346', display: 'flex', alignItems: 'center', gap: '12px' }}>
      {icon}
      <span style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9' }}>{label}</span>
      {badge !== undefined && (
        <span style={{ marginLeft: 'auto', background: `${badgeColor}22`, color: badgeColor, borderRadius: '99px', padding: '3px 14px', fontSize: '15px', fontWeight: '700' }}>
          {badge}
        </span>
      )}
      {extra}
    </div>
  );

  return (
    <div style={{ width: '1920px', minHeight: '1080px', background: '#0a1120', color: 'white', fontFamily: '"Inter", system-ui, sans-serif', padding: '28px 32px', boxSizing: 'border-box', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6951895d1643f7057890a865/daf37ea55_LogoLIGGANDE_IMvision_svartkopiaepskopia2.png"
            alt="IM Vision"
            style={{ height: '44px', filter: 'brightness(0) invert(1)', objectFit: 'contain' }}
          />
          <div style={{ width: '1px', height: '44px', background: '#253346' }} />
          <div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Realtidsdashboard</div>
            <div style={{ fontSize: '15px', color: '#64748b', textTransform: 'capitalize', marginTop: '2px' }}>
              {format(now, "EEEE d MMMM yyyy", { locale: sv })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', borderRadius: '12px', padding: '8px 16px' }}>
            <PulsingDot color="#22c55e" size={8} />
            <span style={{ fontSize: '13px', color: '#64748b' }}>Live • uppdateras var 30s</span>
          </div>
          <div style={{ fontSize: '58px', fontWeight: '800', letterSpacing: '-3px', color: '#f1f5f9', lineHeight: 1 }}>
            {format(now, 'HH:mm')}
            <span style={{ fontSize: '32px', color: '#475569', letterSpacing: '-1px' }}>:{format(now, 'ss')}</span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'Instämplade nu', value: clockedInList.length, icon: PlayCircle, color: '#22c55e', bg: '#0d2318' },
          { label: 'Timmar denna vecka', value: totalWeekHours.toFixed(0) + 'h', icon: Clock, color: '#60a5fa', bg: '#0c1a3a' },
          { label: 'Timmar denna månad', value: totalMonthHours.toFixed(0) + 'h', icon: Calendar, color: '#c084fc', bg: '#160e2e' },
          { label: 'Glömda utstämplingar', value: forgottenCount, icon: AlertTriangle, color: forgottenCount > 0 ? '#f97316' : '#475569', bg: forgottenCount > 0 ? '#1c0e00' : '#111827' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}30`, borderRadius: '18px', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: `${color}18`, borderRadius: '14px', padding: '14px', flexShrink: 0 }}>
              <Icon style={{ width: '32px', height: '32px', color }} />
            </div>
            <div>
              <div style={{ fontSize: '48px', fontWeight: '800', color: '#f1f5f9', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '15px', color: '#64748b', marginTop: '4px' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Warning names for forgotten */}
      {forgottenCount > 0 && (
        <div style={{ background: '#1c0e00', border: '1px solid #f9731640', borderRadius: '14px', padding: '12px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle style={{ width: '20px', height: '20px', color: '#f97316', flexShrink: 0 }} />
          <span style={{ fontSize: '15px', color: '#fb923c', fontWeight: '600' }}>Glömt stämpla ut: </span>
          <span style={{ fontSize: '15px', color: '#fdba74' }}>
            {clockedInList.filter(e => e.warning).map(e => `${e.name} (${e.hoursIn}h inne)`).join('  •  ')}
          </span>
        </div>
      )}

      {/* Main Grid: 4 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1.2fr 0.9fr', gap: '16px', alignItems: 'start' }}>

        {/* Column 1: Clocked In */}
        {card(<>
          {cardHeader(<PlayCircle style={{ width: '20px', height: '20px', color: '#22c55e' }} />, 'Instämplade just nu', clockedInList.length, '#22c55e')}
          <div style={{ padding: '14px', maxHeight: '580px', overflowY: 'auto' }}>
            {clockedInList.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#475569', padding: '60px 0', fontSize: '16px' }}>Ingen instämplad just nu</div>
            ) : clockedInList.map((e, i) => {
              const deptColor = DEPT_COLORS[e.department] || '#94a3b8';
              return (
                <div key={i} style={{
                  background: e.warning ? '#1c0e0088' : '#0f1a2e',
                  border: `1px solid ${e.warning ? '#f9731650' : '#1e3a5f'}`,
                  borderLeft: `4px solid ${deptColor}`,
                  borderRadius: '12px', padding: '14px 16px', marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <PulsingDot color="#22c55e" size={9} />
                        <span style={{ fontSize: '17px', fontWeight: '700', color: '#f1f5f9' }}>{e.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '19px' }}>
                        <span style={{ fontSize: '12px', color: deptColor, fontWeight: '600', background: `${deptColor}18`, borderRadius: '6px', padding: '2px 8px' }}>{e.department}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', marginLeft: '19px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Briefcase style={{ width: '12px', height: '12px' }} />
                        {e.project}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: e.warning ? '#f97316' : '#f1f5f9' }}>{e.durationText}</div>
                      <div style={{ fontSize: '13px', color: '#475569' }}>sedan {e.clockInTime}</div>
                      {e.warning && <div style={{ fontSize: '12px', color: '#f97316', fontWeight: '700', marginTop: '2px' }}>⚠ Länge inne!</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

        {/* Column 2: Active Projects */}
        {card(<>
          {cardHeader(<Briefcase style={{ width: '20px', height: '20px', color: '#c084fc' }} />, 'Aktiva projekt')}
          <div style={{ padding: '14px' }}>
            {activeProjects.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#475569', padding: '60px 0', fontSize: '16px' }}>Inga aktiva projekt</div>
            ) : activeProjects.map((p) => (
              <div key={p.id} style={{ background: '#0f1a2e', borderRadius: '14px', padding: '16px 18px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '17px', fontWeight: '700', color: '#f1f5f9', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{p.project_code}{p.customer ? ` • ${p.customer}` : ''}</div>
                    {p.activeNow > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#22c55e', marginTop: '6px' }}>
                        <PulsingDot color="#22c55e" size={8} />
                        {p.activeNow} person{p.activeNow > 1 ? 'er' : ''} aktiv{p.activeNow > 1 ? 'a' : ''} nu
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#f1f5f9', lineHeight: 1 }}>{p.hours.toFixed(0)}h</div>
                    {p.budget_hours && <div style={{ fontSize: '13px', color: '#64748b' }}>av {p.budget_hours}h budget</div>}
                  </div>
                </div>
                {p.budget_hours && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                      <span style={{ color: '#64748b' }}>Budgetförbrukning</span>
                      <span style={{ color: p.budgetPct >= 90 ? '#ef4444' : p.budgetPct >= 70 ? '#f59e0b' : '#22c55e', fontWeight: '700' }}>{p.budgetPct?.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: '12px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '99px',
                        width: `${p.budgetPct}%`,
                        background: p.budgetPct >= 90 ? '#ef4444' : p.budgetPct >= 70 ? '#f59e0b' : '#22c55e',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>)}

        {/* Column 3: Employee Time Overview */}
        {card(<>
          {cardHeader(<TrendingUp style={{ width: '20px', height: '20px', color: '#60a5fa' }} />, 'Tidsöversikt medarbetare')}
          <div style={{ padding: '10px 14px 14px' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr', gap: '8px', padding: '8px 10px', fontSize: '12px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <div>Medarbetare</div>
              <div style={{ textAlign: 'center' }}>Idag</div>
              <div style={{ textAlign: 'center' }}>Vecka</div>
              <div style={{ textAlign: 'center' }}>Månad</div>
            </div>
            <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
              {employeeSummary.map((emp, i) => {
                const deptColor = DEPT_COLORS[emp.department] || '#94a3b8';
                const weekTarget = 40;
                const weekPct = Math.min(100, (emp.weekHours / weekTarget) * 100);
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr', gap: '8px',
                    alignItems: 'center',
                    background: i % 2 === 0 ? '#0f1a2e' : 'transparent',
                    borderRadius: '10px', padding: '10px', marginBottom: '3px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                      {emp.isActive ? <PulsingDot color="#22c55e" size={9} /> : <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#253346', display: 'inline-block', flexShrink: 0 }} />}
                      <span style={{ fontSize: '15px', color: '#e2e8f0', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</span>
                    </div>
                    {/* Today */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: emp.todayHours >= 8 ? '#22c55e' : emp.todayHours > 0 ? '#60a5fa' : '#334155' }}>
                        {emp.todayHours > 0 ? emp.todayHours.toFixed(1) + 'h' : emp.isActive ? '–' : '0h'}
                      </span>
                    </div>
                    {/* Week */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: emp.weekHours >= 40 ? '#22c55e' : '#f1f5f9' }}>
                        {emp.weekHours.toFixed(0)}h
                      </div>
                      <div style={{ height: '4px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden', marginTop: '4px', width: '60px', margin: '4px auto 0' }}>
                        <div style={{ height: '100%', borderRadius: '99px', width: `${weekPct}%`, background: emp.weekHours >= 40 ? '#22c55e' : '#60a5fa' }} />
                      </div>
                    </div>
                    {/* Month */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#c084fc' }}>
                        {emp.monthHours.toFixed(0)}h
                      </span>
                    </div>
                  </div>
                );
              })}
              {employeeSummary.length === 0 && (
                <div style={{ textAlign: 'center', color: '#475569', padding: '40px 0', fontSize: '16px' }}>Inga data denna vecka</div>
              )}
            </div>
          </div>
        </>)}

        {/* Column 4: Monthly Ranking */}
        {card(<>
          {cardHeader(
            <Trophy style={{ width: '20px', height: '20px', color: '#f472b6' }} />,
            'Månadsranking',
            undefined, undefined,
            <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#64748b', textTransform: 'capitalize' }}>
              {format(now, 'MMMM', { locale: sv })}
            </span>
          )}
          <div style={{ padding: '14px 16px', maxHeight: '580px', overflowY: 'auto' }}>
            {employeeMonthSummary.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#475569', padding: '60px 0', fontSize: '16px' }}>Inga timmar denna månad</div>
            ) : employeeMonthSummary.map((emp, i) => {
              const maxH = employeeMonthSummary[0]?.totalMonthHours || 1;
              const pct = (emp.totalMonthHours / maxH) * 100;
              const medalColors = ['#f59e0b', '#94a3b8', '#cd7c3a'];
              const barColor = i === 0 ? '#f472b6' : i === 1 ? '#c084fc' : '#60a5fa';
              return (
                <div key={i} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <span style={{
                        fontSize: i < 3 ? '20px' : '14px', fontWeight: '800',
                        color: i < 3 ? medalColors[i] : '#475569',
                        width: '26px', flexShrink: 0, textAlign: 'center'
                      }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </span>
                      <span style={{ fontSize: '16px', color: '#e2e8f0', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</span>
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: barColor, marginLeft: '10px', flexShrink: 0 }}>{emp.totalMonthHours.toFixed(0)}h</span>
                  </div>
                  <div style={{ height: '8px', background: '#0f1a2e', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, background: barColor, transition: 'width 0.5s ease', boxShadow: `0 0 8px ${barColor}80` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

      </div>

      {/* Footer */}
      <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '12px', color: '#253346' }}>
        IM Vision • Realtidsdashboard • {format(now, 'HH:mm:ss')}
      </div>
    </div>
  );
}