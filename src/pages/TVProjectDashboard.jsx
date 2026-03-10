import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase, Clock, Users, AlertTriangle, Calendar, BarChart3, Activity, TrendingUp, CheckCircle2, PauseCircle
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, differenceInDays, parseISO
} from "date-fns";
import { sv } from "date-fns/locale";

function PulsingDot({ color = '#22c55e', size = 10 }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: 0.4, animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
      <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'block', boxShadow: `0 0 8px ${color}` }} />
    </span>
  );
}

function AutoScroll({ children, height, speed = 0.35 }) {
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

function SectionHeader({ icon, label, count, color }) {
  return (
    <div style={{
      padding: '16px 20px 12px',
      borderBottom: `1px solid ${color}20`,
      display: 'flex', alignItems: 'center', gap: '10px',
      background: `linear-gradient(90deg, ${color}10, transparent)`
    }}>
      <div style={{ background: `${color}20`, borderRadius: '10px', padding: '8px', display: 'flex' }}>
        {icon}
      </div>
      <span style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.3px' }}>{label}</span>
      {count !== undefined && (
        <div style={{ marginLeft: 'auto', background: `${color}25`, color, borderRadius: '99px', padding: '3px 14px', fontSize: '13px', fontWeight: '800', border: `1px solid ${color}40` }}>
          {count}
        </div>
      )}
    </div>
  );
}

function EmptyState({ emoji, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 0', gap: '10px' }}>
      <span style={{ fontSize: '32px', opacity: 0.5 }}>{emoji}</span>
      <span style={{ fontSize: '14px', color: '#334155', fontWeight: '500' }}>{text}</span>
    </div>
  );
}

function BudgetBar({ pct, color }) {
  return (
    <div style={{ height: '6px', background: '#0f1a2e', borderRadius: '99px', overflow: 'hidden', marginTop: '5px' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '99px', boxShadow: `0 0 8px ${color}80`, transition: 'width 0.6s ease' }} />
    </div>
  );
}

export default function TVProjectDashboard() {
  const [now, setNow] = useState(new Date());
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const update = () => {
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      setScale(s);
      setOffset({ x: (window.innerWidth - 1920 * s) / 2, y: (window.innerHeight - 1080 * s) / 2 });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: projects = [] } = useQuery({ queryKey: ['tvp-projects'], queryFn: () => base44.entities.Project.list(), refetchInterval: 60000 });
  const { data: timeEntries = [] } = useQuery({ queryKey: ['tvp-time'], queryFn: () => base44.entities.TimeEntry.list(), refetchInterval: 30000 });
  const { data: users = [] } = useQuery({ queryKey: ['tvp-users'], queryFn: () => base44.entities.User.list(), refetchInterval: 120000 });

  const activeEntries = timeEntries.filter(e => e.status === 'active');
  const monthEntries = timeEntries.filter(e => e.date >= monthStart && e.date <= monthEnd && e.status !== 'rejected');

  const enrichedProjects = projects.map(p => {
    const getHours = (entries) =>
      entries.filter(e => e.project_allocations?.some(a => a.project_id === p.id) || e.project_id === p.id)
        .reduce((s, e) => {
          const alloc = e.project_allocations?.find(a => a.project_id === p.id);
          return s + (alloc ? alloc.hours : (e.total_hours || 0));
        }, 0);

    const totalHours = getHours(timeEntries.filter(e => e.status !== 'rejected'));
    const monthHours = getHours(monthEntries);
    const activeNow = activeEntries.filter(e =>
      e.project_allocations?.some(a => a.project_id === p.id) || e.project_id === p.id
    ).length;
    const budgetPct = p.budget_hours ? Math.min(110, (totalHours / p.budget_hours) * 100) : null;
    const daysLeft = p.end_date ? differenceInDays(parseISO(p.end_date), now) : null;
    const pm = users.find(u => u.email === p.project_manager_email);
    return { ...p, totalHours, monthHours, activeNow, budgetPct, daysLeft, pmName: pm?.full_name || '–', teamCount: p.team_members?.length || 0 };
  });

  const activeProjects = enrichedProjects.filter(p => p.status === 'pågående').sort((a, b) => b.activeNow - a.activeNow || b.totalHours - a.totalHours);
  const plannedProjects = enrichedProjects.filter(p => p.status === 'planerat').sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
  const pausedProjects = enrichedProjects.filter(p => p.status === 'pausat');
  const upcomingDeadlines = enrichedProjects
    .filter(p => p.daysLeft !== null && p.daysLeft >= 0 && p.daysLeft <= 30 && p.status !== 'avslutat')
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6);
  const overBudgetProjects = activeProjects.filter(p => p.budgetPct !== null && p.budgetPct >= 80);

  const totalBudgetHours = activeProjects.reduce((s, p) => s + (p.budget_hours || 0), 0);
  const totalSpentHours = activeProjects.reduce((s, p) => s + p.totalHours, 0);
  const budgetUsedPct = totalBudgetHours > 0 ? Math.round((totalSpentHours / totalBudgetHours) * 100) : null;

  const kpis = [
    { label: 'Pågående', value: activeProjects.length, Icon: Activity, color: '#22c55e', bg: '#0d231880' },
    { label: 'Planerade', value: plannedProjects.length, Icon: Calendar, color: '#60a5fa', bg: '#0c1a3a80' },
    { label: 'Instämplade nu', value: activeEntries.length, Icon: Users, color: '#f472b6', bg: '#1a0e2080' },
    { label: 'Budget utnyttjad', value: budgetUsedPct !== null ? `${budgetUsedPct}%` : '–', Icon: BarChart3, color: '#c084fc', bg: '#160e2e80' },
    { label: 'Nära budgettak', value: overBudgetProjects.length, Icon: AlertTriangle, color: overBudgetProjects.length > 0 ? '#f97316' : '#475569', bg: overBudgetProjects.length > 0 ? '#1c0f0080' : '#11182080' },
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#060e1a', position: 'relative' }}>
      <div style={{
        width: '1920px', height: '1080px',
        position: 'absolute', top: offset.y, left: offset.x,
        background: 'linear-gradient(135deg, #060e1a 0%, #0d1f3c 50%, #060e1a 100%)',
        color: 'white', fontFamily: '"Inter", system-ui, sans-serif',
        padding: '22px 28px', boxSizing: 'border-box', overflow: 'hidden',
        transformOrigin: 'top left', transform: `scale(${scale})`,
      }}>
        <style>{`
          @keyframes ping { 0%{transform:scale(1);opacity:.4} 75%,100%{transform:scale(2);opacity:0} }
          @keyframes shimmer { 0%{opacity:0.6} 50%{opacity:1} 100%{opacity:0.6} }
        `}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6951895d1643f7057890a865/daf37ea55_LogoLIGGANDE_IMvision_svartkopiaepskopia2.png"
              alt="IM Vision"
              style={{ height: '40px', filter: 'brightness(0) invert(1)', objectFit: 'contain' }}
            />
            <div style={{ width: '1px', height: '40px', background: 'linear-gradient(180deg, transparent, #334155, transparent)' }} />
            <div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.5px' }}>
                Projektdashboard
              </div>
              <div style={{ fontSize: '13px', color: '#475569', textTransform: 'capitalize', marginTop: '1px' }}>
                {format(now, "EEEE d MMMM yyyy", { locale: sv })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0d1f3c', border: '1px solid #22c55e30', borderRadius: '12px', padding: '7px 16px' }}>
              <PulsingDot color="#22c55e" size={8} />
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Live</span>
            </div>
            <div style={{ fontSize: '52px', fontWeight: '800', letterSpacing: '-3px', color: '#f1f5f9', lineHeight: 1, textShadow: '0 0 40px #60a5fa30' }}>
              {format(now, 'HH:mm')}
              <span style={{ fontSize: '28px', color: '#334155' }}>:{format(now, 'ss')}</span>
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '14px' }}>
          {kpis.map(({ label, value, Icon, color, bg }) => (
            <div key={label} style={{
              background: bg,
              border: `1px solid ${color}30`,
              borderRadius: '16px', padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: '14px',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{ background: `${color}20`, borderRadius: '12px', padding: '10px', flexShrink: 0, border: `1px solid ${color}30` }}>
                <Icon style={{ width: '24px', height: '24px', color }} />
              </div>
              <div>
                <div style={{ fontSize: '38px', fontWeight: '900', color: '#f1f5f9', lineHeight: 1, letterSpacing: '-1px' }}>{value}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid: 3 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr', gap: '14px' }}>

          {/* LEFT: Active Projects */}
          <div style={{ background: 'linear-gradient(180deg, #111c2e, #0d1625)', border: '1px solid #1e3a5f', borderRadius: '20px', overflow: 'hidden' }}>
            <SectionHeader
              icon={<Briefcase style={{ width: '16px', height: '16px', color: '#22c55e' }} />}
              label="Pågående projekt"
              count={activeProjects.length}
              color="#22c55e"
            />
            {/* Column headers */}
            <div style={{ padding: '8px 18px 4px', display: 'grid', gridTemplateColumns: '1.8fr 0.8fr 1fr 60px 80px', gap: '8px', fontSize: '10px', color: '#334155', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              <div>Projekt</div>
              <div style={{ textAlign: 'center' }}>Timmar</div>
              <div style={{ textAlign: 'center' }}>Budget</div>
              <div style={{ textAlign: 'center' }}>Team</div>
              <div style={{ textAlign: 'center' }}>Deadline</div>
            </div>
            <AutoScroll height={630}>
              <div style={{ padding: '4px 14px 12px' }}>
                {activeProjects.length === 0
                  ? <EmptyState emoji="📋" text="Inga pågående projekt" />
                  : activeProjects.map((p, i) => {
                      const bc = p.budgetPct === null ? null : p.budgetPct >= 100 ? '#ef4444' : p.budgetPct >= 80 ? '#f97316' : '#22c55e';
                      const dc = p.daysLeft === null ? null : p.daysLeft <= 7 ? '#ef4444' : p.daysLeft <= 14 ? '#f97316' : '#64748b';
                      const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
                      return (
                        <div key={p.id} style={{
                          display: 'grid', gridTemplateColumns: '1.8fr 0.8fr 1fr 60px 80px', gap: '8px',
                          alignItems: 'center', background: rowBg,
                          borderRadius: '12px', padding: '11px 12px', marginBottom: '2px',
                          borderLeft: `3px solid ${p.activeNow > 0 ? '#22c55e' : '#1e3a5f'}`,
                          transition: 'background 0.2s',
                        }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {p.activeNow > 0 && <PulsingDot color="#22c55e" size={7} />}
                              <span style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {p.customer && <span style={{ color: '#60a5fa80' }}>{p.customer}</span>}
                              {p.customer && p.project_code && <span style={{ color: '#253346' }}>•</span>}
                              {p.project_code && <span style={{ color: '#334155' }}>{p.project_code}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#c084fc' }}>{p.totalHours.toFixed(0)}h</div>
                            {p.monthHours > 0 && <div style={{ fontSize: '10px', color: '#475569' }}>+{p.monthHours.toFixed(0)}h mån</div>}
                          </div>
                          <div>
                            {bc ? (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '15px', fontWeight: '800', color: bc }}>{p.budgetPct.toFixed(0)}%</span>
                                  <span style={{ fontSize: '10px', color: '#334155' }}>av {p.budget_hours}h</span>
                                </div>
                                <BudgetBar pct={p.budgetPct} color={bc} />
                              </>
                            ) : <div style={{ textAlign: 'center', fontSize: '13px', color: '#253346' }}>–</div>}
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#60a5fa' }}>{p.teamCount}</div>
                            <div style={{ fontSize: '10px', color: '#334155' }}>pers.</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            {p.daysLeft !== null ? (
                              <>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: dc }}>{p.daysLeft === 0 ? 'Idag!' : p.daysLeft < 0 ? 'Passerad' : `${p.daysLeft}d`}</div>
                                <div style={{ fontSize: '10px', color: '#334155' }}>{format(parseISO(p.end_date), 'd MMM', { locale: sv })}</div>
                              </>
                            ) : <span style={{ fontSize: '13px', color: '#253346' }}>–</span>}
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </AutoScroll>
          </div>

          {/* MIDDLE column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Upcoming Deadlines */}
            <div style={{ background: 'linear-gradient(180deg, #111c2e, #0d1625)', border: '1px solid #1e3a5f', borderRadius: '20px', overflow: 'hidden' }}>
              <SectionHeader
                icon={<Calendar style={{ width: '16px', height: '16px', color: '#f97316' }} />}
                label="Kommande deadlines"
                count={upcomingDeadlines.length}
                color="#f97316"
              />
              <div style={{ padding: '12px' }}>
                {upcomingDeadlines.length === 0
                  ? <EmptyState emoji="✅" text="Inga deadlines de närmaste 30 dagarna" />
                  : upcomingDeadlines.map((p, i) => {
                      const dc = p.daysLeft <= 7 ? '#ef4444' : p.daysLeft <= 14 ? '#f97316' : '#a78bfa';
                      return (
                        <div key={i} style={{
                          background: `${dc}08`, border: `1px solid ${dc}25`,
                          borderLeft: `4px solid ${dc}`, borderRadius: '12px',
                          padding: '11px 14px', marginBottom: '8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px'
                        }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                            {p.customer && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{p.customer}</div>}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '20px', fontWeight: '900', color: dc, letterSpacing: '-0.5px' }}>
                              {p.daysLeft === 0 ? '🔴' : `${p.daysLeft}d`}
                            </div>
                            <div style={{ fontSize: '10px', color: '#475569' }}>{format(parseISO(p.end_date), 'd MMM', { locale: sv })}</div>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>

            {/* Paused Projects */}
            <div style={{ background: 'linear-gradient(180deg, #111c2e, #0d1625)', border: '1px solid #1e3a5f', borderRadius: '20px', overflow: 'hidden', flex: 1 }}>
              <SectionHeader
                icon={<PauseCircle style={{ width: '16px', height: '16px', color: '#f97316' }} />}
                label="Pausade projekt"
                count={pausedProjects.length}
                color="#f97316"
              />
              <div style={{ padding: '12px' }}>
                {pausedProjects.length === 0
                  ? <EmptyState emoji="▶️" text="Inga pausade projekt" />
                  : pausedProjects.slice(0, 4).map((p, i) => (
                      <div key={i} style={{
                        background: '#1c0f0030', border: '1px solid #f9731630',
                        borderRadius: '12px', padding: '11px 14px', marginBottom: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          {p.customer && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{p.customer}</div>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#f97316' }}>{p.totalHours.toFixed(0)}h</div>
                        </div>
                      </div>
                    ))
                }
              </div>
            </div>
          </div>

          {/* RIGHT column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Planned Projects */}
            <div style={{ background: 'linear-gradient(180deg, #111c2e, #0d1625)', border: '1px solid #1e3a5f', borderRadius: '20px', overflow: 'hidden' }}>
              <SectionHeader
                icon={<CheckCircle2 style={{ width: '16px', height: '16px', color: '#60a5fa' }} />}
                label="Planerade projekt"
                count={plannedProjects.length}
                color="#60a5fa"
              />
              <AutoScroll height={310}>
                <div style={{ padding: '12px' }}>
                  {plannedProjects.length === 0
                    ? <EmptyState emoji="📅" text="Inga planerade projekt" />
                    : plannedProjects.map((p, i) => (
                        <div key={i} style={{
                          background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.15)',
                          borderLeft: '4px solid #60a5fa',
                          borderRadius: '12px', padding: '12px 14px', marginBottom: '8px'
                        }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#475569' }}>{p.customer || p.project_code || '–'}</span>
                            <div style={{ textAlign: 'right' }}>
                              {p.start_date && <div style={{ fontSize: '12px', fontWeight: '600', color: '#60a5fa' }}>{format(parseISO(p.start_date), 'd MMM', { locale: sv })}</div>}
                              {p.budget_hours && <div style={{ fontSize: '10px', color: '#334155' }}>{p.budget_hours}h budget</div>}
                            </div>
                          </div>
                        </div>
                      ))
                  }
                </div>
              </AutoScroll>
            </div>

            {/* Over/Near Budget */}
            <div style={{ background: 'linear-gradient(180deg, #111c2e, #0d1625)', border: '1px solid #1e3a5f', borderRadius: '20px', overflow: 'hidden', flex: 1 }}>
              <SectionHeader
                icon={<TrendingUp style={{ width: '16px', height: '16px', color: '#ef4444' }} />}
                label="Nära budgettak"
                count={overBudgetProjects.length}
                color="#ef4444"
              />
              <div style={{ padding: '12px' }}>
                {overBudgetProjects.length === 0
                  ? <EmptyState emoji="💚" text="Alla projekt inom budget" />
                  : overBudgetProjects.slice(0, 5).map((p, i) => {
                      const bc = p.budgetPct >= 100 ? '#ef4444' : '#f97316';
                      return (
                        <div key={i} style={{
                          background: `${bc}08`, border: `1px solid ${bc}25`,
                          borderRadius: '12px', padding: '12px 14px', marginBottom: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                            <span style={{ fontSize: '17px', fontWeight: '900', color: bc, marginLeft: '10px', flexShrink: 0 }}>{p.budgetPct.toFixed(0)}%</span>
                          </div>
                          <BudgetBar pct={p.budgetPct} color={bc} />
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '5px' }}>{p.totalHours.toFixed(0)}h av {p.budget_hours}h</div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1e3a5f' }} />
            <span style={{ fontSize: '12px', color: '#1e3a5f', fontWeight: '500' }}>IM Vision • Projektdashboard</span>
          </div>
          <span style={{ fontSize: '12px', color: '#1e3a5f', fontWeight: '500', fontVariantNumeric: 'tabular-nums' }}>{format(now, 'HH:mm:ss')}</span>
        </div>
      </div>
    </div>
  );
}