import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  HardHat,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  Waves,
  MapPin,
  ScanLine,
  Radar,
  Gauge,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CiviTrakLogo } from '../../components/brand/CiviTrakLogo';
import { ThemeToggle } from '../../components/layout/ThemeToggle';

 type Role = 'USER' | 'AUTHORITY' | 'CONTRACTOR';

const roleCopy: Record<Role, { title: string; description: string; button: string; icon: React.ElementType }> = {
  USER: {
    title: 'Citizen',
    description: 'Report road issues and track what happens next.',
    button: 'Continue as Citizen',
    icon: UserRound,
  },
  AUTHORITY: {
    title: 'Authority',
    description: 'Monitor fleet intelligence and manage verified infrastructure issues.',
    button: 'Enter Authority Portal',
    icon: ShieldCheck,
  },
  CONTRACTOR: {
    title: 'Contractor',
    description: 'Receive assigned work, update repairs and submit field evidence.',
    button: 'Enter Contractor Portal',
    icon: HardHat,
  },
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginAs, contractors } = useApp();
  const [role, setRole] = useState<Role>('USER');
  const [selectedContractorId, setSelectedContractorId] = useState<string>(contractors[0]?.id || 'CON-01');
  const [email, setEmail] = useState('sharma.chief@transport.gov.in');
  const [password, setPassword] = useState('••••••••••••');

  useEffect(() => {
    const selected = roleCopy[role];
    document.title = `CiviTrak — ${selected.title}`;
  }, [role]);

  const handleRoleChange = (nextRole: Role) => {
    setRole(nextRole);
    if (nextRole === 'USER') setEmail('citizen@civitrak.demo');
    if (nextRole === 'AUTHORITY') setEmail('sharma.chief@transport.gov.in');
    if (nextRole === 'CONTRACTOR') setEmail('dispatch@apexhighway.com');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'USER') {
      loginAs('USER');
      navigate('/citizen');
    } else if (role === 'AUTHORITY') {
      loginAs('AUTHORITY');
      navigate('/authority');
    } else {
      loginAs('CONTRACTOR', selectedContractorId);
      navigate('/contractor');
    }
  };

  const RoleIcon = roleCopy[role].icon;

  return (
    <div className="civitrak-entry relative min-h-screen overflow-hidden bg-[#23262B] text-white">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/civitrak-road.mp4"
        autoPlay
        muted
        loop
        playsInline
        poster="/civitrak-road-poster.jpg"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(22,199,217,.16),transparent_32%),linear-gradient(90deg,rgba(7,19,29,.84)_0%,rgba(7,19,29,.58)_42%,rgba(7,19,29,.18)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,19,29,.78)_0%,transparent_42%,rgba(7,19,29,.18)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_42%_52%,rgba(255,255,255,.06),transparent_38%),linear-gradient(180deg,rgba(7,19,29,.14),rgba(7,19,29,.42))]" />
      <div className="civi-grid-overlay absolute inset-0 opacity-25" />
      <div className="civi-scan-beam pointer-events-none z-[1]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 z-[1] hidden lg:block" aria-hidden="true">
        <div className="civi-road-lane absolute left-[7%] top-[51%] h-[24%] w-[46%] -skew-x-[8deg]" />
        <div className="civi-detection-box absolute left-[31%] top-[54%] h-[12%] w-[12%]"><span>POTHOLE · 94%</span></div>
        <div className="civi-detection-box civi-detection-box--orange absolute left-[45%] top-[42%] h-[10%] w-[8%]"><span>ROAD EDGE</span></div>
        <div className="civi-scan-reticle absolute left-[47%] top-[56%]"><span /><span /><span /><span /></div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[2] hidden lg:block" aria-hidden="true">
        <div className="absolute left-[7%] bottom-[7%] rounded-2xl border border-white/15 bg-[#07131D]/45 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[.14em] text-white/80"><ScanLine className="h-3.5 w-3.5 text-[#16C7D9]" /> Live road scan</div>
          <div className="mt-2 grid grid-cols-3 gap-4 text-[9px] text-white/55"><span><b className="block text-white/90">24 FPS</b>FRAME RATE</span><span><b className="block text-white/90">94%</b>VISION CONF.</span><span><b className="block text-white/90">LOCKED</b>GIS STREAM</span></div>
        </div>
        <div className="absolute right-[9%] bottom-[8%] rounded-2xl border border-white/15 bg-[#07131D]/45 px-4 py-3 backdrop-blur-md"><div className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[.14em] text-white/80"><Radar className="h-3.5 w-3.5 text-[#F2B705]" /> Infrastructure scan</div><div className="mt-2 flex items-center gap-2 text-[10px] text-white/55"><Gauge className="h-3.5 w-3.5" /> Surface anomaly sweep active</div></div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[2] hidden lg:block" aria-hidden="true">
        {[
          ['VISION ENGINE ACTIVE', 'Frame inference · live', 'left-[7%] top-[22%]'],
          ['ROAD SURFACE ANALYSIS', 'Roughness profile · linked', 'right-[8%] top-[27%]'],
          ['GIS TELEMETRY LINKED', 'Position stream · verified', 'left-[10%] bottom-[19%]'],
          ['NETWORK HEALTHY', 'Secure civic link · 94%', 'right-[11%] bottom-[16%]'],
        ].map(([title, detail, pos], i) => (
          <div key={title} className={`civi-telemetry-chip absolute ${pos} rounded-2xl px-3.5 py-2.5 text-white/90 ${i % 2 ? 'w-[205px]' : 'w-[190px]'}`}>
            <div className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[.13em]">
              <span className={`h-1.5 w-1.5 rounded-full ${i === 1 ? 'bg-[#F2B705]' : 'bg-[#16C7D9]'}`} />
              {title}
            </div>
            <div className="mt-1 text-[10px] text-white/55">{detail}</div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
        <header className="flex items-center justify-between">
          <div className="civi-login-logo-shell rounded-2xl border border-white/20 bg-white/90 px-3 py-2 shadow-[0_14px_38px_rgba(0,0,0,.22)] backdrop-blur-md">
            <CiviTrakLogo variant="lockup" className="h-12 w-[205px] sm:h-14 sm:w-[225px]" alt="CiviTrak" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle compact={false} />
            <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-[#07131D]/35 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.14em] text-white/80 backdrop-blur-md sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#2F7A4D]" />
            Inspection network ready
            </div>
          </div>
        </header>

        <div className="flex flex-1 items-center py-10 lg:py-14">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-16">
            <section className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#F2B705]/35 bg-[#F2B705]/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#F8D36A] backdrop-blur-md">
                <Waves className="h-3.5 w-3.5" /> Mobile fleet sensing platform
              </div>
              <h1 className="max-w-2xl text-5xl font-extrabold leading-[.96] tracking-[-.045em] sm:text-6xl lg:text-7xl">
                Smarter Roads.<br />
                <span className="text-[#F2B705]">Safer Cities.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/78 sm:text-lg">
                Every bus can become a road sensor. CiviTrak turns journeys into AI-powered infrastructure intelligence — from road evidence to verified repair.
              </p>
              <div className="mt-8 flex flex-wrap gap-2.5 text-xs font-semibold text-white/75">
                {['Fleet vision', 'AI detection', 'GIS intelligence', 'Verified action'].map((item) => (
                  <span key={item} className="rounded-full border border-white/15 bg-white/10 px-3.5 py-2 backdrop-blur-md">{item}</span>
                ))}
              </div>
              <div className="mt-10 hidden items-center gap-8 text-white/65 lg:flex">
                <div><div className="text-[10px] font-bold uppercase tracking-[.16em]">Evidence first</div><div className="mt-1 text-xs">Road imagery → action</div></div>
                <div className="h-8 w-px bg-white/20" />
                <div><div className="text-[10px] font-bold uppercase tracking-[.16em]">Built for cities</div><div className="mt-1 text-xs">Authority + operator workflow</div></div>
              </div>
            </section>

            <section className="civi-login-card civi-card-enter rounded-[30px] border border-white/45 bg-[#EDEAE3]/94 p-5 text-[#23262B] shadow-[0_32px_100px_rgba(0,0,0,.34)] backdrop-blur-2xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#1F3A5F]"><LockKeyhole className="h-3.5 w-3.5" /> Secure access</div>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Enter CiviTrak</h2>
                  <p className="mt-1 text-sm text-slate-500">Choose your role. Every workspace stays connected to the same civic case lifecycle.</p>
                </div>
                <div className="hidden rounded-2xl bg-[#23262B] p-3 text-white sm:block"><MapPin className="h-5 w-5 text-[#F2B705]" /></div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                {(Object.keys(roleCopy) as Role[]).map((item) => {
                  const Icon = roleCopy[item].icon;
                  const active = item === role;
                  return (
                    <button key={item} type="button" onClick={() => handleRoleChange(item)} aria-pressed={active}
                      className={`group rounded-2xl border p-3 text-left transition-all duration-200 ${active ? 'border-[#1F3A5F] bg-[#1F3A5F] text-white shadow-lg' : 'border-[#D8D3C8] bg-white/70 text-slate-600 hover:border-[#1F3A5F]/35 hover:bg-white'}`}>
                      <Icon className={`h-5 w-5 ${active ? 'text-[#F2B705]' : 'text-[#1F3A5F]'}`} />
                      <div className="mt-3 text-[11px] font-extrabold uppercase tracking-[.08em]">{roleCopy[item].title}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl border border-[#1F3A5F]/10 bg-white/65 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F3A5F]/10 text-[#1F3A5F]"><RoleIcon className="h-5 w-5" /></div>
                  <div><div className="text-sm font-extrabold">{roleCopy[role].title} workspace</div><div className="mt-0.5 text-xs text-slate-500">{roleCopy[role].description}</div></div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
                {role === 'CONTRACTOR' && (
                  <div>
                    <label htmlFor="contractor-entity" className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-500">Contractor organization</label>
                    <select id="contractor-entity" value={selectedContractorId} onChange={(e) => setSelectedContractorId(e.target.value)} className="w-full rounded-xl border border-[#D8D3C8] bg-white px-3.5 py-3 text-sm font-semibold outline-none focus:border-[#1F3A5F] focus:ring-2 focus:ring-[#1F3A5F]/10">
                      {contractors.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.assigned_area})</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label htmlFor="portal-email" className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-500">Email</label>
                  <input id="portal-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="w-full rounded-xl border border-[#D8D3C8] bg-white px-3.5 py-3 text-sm outline-none focus:border-[#1F3A5F] focus:ring-2 focus:ring-[#1F3A5F]/10" />
                </div>
                <div>
                  <label htmlFor="portal-password" className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-500">Password</label>
                  <input id="portal-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="w-full rounded-xl border border-[#D8D3C8] bg-white px-3.5 py-3 text-sm outline-none focus:border-[#1F3A5F] focus:ring-2 focus:ring-[#1F3A5F]/10" />
                </div>
                <button type="submit" className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1F3A5F] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#172F4D] hover:shadow-xl">
                  {roleCopy[role].button}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </form>

              <div className="mt-5 flex items-start gap-2.5 border-t border-[#D8D3C8] pt-4 text-[11px] leading-5 text-slate-500">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2F7A4D]" />
                <span>Demo access is connected to the existing CiviTrak role flow. Your existing application opens after sign-in.</span>
              </div>
            </section>
          </div>
        </div>

        <footer className="flex flex-col gap-2 border-t border-white/15 pt-4 text-[10px] uppercase tracking-[.14em] text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>CiviTrak • AI-powered public transport fleet & urban road intelligence</span>
          <span>Smarter Roads. Safer Cities.</span>
        </footer>
      </div>
    </div>
  );
};
