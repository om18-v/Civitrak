import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, FileText, MapPin, MessageSquare, PlayCircle, Radio, ShieldCheck, Star, Upload, Wrench } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const statusMeta: Record<string, { label: string; tone: string; step: number }> = {
  SENT: { label: 'Assigned', tone: 'bg-[#FFF5D6] text-[#8B6500] border-[#F2B705]/30', step: 2 },
  ACKNOWLEDGED: { label: 'Crew acknowledged', tone: 'bg-[#EEF5F8] text-[#087EA4] border-[#087EA4]/20', step: 3 },
  IN_PROGRESS: { label: 'Repair in progress', tone: 'bg-[#EAF7F0] text-[#2F7A4D] border-[#2F7A4D]/20', step: 4 },
  SUBMITTED: { label: 'Awaiting authority verification', tone: 'bg-[#F3ECFF] text-[#6E42A5] border-purple-200', step: 5 },
  COMPLETED: { label: 'Repair closed', tone: 'bg-[#EAF7F0] text-[#23643E] border-[#2F7A4D]/25', step: 6 },
  ESCALATED: { label: 'Authority escalation', tone: 'bg-[#FFF0EA] text-[#A63D18] border-[#E8541E]/25', step: 4 },
  REJECTED: { label: 'Rework requested', tone: 'bg-[#FFF0EA] text-[#A63D18] border-[#E8541E]/25', step: 4 },
};

export const CitizenHubPage: React.FC = () => {
  const { workOrders, detections, videos, currentUserName, ratings, rateContractor } = useApp();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const visibleOrders = useMemo(() => workOrders.slice(0, 6), [workOrders]);
  const completed = workOrders.filter((w) => w.status === 'COMPLETED').length;
  const active = workOrders.filter((w) => w.status !== 'COMPLETED').length;
  const rated = ratings.length;

  const submitRating = () => {
    if (!selectedOrder) return;
    rateContractor(selectedOrder, rating, comment);
    setSelectedOrder(null); setComment(''); setRating(5);
  };

  return (
    <div className="civi-page-shell min-h-[calc(100vh-74px)] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <section className="civi-citizen-hero relative overflow-hidden rounded-[30px] border border-[#123F59]/10 bg-[#0D2B3A] p-6 text-white shadow-[0_28px_80px_rgba(13,43,58,.18)] sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(22,199,217,.28),transparent_30%),radial-gradient(circle_at_8%_110%,rgba(242,183,5,.16),transparent_32%)]" />
          <div className="absolute inset-0 opacity-25 civi-grid-overlay" />
          <div className="relative grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.16em] text-white/80 backdrop-blur">
                <Radio className="h-3.5 w-3.5 text-[#16C7D9]" /> Citizen civic control room
              </div>
              <h1 className="max-w-3xl text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">Your report does not stop at detection.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">CiviTrak follows the issue from road evidence to authority action, contractor repair, live progress and citizen feedback.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/upload" className="inline-flex items-center gap-2 rounded-xl bg-[#F2B705] px-4 py-3 text-xs font-extrabold text-[#23262B] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"><Upload className="h-4 w-4" /> Report a road issue</Link>
                <Link to="/map" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-bold text-white backdrop-blur transition hover:bg-white/15"><MapPin className="h-4 w-4" /> Open live GIS map</Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['ACTIVE CASES', active, Clock3], ['CLOSED', completed, CheckCircle2], ['VIDEOS', videos.length, PlayCircle], ['PUBLIC RATINGS', rated, Star]].map(([label, value, Icon]) => (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[.07] p-4 backdrop-blur-md">
                  <Icon className="h-4 w-4 text-[#16C7D9]" />
                  <div className="mt-3 text-2xl font-extrabold">{String(value)}</div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-[.14em] text-white/45">{String(label)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <div className="civi-surface rounded-[26px] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><div className="civi-kicker">Civic case lifecycle</div><h2 className="mt-2 text-2xl font-extrabold">Your reported infrastructure</h2><p className="mt-1 text-sm text-slate-500">Every case keeps its evidence, location, work order and resolution history together.</p></div>
              <Link to="/results" className="inline-flex items-center gap-1 text-xs font-bold text-[#087EA4]">View AI evidence <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="mt-6 space-y-3">
              {visibleOrders.map((order) => {
                const meta = statusMeta[order.status] || statusMeta.SENT;
                const hasRating = ratings.some((r) => r.work_order_id === order.id);
                return <div key={order.id} className="rounded-2xl border border-[#123F59]/10 bg-white/75 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(13,43,58,.08)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <img src={order.thumbnail_url} alt="Infrastructure evidence" className="h-14 w-20 shrink-0 rounded-xl object-cover" />
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] font-bold text-[#087EA4]">{order.id}</span><span className={`rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase ${meta.tone}`}>{meta.label}</span></div><h3 className="mt-1 truncate text-sm font-extrabold text-[#0D2B3A]">{order.defect_label}</h3><p className="mt-0.5 text-xs text-slate-500">{order.route} · {order.chainage} · {order.contractor_name}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.status === 'COMPLETED' && !hasRating && <button onClick={() => setSelectedOrder(order.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1F3A5F] px-3 py-2 text-[10px] font-extrabold text-white hover:bg-[#17304E]"><Star className="h-3.5 w-3.5 text-[#F2B705]" /> Rate work</button>}
                      {hasRating && <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Rated</span>}
                      <button onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 hover:border-[#087EA4]/30 hover:text-[#087EA4]">Track</button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-6 gap-1">
                    {['Detected','Verified','Assigned','Repair','Review','Closed'].map((step, i) => <div key={step} className={`h-1.5 rounded-full ${i < meta.step ? 'bg-[#16C7D9]' : 'bg-slate-100'}`} title={step} />)}
                  </div>
                  {selectedOrder === order.id && order.status !== 'COMPLETED' && <div className="mt-4 rounded-2xl bg-[#F6F8F7] p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Live case tracking · refreshes automatically</span><span className="text-[10px] font-bold text-[#2F7A4D]">{meta.label}</span></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6">{['Detected','Verified','Assigned','Repair','Review','Closed'].map((step, i) => <div key={step} className="rounded-xl border border-slate-200 bg-white p-3"><div className={`h-1.5 rounded-full ${i < meta.step ? 'bg-[#16C7D9]' : 'bg-slate-100'}`} /><div className="mt-2 text-[9px] font-bold uppercase text-slate-500">{step}</div></div>)}</div><div className="mt-3 text-[11px] font-semibold text-slate-600">Contractor: {order.contractor_name} · Deadline: {order.deadline}</div></div>}
                  {selectedOrder === order.id && order.status === 'COMPLETED' && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"><div className="flex items-center gap-2 text-sm font-extrabold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Work completed and closed</div><p className="mt-1 text-xs text-emerald-700">The contractor submitted completion and the authority closed the case. Your rating helps maintain the public accountability record.</p></div>}
                </div>;
              })}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[26px] border border-[#123F59]/10 bg-[#E9F3F5] p-5 shadow-sm"><div className="flex items-center gap-2 text-[#087EA4]"><ShieldCheck className="h-5 w-5" /><span className="text-xs font-extrabold uppercase tracking-[.12em]">Evidence chain</span></div><div className="mt-5 space-y-3">{[['01','Road video','Citizen evidence'],['02','AI finding','Issue + confidence'],['03','Authority','Verification + assignment'],['04','Contractor','Repair + proof'],['05','Citizen','Completion + rating']].map(([n,a,b]) => <div key={n} className="flex items-center gap-3 rounded-xl bg-white/75 p-3"><span className="font-mono text-[10px] font-bold text-[#F2B705]">{n}</span><div><div className="text-xs font-extrabold text-[#0D2B3A]">{a}</div><div className="text-[10px] text-slate-500">{b}</div></div></div>)}</div></div>
            <div className="rounded-[26px] border border-[#123F59]/10 bg-white/75 p-5"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#087EA4]" /><span className="text-sm font-extrabold">Inspection tools</span></div><div className="mt-4 grid gap-2"><Link to="/processing" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-700 hover:border-[#087EA4]/30"><span>Processing monitor</span><ArrowRight className="h-3.5 w-3.5" /></Link><Link to="/map" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-700 hover:border-[#087EA4]/30"><span>GIS spatial evidence</span><ArrowRight className="h-3.5 w-3.5" /></Link></div></div>
          </div>
        </section>

        {selectedOrder && workOrders.find((w) => w.id === selectedOrder)?.status === 'COMPLETED' && !ratings.some((r) => r.work_order_id === selectedOrder) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07131D]/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[28px] border border-white/30 bg-[#EDEAE3] p-6 shadow-[0_35px_100px_rgba(0,0,0,.28)]">
              <div className="flex items-start justify-between"><div><div className="civi-kicker">Citizen verification</div><h3 className="mt-2 text-2xl font-extrabold">Rate the completed work</h3><p className="mt-1 text-xs text-slate-500">Your 0–5 score becomes part of the contractor's public accountability record.</p></div><Star className="h-6 w-6 text-[#F2B705]" /></div>
              <div className="mt-6 flex items-center justify-center gap-2">{[0,1,2,3,4,5].map((n) => <button key={n} onClick={() => setRating(n)} className={`flex h-11 w-11 items-center justify-center rounded-xl border text-xs font-extrabold transition ${rating === n ? 'border-[#1F3A5F] bg-[#1F3A5F] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#F2B705]'}`}>{n}</button>)}</div>
              <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">0 = not completed · 5 = fully satisfied</div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment about the repair..." className="mt-5 min-h-24 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-[#087EA4]" />
              <div className="mt-4 flex gap-2"><button onClick={() => setSelectedOrder(null)} className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-600">Cancel</button><button onClick={submitRating} className="flex-1 rounded-xl bg-[#1F3A5F] py-3 text-xs font-extrabold text-white">Publish rating</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
