import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Search,
  Flame,
  UserCheck,
  CheckCircle2,
  RotateCcw,
  Star,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { WorkOrder, WorkOrderStatus } from '../../types';

export const AuthorityPage: React.FC = () => {
  const navigate = useNavigate();
  const { workOrders, updateWorkOrderStatus, approveRepair, rejectRepair, currentRole, loginAs, ratings } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Stats
  const totalCount = workOrders.length;
  const pendingCount = workOrders.filter(w => w.status === 'SENT' || w.status === 'ACKNOWLEDGED').length;
  const inProgressCount = workOrders.filter(w => w.status === 'IN_PROGRESS').length;
  const completedCount = workOrders.filter(w => w.status === 'COMPLETED').length;
  const escalatedCount = workOrders.filter(w => w.status === 'ESCALATED').length;

  const filteredOrders = workOrders.filter(w => {
    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'PENDING' && (w.status === 'SENT' || w.status === 'ACKNOWLEDGED')) ||
      w.status === filterStatus;
    const matchesSearch =
      w.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.contractor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.defect_label.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const escalatedOrders = workOrders.filter(w => w.is_escalated || w.status === 'ESCALATED');

  const getStatusBadge = (status: WorkOrderStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40';
      case 'IN_PROGRESS':
        return 'bg-blue-950/80 text-[#16C7D9] border-blue-500/40';
      case 'ACKNOWLEDGED':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/40';
      case 'SENT':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'SUBMITTED':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/40';
      case 'REJECTED':
        return 'bg-orange-950/80 text-orange-300 border-orange-500/40';
      case 'ESCALATED':
        return 'bg-red-950/80 text-red-400 border-red-500/50 animate-pulse';
    }
  };

  return (
    <div className="civi-ops-page relative w-full min-h-[calc(100vh-72px)] overflow-hidden bg-[#07131D] text-slate-200 py-10 px-4 sm:px-6 lg:px-8 text-left">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.025] bg-[radial-gradient(#16C7D9_1px,transparent_1px)] [background-size:28px_28px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-[#087EA4]/[0.06] blur-3xl" />
      <div className="relative max-w-7xl mx-auto space-y-8">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#132A35] pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D202B] border border-[#087EA4]/40 text-[#16C7D9] text-xs font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PAGE 06: MUNICIPAL AUTHORITY COMMAND HUB</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Work Order Tracking & SLA Oversight
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Monitor active repair dispatches, enforce contractor SLA deadlines, and audit automated escalations.
            </p>
          </div>

          {/* Role Status or Switcher */}
          <div className="flex items-center gap-3">
            {currentRole !== 'AUTHORITY' && (
              <button
                onClick={() => loginAs('AUTHORITY')}
                className="px-4 py-2 rounded-full bg-[#087EA4] hover:bg-[#076c8c] text-white text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Sign in as Chief Engineer</span>
              </button>
            )}
            <button
              onClick={() => navigate('/contractor')}
              className="px-4 py-2 rounded-full bg-[#0D202B] border border-[#132A35] hover:border-slate-600 text-slate-300 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5"
            >
              Contractor View →
            </button>
          </div>
        </div>

        {/* 5 Stats Strip (Section 25: TOTAL ISSUES, PENDING, IN PROGRESS, COMPLETED, ESCALATED) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-left">
          
          <div className="group p-5 rounded-2xl bg-[#0D202B]/95 border border-[#132A35] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#087EA4]/50 hover:shadow-lg">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
              TOTAL ISSUES
            </span>
            <div className="font-heading text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {totalCount}
            </div>
            <span className="text-xs text-[#16C7D9] font-mono mt-1 block">Active Registry</span>
          </div>

          <div className="group p-5 rounded-2xl bg-[#0D202B]/95 border border-[#132A35] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#087EA4]/50 hover:shadow-lg">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-1">
              PENDING
            </span>
            <div className="font-heading text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
              {pendingCount}
            </div>
            <span className="text-xs text-slate-400 font-mono mt-1 block">Awaiting Dispatch</span>
          </div>

          <div className="group p-5 rounded-2xl bg-[#0D202B]/95 border border-[#132A35] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#087EA4]/50 hover:shadow-lg">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#0EA5C6] font-bold block mb-1">
              IN PROGRESS
            </span>
            <div className="font-heading text-2xl sm:text-3xl font-extrabold text-[#0EA5C6] font-mono">
              {inProgressCount}
            </div>
            <span className="text-xs text-slate-400 font-mono mt-1 block">Field Crews Active</span>
          </div>

          <div className="group p-5 rounded-2xl bg-[#0D202B]/95 border border-[#132A35] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#087EA4]/50 hover:shadow-lg">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-1">
              COMPLETED
            </span>
            <div className="font-heading text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
              {completedCount}
            </div>
            <span className="text-xs text-emerald-500 font-mono mt-1 block">Quality Verified</span>
          </div>

          <div className="group p-5 rounded-2xl bg-red-950/40 border border-red-500/40 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold block mb-1">
              ESCALATED
            </span>
            <div className="font-heading text-2xl sm:text-3xl font-extrabold text-red-400 font-mono">
              {escalatedCount}
            </div>
            <span className="text-xs text-red-300 font-mono mt-1 block">SLA Overrun Breach</span>
          </div>

        </div>

        {/* Clear Escalation Panel (Section 25) */}
        {escalatedOrders.length > 0 && (
          <div className="p-5 sm:p-6 rounded-3xl bg-red-950/30 border border-red-500/50 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-400">
                <Flame className="w-5 h-5 text-red-400" />
                <h3 className="font-heading font-bold text-base text-white">
                  Critical SLA Escalation Alerts ({escalatedOrders.length})
                </h3>
              </div>
              <span className="text-xs font-mono font-bold bg-red-900/60 text-red-300 px-3 py-1 rounded-full border border-red-500/40">
                ACTION REQUIRED BY ZONAL CHIEF
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {escalatedOrders.map(order => (
                <div key={order.id} className="p-4 rounded-2xl bg-[#07131D] border border-red-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-red-400">{order.id}</span>
                    <span className="text-[11px] font-mono text-red-300 bg-red-950 px-2 py-0.5 rounded border border-red-500/40">
                      OVERDUE BY {Math.abs(order.hours_remaining)}h
                    </span>
                  </div>

                  <div>
                    <h4 className="font-heading font-bold text-sm text-white">{order.defect_label}</h4>
                    <p className="text-xs text-slate-400">{order.route} • {order.chainage}</p>
                    <p className="text-xs text-amber-300/90 mt-1 italic">
                      {order.escalation_reason || 'Breached emergency response deadline.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#132A35] flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Contractor: <strong className="text-white">{order.contractor_name}</strong>
                    </span>
                    <button
                      onClick={() => updateWorkOrderStatus(order.id, 'IN_PROGRESS', 'Authority issued expedited notice. Overtime crew assigned.')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Enforce Expedited Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work Order Table & Filter Bar */}
        <div className="bg-[#0D202B]/95 rounded-3xl border border-[#132A35] overflow-hidden shadow-xl space-y-4 p-4 sm:p-6">
          
          {/* Filter Buttons & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {['ALL', 'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'ESCALATED', 'REJECTED'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                    filterStatus === st
                      ? 'bg-[#087EA4] text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-[#132A35]'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search route or order..."
                className="w-full bg-[#07131D] border border-[#132A35] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#087EA4] focus:ring-2 focus:ring-[#087EA4]/20"
              />
            </div>

          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[#132A35] pt-4">
            <span className="text-[11px] text-slate-500 font-mono">
              SHOWING <span className="text-slate-300 font-bold">{filteredOrders.length}</span> OF {totalCount} ORDERS
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[11px] font-semibold text-[#16C7D9] hover:text-white transition-colors"
              >
                Clear search
              </button>
            )}
          </div>

          <div className="mb-5 rounded-2xl border border-[#18323E] bg-[#0B1D28] p-4">
            <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-mono font-bold uppercase tracking-[.14em] text-slate-500">Public accountability feed</div><div className="mt-1 text-sm font-bold text-white">{ratings.length} citizen rating{ratings.length === 1 ? '' : 's'} linked to closed work</div></div><div className="flex items-center gap-2 text-xs text-amber-300"><Star className="h-4 w-4 fill-current" /> Visible on contractor performance records</div></div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#132A35] text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">ORDER ID</th>
                  <th className="py-3 px-3">ROUTE & CHAINAGE</th>
                  <th className="py-3 px-3">DEFECT TYPE</th>
                  <th className="py-3 px-3">CONTRACTOR</th>
                  <th className="py-3 px-3">DEADLINE / SLA</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-3 text-right">MUNICIPAL ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132A35]/60 text-slate-300">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 px-4 text-center">
                      <div className="mx-auto max-w-sm">
                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#07131D] border border-[#132A35]">
                          <Search className="w-4 h-4 text-slate-500" />
                        </div>
                        <p className="font-heading font-bold text-white">No work orders found</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Try a different status filter or search term.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-[#132A35]/40 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-[#16C7D9]">
                      {order.id}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-white">{order.route}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{order.chainage}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-200">{order.defect_label}</div>
                      <span className={`text-[10px] font-mono font-bold ${
                        order.severity === 'CRITICAL' ? 'text-red-400' :
                        order.severity === 'HIGH' ? 'text-amber-400' : 'text-yellow-400'
                      }`}>
                        {order.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="text-white font-medium">{order.contractor_name}</div>
                      <div className="text-[11px] text-slate-400">{order.contractor_area}</div>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <div>{order.deadline}</div>
                      <span className={`text-[10px] ${order.hours_remaining < 0 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                        {order.hours_remaining < 0 ? `Breached (${Math.abs(order.hours_remaining)}h)` : `${order.hours_remaining}h remaining`}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {order.status === 'SUBMITTED' && (<>
                          <button onClick={() => approveRepair(order.id, 'Authority reviewed repair evidence and verified the work.')} className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-500/40 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Approve</button>
                          <button onClick={() => rejectRepair(order.id, 'Repair evidence was insufficient. Rework required before closure.')} className="px-2.5 py-1 rounded-lg bg-orange-950 text-orange-300 hover:bg-orange-900 border border-orange-500/40 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Rework</button>
                        </>)}
                        {order.status !== 'ESCALATED' && order.status !== 'COMPLETED' && order.status !== 'SUBMITTED' && (
                          <button
                            onClick={() => updateWorkOrderStatus(order.id, 'ESCALATED', 'Manual escalation triggered by Municipal Audit inspector.')}
                            className="px-2.5 py-1 rounded-lg bg-red-950 text-red-400 hover:bg-red-900 border border-red-500/40 text-[11px] font-semibold transition-colors"
                          >
                            Escalate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
  );
};
