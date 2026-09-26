import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Database, Cpu, ArrowUpRight } from 'lucide-react';
import { CiviTrakLogo } from '../brand/CiviTrakLogo';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { currentRole } = useApp();
  const isCitizen = currentRole === 'USER';
  const links = isCitizen
    ? [['/citizen', 'Citizen Case Tracker'], ['/upload', 'Upload & Scan'], ['/processing', 'AI Processing'], ['/results', 'Inspection Results'], ['/map', 'GIS Map'], ['/leaderboard', 'Public Ratings']]
    : currentRole === 'AUTHORITY'
      ? [['/authority', 'Authority Control'], ['/map', 'GIS Operations'], ['/login', 'Portal Access']]
      : [['/contractor', 'Contractor Workbench'], ['/map', 'Work Locations'], ['/login', 'Portal Access']];

  return (
    <footer className="civi-footer">
      <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.3fr_.7fr_.8fr]">
          <div>
            <Link to={isCitizen ? '/citizen' : currentRole === 'AUTHORITY' ? '/authority' : '/contractor'} className="civi-footer-brand">
              <CiviTrakLogo variant="wordmark" className="h-9 w-[170px]" alt="CiviTrak" />
            </Link>
            <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--civi-text-2)]">
              A connected civic intelligence layer that carries road evidence from inspection to verified action — while each portal stays focused on its own responsibilities.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--civi-line)] bg-[var(--civi-surface)] px-3 py-2 text-[9px] font-extrabold uppercase tracking-[.13em] text-[var(--civi-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2F7A4D]" /> {isCitizen ? 'Citizen access isolated' : currentRole === 'AUTHORITY' ? 'Authority access isolated' : 'Contractor access isolated'}
            </div>
          </div>

          <div>
            <div className="civi-kicker">Your portal</div>
            <div className="mt-4 space-y-2">
              {links.map(([path, label]) => <Link key={path} to={path} className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-xs font-bold text-[var(--civi-text-2)] transition hover:border-[var(--civi-line)] hover:bg-[var(--civi-surface)] hover:text-[var(--civi-text)]"><span>{label}</span><ArrowUpRight className="h-3.5 w-3.5 text-[var(--civi-muted)]" /></Link>)}
            </div>
          </div>

          <div>
            <div className="civi-kicker">Platform integrity</div>
            <div className="mt-4 space-y-3">
              <div className="civi-footer-stat"><Cpu className="h-4 w-4 text-[#16C7D9]" /><span>AI road inspection</span></div>
              <div className="civi-footer-stat"><MapPin className="h-4 w-4 text-[#2F7A4D]" /><span>GIS-linked evidence</span></div>
              <div className="civi-footer-stat"><ShieldCheck className="h-4 w-4 text-[#F2B705]" /><span>Role-isolated workspaces</span></div>
              <div className="civi-footer-stat"><Database className="h-4 w-4 text-[#E8541E]" /><span>FastAPI + civic data layer</span></div>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--civi-line)] pt-5 text-[10px] font-semibold text-[var(--civi-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 CiviTrak · Smarter Roads. Safer Cities.</span>
          <span>Evidence → action → repair → verification → accountability</span>
        </div>
      </div>
    </footer>
  );
};
