import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase, Clock, TrendingUp, Users, CheckCircle, AlertTriangle, Calendar, BarChart3, Activity
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, differenceInDays, parseISO
} from "date-fns";
import { sv } from "date-fns/locale";

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

const STATUS_CONFIG = {
  pågående:  { color: '#22c55e', label: 'Pågående' },
  planerat:  { color: '#60a5fa', label: 'Planerat' },
  avslutat:  { color: '#475569', label: 'Avslutat' },
  pausat:    { color: '#f97316', label: 'Pausat' },
};

export default function TVProjectDashboard() {
  const [now, setNow] = useState(new Date());
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / 1920;
      const scaleY = window.innerHeight / 1080;
      const s = Math.min(scaleX, scaleY);
      setScale(s);
      setOffset({
        x: (window.innerWidth - 1920 * s) / 2,
        y: (window.innerHeight - 1080 * s) / 2,
      });
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
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
  const { data: employees = [] } = useQuery({ queryKey: ['tvp-employees'], queryFn: () => base44.entities.Employee.list(), refetchInterval: 120000 });

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
    const budgetPct = p.budget_hours ? Math.min(100, (totalHours / p.budget_hours) * 100) : null;
    const daysLeft = p.end_date ? differenceInDays(parseISO(p.end_date), now) : null;
    const pm = users.find(u => u.email === p.project_manager_email);
    const teamCount = p.team_members?.length || 0;

    return { ...p, totalHours, monthHours, activeNow, budgetPct, daysLeft, pmName: pm?.full_name || p.project_manager_email || '–', teamCount };
  });

  const activeProjects = enrichedProjects.filter(p => p.status === 'pågående').sort((a, b) => b.activeNow - a.activeNow || b.totalHours - a.totalHours);
  const plannedProjects = enrichedProjects.filter(p => p.status === 'planerat').sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
  const pausedProjects = enrichedProjects.filter(p => p.status === 'pausat');

  const totalBudgetHours = activeProjects.reduce((s, p) => s + (p.budget_hours || 0), 0);
  const totalSpentHours = activeProjects.reduce((s, p) => s + p.totalHours, 0);
  const overBudgetProjects = activeProjects.filter(p => p.budgetPct !== null && p.budgetPct >= 90);
  const activeNowTotal = activeEntries.length;
  const upcomingDeadlines = enrichedProjects
    .filter(p => p.daysLeft !== null && p.daysLeft >= 0 && p.daysLeft <= 30 && p.status !== 'avslutat')
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 8);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a1120', position: 'relative' }}>
      <div style={{
        width: '1920px', height: '1080px',
        position: 'absolute',
        top: offset.y,
        left: offset.x,
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
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Projektdashboard</div>
              <div style={{ fontSize: '14px', color: '#64748b', textTransform: 'capitalize', marginTop: '2px' }}>
                {format(now, "EEEE d MMMM yyyy", { locale: sv })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '14px' }}>
          {[
            { label: 'Pågående projekt', value: activeProjects.length, Icon: Activity, color: '#22c55e', bg: '#0d2318' },
            { label: 'Planerade projekt', value: plannedProjects.length, Icon: Calendar, color: '#60a5fa', bg: '#0c1a3a' },
            { label: 'Aktiva nu', value: activeNowTotal, Icon: Users, color: '#f472b6', bg: '#1a0e20' },
            { label: 'Budget utnyttjad', value: totalBudgetHours ? `${Math.round((totalSpentHours / totalBudgetHours) * 100)}%` : '–', Icon: BarChart3, color: '#c084fc', bg: '#160e2e' },
            { label: 'Nära budgettak', value: overBudgetProjects.length, Icon: AlertTriangle, color: '#f97316', bg: '#1c0f00' },
          ].map(({ label, value, Icon, color, bg }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${color}30`, borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ background: `${color}18`, borderRadius: '12px', padding: '10px', flexShrink: 0 }}>
                <Icon style={{ width: '26px', height: '26px', color }} />
              </div>
              <div>
                <div style={{ fontSize: '40px', fontWeight: '800', color: '#f1f5f9', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px', alignItems: 'start' }}>

          {/* Active Projects List */}
          <div style={CARD}>
            <CardHeader icon={<Briefcase style={{ width: '18px', height: '18px', color: '#22c55e' }} />} label="Pågående projekt" badge={activeProjects.length} />
            <div style={{ padding: '6px 14px 4px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 90px', gap: '8px', fontSize: '10px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <div>Projekt / Kund</div>
              <div style={{ textAlign: 'center' }}>Timmar</div>
              <div style={{ textAlign: 'center' }}>Budget</div>
              <div style={{ textAlign: 'center' }}>Team</div>
              <div style={{ textAlign: 'center' }}>Deadline</div>
            </div>
            <AutoScroll height={592}>
              <div style={{ padding: '4px 14px 12px' }}>
                {activeProjects.length === 0
                  ? <div style={{ textAlign: 'center', color: '#475569', padding: '60px 0', fontSize: '16px' }}>Inga pågående projekt</div>
                  : activeProjects.map((p, i) => {
                      const budgetColor = p.budgetPct === null ? '#475569' : p.budgetPct >= 90 ? '#ef4444' : p.budgetPct >= 70 ? '#f97316' : '#22c55e';
                      const daysColor = p.daysLeft === null ? '#475569' : p.daysLeft <= 7 ? '#ef4444' : p.daysLeft <= 14 ? '#f97316' : '#64748b';
                      return (
                        <div key={p.id} style={{
                          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 90px', gap: '8px',
                          alignItems: 'center',
                          background: i % 2 === 0 ? '#0f1a2e' : 'transparent',
                          borderRadius: '10px', padding: '10px 12px', marginBottom: '3px',
                          borderLeft: `3px solid ${p.activeNow > 0 ? '#22c55e' : '#1e3a5f'}`,
                        }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              {p.activeNow > 0 && <PulsingDot color="#22c55e" size={7} />}
                              <span style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px' }}>
                              {p.customer && <span>{p.customer}</span>}
                              <span style={{ color: '#475569' }}>{p.project_code}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#c084fc' }}>{p.totalHours.toFixed(0)}h</div>
                            <div style={{ fontSize: '10px', color: '#60a5fa' }}>+{p.monthHours.toFixed(0)}h denna mån</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            {p.budgetPct !== null ? (
                              <>
                                <div style={{ fontSize: '15px', fontWeight: '700', color: budgetColor }}>{p.budgetPct.toFixed(0)}%</div>
                                <div style={{ height: '5px', background: '#1e293b', borderRadius: '99px', marginTop: '4px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${p.budgetPct}%`, background: budgetColor, borderRadius: '99px' }} />
                                </div>
                              </>
                            ) : <span style={{ fontSize: '13px', color: '#334155' }}>–</span>}
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#60a5fa' }}>{p.teamCount}</div>
                            <div style={{ fontSize: '10px', color: '#475569' }}>pers.</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            {p.end_date ? (
                              <>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: daysColor }}>
                                  {p.daysLeft === 0 ? 'Idag!' : p.daysLeft < 0 ? 'Försenad' : `${p.daysLeft}d kvar`}
                                </div>
                                <div style={{ fontSize: '10px', color: '#334155' }}>
                                  {format(parseISO(p.end_date), 'd MMM', { locale: sv })}
                                </div>
                              </>
                            ) : <span style={{ fontSize: '13px', color: '#334155' }}>–</span>}
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </AutoScroll>
          </div>

          {/* Upcoming Deadlines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={CARD}>
              <CardHeader icon={<Calendar style={{ width: '18px', height: '18px', color: '#f97316' }} />} label="Kommande deadlines" badge={upcomingDeadlines.length} badgeColor="#f97316" />
              <AutoScroll height={330}>
                <div style={{ padding: '12px' }}>
                  {upcomingDeadlines.length === 0
                    ? <div style={{ textAlign: 'center', color: '#475569', padding: '40px 0', fontSize: '15px' }}>Inga deadlines inom 30 dagar</div>
                    : upcomingDeadlines.map((p, i) => {
                        const daysColor = p.daysLeft <= 7 ? '#ef4444' : p.daysLeft <= 14 ? '#f97316' : '#a78bfa';
                        const sc = STATUS_CONFIG[p.status] || { color: '#475569', label: p.status };
                        return (
                          <div key={i} style={{ background: '#0f1a2e', borderLeft: `4px solid ${daysColor}`, borderRadius: '12px', padding: '11px 14px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                              <div style={{ fontSize: '11px', color: sc.color, marginTop: '2px', fontWeight: '600' }}>{sc.label}</div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '18px', fontWeight: '800', color: daysColor }}>
                                {p.daysLeft === 0 ? 'Idag!' : `${p.daysLeft}d`}
                              </div>
                              <div style={{ fontSize: '11px', color: '#475569' }}>
                                {format(parseISO(p.end_date), 'd MMM', { locale: sv })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              </AutoScroll>
            </div>

            {/* Paused Projects */}
            <div style={CARD}>
              <CardHeader icon={<AlertTriangle style={{ width: '18px', height: '18px', color: '#f97316' }} />} label="Pausade projekt" badge={pausedProjects.length} badgeColor="#f97316" />
              <div style={{ padding: '12px' }}>
                {pausedProjects.length === 0
                  ? <div style={{ textAlign: 'center', color: '#475569', padding: '20px 0', fontSize: '14px' }}>Inga pausade projekt</div>
                  : pausedProjects.slice(0, 4).map((p, i) => (
                      <div key={i} style={{ background: '#1c0f00', border: '1px solid #f9731630', borderRadius: '10px', padding: '10px 13px', marginBottom: '7px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          {p.customer && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{p.customer}</div>}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#f97316', marginLeft: '10px', flexShrink: 0 }}>{p.totalHours.toFixed(0)}h</div>
                      </div>
                    ))
                }
              </div>
            </div>
          </div>

          {/* Planned Projects + Over Budget */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={CARD}>
              <CardHeader icon={<CheckCircle style={{ width: '18px', height: '18px', color: '#60a5fa' }} />} label="Planerade projekt" badge={plannedProjects.length} badgeColor="#60a5fa" />
              <AutoScroll height={320}>
                <div style={{ padding: '12px' }}>
                  {plannedProjects.length === 0
                    ? <div style={{ textAlign: 'center', color: '#475569', padding: '40px 0', fontSize: '15px' }}>Inga planerade projekt</div>
                    : plannedProjects.map((p, i) => (
                        <div key={i} style={{ background: '#0f1a2e', borderLeft: '4px solid #60a5fa', borderRadius: '12px', padding: '11px 14px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{p.customer || p.project_code}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {p.start_date && (
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#60a5fa' }}>
                                {format(parseISO(p.start_date), 'd MMM', { locale: sv })}
                              </div>
                            )}
                            {p.budget_hours && <div style={{ fontSize: '11px', color: '#475569' }}>{p.budget_hours}h budget</div>}
                          </div>
                        </div>
                      ))
                  }
                </div>
              </AutoScroll>
            </div>

            {/* Over Budget */}
            <div style={CARD}>
              <CardHeader icon={<TrendingUp style={{ width: '18px', height: '18px', color: '#ef4444' }} />} label="Nära/över budgettak" badge={overBudgetProjects.length} badgeColor="#ef4444" />
              <div style={{ padding: '12px' }}>
                {overBudgetProjects.length === 0
                  ? <div style={{ textAlign: 'center', color: '#475569', padding: '20px 0', fontSize: '14px' }}>Alla projekt inom budget 👍</div>
                  : overBudgetProjects.slice(0, 4).map((p, i) => {
                      const budgetColor = p.budgetPct >= 100 ? '#ef4444' : '#f97316';
                      return (
                        <div key={i} style={{ background: '#1a0a0a', border: `1px solid ${budgetColor}40`, borderRadius: '10px', padding: '10px 13px', marginBottom: '7px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{p.name}</span>
                            <span style={{ fontSize: '15px', fontWeight: '800', color: budgetColor, marginLeft: '10px', flexShrink: 0 }}>{p.budgetPct.toFixed(0)}%</span>
                          </div>
                          <div style={{ height: '6px', background: '#0f1a2e', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(p.budgetPct, 100)}%`, background: budgetColor, borderRadius: '99px', boxShadow: `0 0 6px ${budgetColor}60` }} />
                          </div>
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                            {p.totalHours.toFixed(0)}h av {p.budget_hours}h
                          </div>
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
          <span style={{ fontSize: '12px', color: '#253346' }}>IM Vision • Projektdashboard</span>
          <span style={{ fontSize: '12px', color: '#253346' }}>{format(now, 'HH:mm:ss')}</span>
        </div>
      </div>
    </div>
  );
}