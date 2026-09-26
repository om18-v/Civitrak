import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HardHat, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Wrench, 
  ThumbsUp 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { WorkOrder, WorkOrderStatus } from '../../types';

export const ContractorPage: React.FC = () => {
  const navigate = useNavigate();
  const { workOrders, updateWorkOrderStatus, submitRepairForReview, contractors, loginAs, currentUserId } = useApp();

  const [selectedContractorId, setSelectedContractorId] = useState<string>(currentUserId?.startsWith('CON-') ? currentUserId : contractors[0]?.id || 'CON-01');

  useEffect(() => {
    if (currentUserId?.startsWith('CON-') && contractors.some((contractor) => contractor.id === currentUserId)) {
      setSelectedContractorId(currentUserId);
    } else if (!contractors.some((contractor) => contractor.id === selectedContractorId) && contractors[0]) {
      setSelectedContractorId(contractors[0].id);
    }
  }, [currentUserId, contractors, selectedContractorId]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  // Filter orders for selected contractor
  const myOrders = workOrders.filter(w => w.assigned_contractor_id === selectedContractorId);
  const activeOrders = myOrders.filter(w => w.status !== 'COMPLETED');
  const completedOrders = myOrders.filter(w => w.status === 'COMPLETED');

  const displayedOrders = activeTab === 'ACTIVE' ? activeOrders : activeTab === 'COMPLETED' ? completedOrders : myOrders;

  const currentContractor = contractors.find(c => c.id === selectedContractorId) || contractors[0];

  const handleStatusTransition = (order: WorkOrder, nextStatus: WorkOrderStatus) => {
    let defaultNote = '';
    if (nextStatus === 'ACKNOWLEDGED') {
      defaultNote = 'Site supervisor acknowledged order. Field material and crew allocated.';
    } else if (nextStatus === 'IN_PROGRESS') {
      defaultNote = 'Safety barricades deployed. Pavement repair and resurfacing in progress.';
    } else if (nextStatus === 'SUBMITTED') {
      defaultNote = 'Repair completed. Before/after evidence submitted to municipal authority for verification.';
    }
    updateWorkOrderStatus(order.id, nextStatus, defaultNote);
  };

  const getTimelineSteps = (order: WorkOrder) => {
    const stages: WorkOrderStatus[] = ['SENT', 'ACKNOWLEDGED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'];
    const currentIdx = stages.indexOf(order.status);
    return stages.map((st, i) => {
      const isPast = order.status === 'COMPLETED' || currentIdx >= i;
      const isCurrent = order.status === st;
      return { stage: st, isPast, isCurrent };
    });
  };

  return (
    <div className="civi-ops-page relative w-full min-h-[calc(100vh-72px)] overflow-hidden bg-[#07131D] text-slate-200 py-10 px-4 sm:px-6 lg:px-8 text-left">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[radial-gradient(#16C7D9_1px,transparent_1px)] [background-size:28px_28px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-48 top-0 h-[520px] w-[520px] rounded-full bg-[#16C7D9]/[0.035] blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-48 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-500/[0.025] blur-3xl" />
      <div className="relative max-w-7xl mx-auto space-y-8">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#132A35] pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D202B] border border-amber-500/40 text-amber-400 text-xs font-mono font-bold">
              <HardHat className="w-3.5 h-3.5 text-amber-400" />
              <span>PAGE 07: CONTRACTOR FIELD DISPATCH HUB</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Assigned Field Work Orders
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Acknowledge dispatches, update field progress from ground crews, and submit verified completion proof.
            </p>
          </div>

          {/* Contractor Entity Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                Switch Contractor Portal:
              </span>
              <select
                value={selectedContractorId}
                onChange={e => {
                  setSelectedContractorId(e.target.value);
                  loginAs('CONTRACTOR', e.target.value);
                }}
                className="bg-[#0D202B] border border-[#132A35] rounded-xl px-3.5 py-2 text-xs font-bold text-amber-400 focus:outline-hidden focus:border-amber-500"
              >
                {contractors.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.assigned_area})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => navigate('/leaderboard')}
              className="px-4 py-2 mt-auto rounded-full bg-[#0D202B] border border-[#132A35] hover:border-slate-600 text-slate-300 text-xs font-semibold transition-all"
            >
              View Leaderboard →
            </button>
          </div>
        </div>

        {/* Contractor Profile Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0D202B] border border-[#132A35] shadow-lg shadow-black/10 transition-all duration-300 hover:border-slate-600/70">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Contractor Lead</span>
            <span className="text-sm font-bold text-white block mt-1">{currentContractor.contact_person}</span>
            <span className="text-[11px] text-amber-400 font-mono">{currentContractor.phone}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0D202B] border border-[#132A35] shadow-lg shadow-black/10 transition-all duration-300 hover:border-slate-600/70">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Assigned Sector</span>
            <span className="text-sm font-bold text-white block mt-1">{currentContractor.assigned_area}</span>
            <span className="text-[11px] text-slate-400 font-mono">Tier-1 Registered</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0D202B] border border-[#132A35] shadow-lg shadow-black/10 transition-all duration-300 hover:border-slate-600/70">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Audit Rating</span>
            <span className="text-sm font-bold text-amber-400 block mt-1">★ {currentContractor.rating} / 5.0</span>
            <span className="text-[11px] text-emerald-400 font-mono">{currentContractor.completion_rate}% Completion Rate</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0D202B] border border-[#132A35] shadow-lg shadow-black/10 transition-all duration-300 hover:border-slate-600/70">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Active Workload</span>
            <span className="text-sm font-bold text-white block mt-1">{activeOrders.length} Active Orders</span>
            <span className="text-[11px] text-slate-400 font-mono">{completedOrders.length} Completed</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#132A35] pb-3">
          {[
            { id: 'ALL', label: `All Assigned (${myOrders.length})` },
            { id: 'ACTIVE', label: `In Flight / Action Required (${activeOrders.length})` },
            { id: 'COMPLETED', label: `Closed & Verified (${completedOrders.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-[#132A35]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Assigned Orders List */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Dispatch Registry</p>
            <p className="mt-1 text-xs text-slate-400">
              Showing <span className="font-bold text-slate-200">{displayedOrders.length}</span> of {myOrders.length} assigned orders
            </p>
          </div>
          {activeOrders.length > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-[10px] font-mono font-bold text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {activeOrders.length} ACTIVE
            </span>
          )}
        </div>
        {displayedOrders.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#0D202B] border border-[#132A35] space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="font-heading font-bold text-base text-white">
              No Pending Work Orders for this filter
            </h3>
            <p className="text-xs text-slate-400">
              All assigned road repairs for this contractor are up to date!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedOrders.map(order => {
              const timelineSteps = getTimelineSteps(order);
              return (
                <div
                  key={order.id}
                  className="p-6 rounded-3xl bg-[#0D202B] border border-[#132A35] shadow-xl shadow-black/15 space-y-6 transition-all duration-300 hover:border-slate-600/60"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#132A35] pb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-[#07131D] px-2.5 py-1 rounded-md border border-amber-500/30">
                        {order.id}
                      </span>
                      <h3 className="font-heading font-bold text-base text-white">
                        {order.defect_label}
                      </h3>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        order.severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border-red-500/40' :
                        order.severity === 'HIGH' ? 'bg-amber-950 text-amber-400 border-amber-500/40' : 'bg-yellow-950 text-yellow-400 border-yellow-500/40'
                      }`}>
                        {order.severity}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Deadline: {order.deadline}
                      </span>
                      {order.is_escalated && (
                        <span className="text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-500/40">
                          ESCALATED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Grid: Details & Image */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {/* Visual Evidence */}
                    <div className="md:col-span-4 relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-[#132A35]">
                      <img
                        src={order.thumbnail_url}
                        alt={order.defect_label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                      />
                      <div className="absolute bottom-2 left-2 bg-[#07131D]/80 backdrop-blur-xs px-2 py-1 rounded text-[10px] font-mono text-slate-300">
                        Visual Evidence
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="md:col-span-8 space-y-4">
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#07131D] p-3 rounded-xl border border-[#132A35]">
                          <span className="text-slate-500 text-[10px] uppercase font-mono block">Roadway & Chainage</span>
                          <span className="text-white font-medium block mt-0.5">{order.route}</span>
                          <span className="text-amber-400 font-mono text-[11px]">{order.chainage}</span>
                        </div>
                        <div className="bg-[#07131D] p-3 rounded-xl border border-[#132A35]">
                          <span className="text-slate-500 text-[10px] uppercase font-mono block">SLA Commitment</span>
                          <span className="text-white font-medium block mt-0.5">{order.sla_hours} Hours Total SLA</span>
                          <span className="text-slate-400 font-mono text-[11px]">{order.hours_remaining}h Remaining</span>
                        </div>
                      </div>

                      {/* 4-Stage Timeline (Section 26: SENT -> ACKNOWLEDGED -> IN PROGRESS -> COMPLETED) */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                          Remediation Stage Timeline
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {timelineSteps.map(step => (
                            <div
                              key={step.stage}
                              className={`p-2.5 rounded-xl border text-center font-mono text-[10px] font-bold transition-all ${
                                step.stage === order.status
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                                  : step.isPast
                                  ? 'bg-[#07131D] text-emerald-400 border-emerald-500/40'
                                  : 'bg-[#07131D] text-slate-500 border-[#132A35]'
                              }`}
                            >
                              <div>{step.stage.replace('_', ' ')}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Contractor Action Buttons */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {order.status === 'SENT' && (
                          <button
                            onClick={() => handleStatusTransition(order, 'ACKNOWLEDGED')}
                            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>1. Acknowledge Order & Dispatch Crew</span>
                          </button>
                        )}

                        {(order.status === 'SENT' || order.status === 'ACKNOWLEDGED') && (
                          <button
                            onClick={() => handleStatusTransition(order, 'IN_PROGRESS')}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2"
                          >
                            <Wrench className="w-4 h-4" />
                            <span>2. Mark Work In Progress (Crew on Site)</span>
                          </button>
                        )}

                        {order.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => submitRepairForReview(order.id, 'Repair completed, before/after evidence submitted for authority verification.')}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2 shadow-md"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span>3. Submit Repair Evidence for Review</span>
                          </button>
                        )}

                        {order.status === 'SUBMITTED' && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-purple-300 font-mono font-bold bg-purple-950 px-3 py-1.5 rounded-xl border border-purple-500/40"><CheckCircle2 className="w-3.5 h-3.5" /> Completion submitted — awaiting authority</span>
                        )}

                        {order.status === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-bold bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-500/40">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Job Closed & Audit Approved</span>
                          </span>
                        )}
                      </div>

                    </div>

                  </div>

                  {/* Audit History Log */}
                  {order.history && order.history.length > 0 && (
                    <div className="pt-3 border-t border-[#132A35] text-[11px] text-slate-400 space-y-1">
                      <span className="font-mono text-[10px] text-slate-500 block uppercase">Audit Log:</span>
                      {order.history.map((h, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-300">
                          <span>
                            [{h.timestamp}] <strong className="text-amber-400">{h.stage}</strong>: {h.note}
                          </span>
                          <span className="font-mono text-slate-500 text-[10px]">by {h.updated_by}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
