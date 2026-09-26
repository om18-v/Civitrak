import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, ShieldCheck, HardHat, Trophy, Menu, X, Video, Cpu, LogOut, UserCircle, LayoutDashboard, ClipboardCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CiviTrakLogo } from '../brand/CiviTrakLogo';
import { ThemeToggle } from './ThemeToggle';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentRole, currentUserName, logout } = useApp();

  const homePath = currentRole === 'USER' ? '/citizen' : currentRole === 'AUTHORITY' ? '/authority' : '/contractor';
  const navLinks = currentRole === 'USER'
    ? [
        { name: 'Citizen Portal', path: '/citizen', icon: LayoutDashboard },
        { name: 'Upload & Scan', path: '/upload', icon: Video },
        { name: 'AI Results', path: '/results', icon: Cpu },
        { name: 'GIS Map', path: '/map', icon: MapPin },
        { name: 'Public Ratings', path: '/leaderboard', icon: Trophy },
      ]
    : currentRole === 'AUTHORITY'
      ? [
          { name: 'Authority Control', path: '/authority', icon: ShieldCheck },
          { name: 'GIS Operations', path: '/map', icon: MapPin },
        ]
      : [
          { name: 'Contractor Workbench', path: '/contractor', icon: HardHat },
          { name: 'Work Locations', path: '/map', icon: MapPin },
        ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  const signOut = () => { logout(); navigate('/login'); };

  return (
    <header className="civi-navbar sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[76px] items-center justify-between gap-4">
          <Link to={homePath} className="group flex shrink-0 items-center gap-3" aria-label="Open CiviTrak portal">
            <div className="civi-brand-shell">
              <span className="civi-brand-orbit" />
              <CiviTrakLogo variant="lockup" className="h-full w-full" alt="CiviTrak" />
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              const Icon = link.icon;
              return (
                <Link key={link.path} to={link.path} className={`civi-nav-link ${active ? 'is-active' : ''}`}>
                  <Icon className="h-3.5 w-3.5" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <ThemeToggle compact={false} />
            <div className="civi-user-pill">
              <UserCircle className="h-4 w-4 text-[var(--civi-cyan)]" />
              <div className="min-w-0 text-left">
                <div className="max-w-[145px] truncate text-[10px] font-extrabold">{currentUserName}</div>
                <div className="civi-micro-label">{currentRole === 'USER' ? 'CITIZEN PORTAL' : currentRole === 'AUTHORITY' ? 'AUTHORITY PORTAL' : 'CONTRACTOR PORTAL'}</div>
              </div>
              <button onClick={signOut} title="Sign out" aria-label="Sign out" className="civi-icon-button">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle compact />
            <button onClick={() => setMobileMenuOpen((open) => !open)} className="civi-icon-button" aria-label="Toggle navigation">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="civi-mobile-panel lg:hidden">
          <nav className="mx-auto max-w-[1500px] space-y-1 px-4 py-3 sm:px-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return <Link key={link.path} to={link.path} onClick={() => setMobileMenuOpen(false)} className={`civi-mobile-link ${isActive(link.path) ? 'is-active' : ''}`}><Icon className="h-4 w-4" /><span>{link.name}</span></Link>;
            })}
          </nav>
          <div className="mx-auto flex max-w-[1500px] items-center justify-between border-t border-[var(--civi-line)] px-4 py-4 sm:px-6">
            <div><div className="text-xs font-extrabold">{currentUserName}</div><div className="civi-micro-label">{currentRole} ACCOUNT</div></div>
            <button onClick={() => { setMobileMenuOpen(false); signOut(); }} className="civi-danger-button"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
          </div>
        </div>
      )}
    </header>
  );
};
