import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ScanLine,
  MapPin,
  ShieldCheck,
  HardHat,
  Trophy,
  Menu,
  X,
  Video,
  Cpu,
  LogOut,
  UserCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentRole, currentUserName, logout } = useApp();

  const navLinks = [
    { name: 'Overview', path: '/' },
    { name: 'Upload & Scan', path: '/upload', icon: Video },
    { name: 'AI Results', path: '/results', icon: Cpu },
    { name: 'GIS Map', path: '/map', icon: MapPin },
    { name: 'Authority Hub', path: '/authority', icon: ShieldCheck, badge: 'Gov' },
    { name: 'Contractor Hub', path: '/contractor', icon: HardHat },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 shadow-[0_1px_12px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[72px] items-center justify-between">

          {/* Logo & Brand */}
          <Link
            to="/"
            className="group flex items-center gap-3 outline-none"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#087EA4] to-[#0D202B] p-[2px] shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#07131D]">
                <ScanLine className="h-5 w-5 text-[#16C7D9] transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>

            <div className="hidden flex-col sm:flex">
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-lg font-bold tracking-tight text-[#07131D]">
                  SMART ROAD
                </span>

                <span className="rounded bg-[#EEF5F8] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#087EA4] ring-1 ring-inset ring-[#087EA4]/15">
                  AI
                </span>
              </div>

              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Traffic Intelligence Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              const Icon = link.icon;

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`group relative flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                    active
                      ? 'bg-[#EEF5F8] text-[#087EA4]'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-[#07131D]'
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`h-3.5 w-3.5 transition-colors ${
                        active
                          ? 'text-[#087EA4]'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                  )}

                  <span>{link.name}</span>

                  {link.badge && (
                    <span className="rounded bg-amber-50 px-1 py-0.5 font-mono text-[8px] font-bold uppercase text-amber-700 ring-1 ring-inset ring-amber-200/70">
                      {link.badge}
                    </span>
                  )}

                  {active && (
                    <span className="absolute bottom-0.5 left-3 right-3 h-[2px] rounded-full bg-[#087EA4]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-2.5 sm:flex">
            {currentRole === 'GUEST' ? (
              <>
                <Link
                  to="/login"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-[#07131D] hover:shadow"
                >
                  Portal Login
                </Link>

                <Link
                  to="/upload"
                  className="group flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#087EA4] to-[#0EA5C6] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Video className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                  <span>Scan Video</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 py-1.5 pl-3 pr-1.5 shadow-sm">
                <UserCircle className="h-4 w-4 text-[#087EA4]" />

                <div className="text-left">
                  <div className="max-w-[120px] truncate text-[11px] font-bold leading-tight text-slate-800">
                    {currentUserName}
                  </div>

                  <div className="font-mono text-[8px] font-semibold uppercase tracking-wide text-slate-400">
                    {currentRole}
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Log out"
                  aria-label="Log out"
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-all hover:bg-slate-50 hover:text-[#07131D]"
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-100 bg-white/98 px-4 pb-5 pt-3 shadow-lg backdrop-blur-xl lg:hidden">
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              const Icon = link.icon;

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm transition-all ${
                    active
                      ? 'bg-[#EEF5F8] font-semibold text-[#087EA4]'
                      : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-[#07131D]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {Icon && (
                      <Icon
                        className={`h-4 w-4 ${
                          active ? 'text-[#087EA4]' : 'text-slate-400'
                        }`}
                      />
                    )}

                    <span>{link.name}</span>
                  </div>

                  {link.badge && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Auth */}
          <div className="mt-4 border-t border-slate-100 pt-4">
            {currentRole === 'GUEST' ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Portal Login
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/upload');
                  }}
                  className="w-full rounded-xl bg-[#087EA4] py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#076C8C] hover:shadow"
                >
                  Upload & Scan Video
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {currentUserName}
                  </div>

                  <div className="mt-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    {currentRole}
                  </div>
                </div>

                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};