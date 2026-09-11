import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, HardHat, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginAs, contractors } = useApp();

  const [role, setRole] = useState<'AUTHORITY' | 'CONTRACTOR'>('AUTHORITY');
  const [selectedContractorId, setSelectedContractorId] = useState<string>(contractors[0]?.id || 'CON-01');
  const [email, setEmail] = useState<string>('sharma.chief@transport.gov.in');
  const [password, setPassword] = useState<string>('••••••••••••');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'AUTHORITY') {
      loginAs('AUTHORITY');
      navigate('/authority');
    } else {
      loginAs('CONTRACTOR', selectedContractorId);
      navigate('/contractor');
    }
  };

  const handleRoleChange = (nextRole: 'AUTHORITY' | 'CONTRACTOR') => {
    setRole(nextRole);
    setEmail(
      nextRole === 'AUTHORITY'
        ? 'sharma.chief@transport.gov.in'
        : 'dispatch@apexhighway.com'
    );
  };

  return (
    <div className="relative flex min-h-[calc(100vh-72px)] w-full items-center justify-center overflow-hidden bg-[#F7FAFC] px-4 py-12 text-left sm:px-6 lg:px-8">
      {/* Subtle portal ambience */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:radial-gradient(#087EA4_1px,transparent_1px)] [background-size:28px_28px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-[#16C7D9]/[0.055] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 bottom-0 h-[360px] w-[360px] rounded-full bg-[#087EA4]/[0.035] blur-3xl"
      />

      <div className="relative w-full max-w-md space-y-7">
        {/* Brand Header */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#087EA4]/20 bg-[#EEF5F8] px-3.5 py-1 text-xs font-bold font-mono text-[#087EA4]">
            <Lock className="h-3.5 w-3.5" />
            <span>SECURE COMMAND PORTAL</span>
          </div>
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[#07131D] sm:text-4xl">
              Municipal Access Gate
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
              Sign in as Municipal Road Authority or Field Maintenance Contractor
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="space-y-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_20px_60px_-28px_rgba(7,19,29,0.28)] sm:p-8">
          {/* Role Toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1.5">
            <button
              type="button"
              aria-pressed={role === 'AUTHORITY'}
              onClick={() => handleRoleChange('AUTHORITY')}
              className={`group flex items-center justify-center gap-2 rounded-xl py-2.5 font-heading text-xs font-bold transition-all duration-200 ${
                role === 'AUTHORITY'
                  ? 'bg-[#07131D] text-white shadow-md'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className={`h-3.5 w-3.5 ${role === 'AUTHORITY' ? 'text-[#16C7D9]' : 'text-slate-400'}`} />
              <span>AUTHORITY</span>
            </button>

            <button
              type="button"
              aria-pressed={role === 'CONTRACTOR'}
              onClick={() => handleRoleChange('CONTRACTOR')}
              className={`group flex items-center justify-center gap-2 rounded-xl py-2.5 font-heading text-xs font-bold transition-all duration-200 ${
                role === 'CONTRACTOR'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
              }`}
            >
              <HardHat className={`h-3.5 w-3.5 ${role === 'CONTRACTOR' ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>CONTRACTOR</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {role === 'CONTRACTOR' && (
              <div className="space-y-1.5">
                <label htmlFor="contractor-entity" className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-600">
                  Select Contractor Entity
                </label>
                <select
                  id="contractor-entity"
                  value={selectedContractorId}
                  onChange={e => setSelectedContractorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
                >
                  {contractors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.assigned_area})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="portal-email" className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-600">
                Official Government / Corporate Email
              </label>
              <input
                id="portal-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#087EA4] focus:ring-2 focus:ring-[#087EA4]/15"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="portal-password" className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-600">
                Password / Digital Signature Token
              </label>
              <input
                id="portal-password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#087EA4] focus:ring-2 focus:ring-[#087EA4]/15"
              />
            </div>

            <button
              type="submit"
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 ${
                role === 'AUTHORITY'
                  ? 'bg-gradient-to-r from-[#087EA4] to-[#16C7D9] text-white hover:from-[#076c8c] hover:to-[#087EA4]'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-600 hover:to-orange-600'
              }`}
            >
              <span>SIGN IN TO {role} PORTAL</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </form>

          {/* Demo Access Note */}
          <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-600">Demo Mode Active</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                Click Sign In to enter the selected portal without credentials.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Municipal Road Intelligence Platform • Secure Access
        </p>
      </div>
    </div>
  );
};
