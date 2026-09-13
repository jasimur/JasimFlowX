"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Handshake, Plus, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { cashChange, dateLabel, KIND_LABEL, money, today, type Entry, type Kind } from "@/lib/ledger";

const MOTION_KEY = "jasimflow:quiet-motion";
export function motionAllowed() {
  try { return !window.matchMedia("(prefers-reduced-motion: reduce)").matches && localStorage.getItem(MOTION_KEY) !== "true"; }
  catch { return false; }
}

export function MotionSetting() {
  const [quiet, setQuiet] = useState(false);
  useEffect(() => { try { setQuiet(localStorage.getItem(MOTION_KEY) === "true"); } catch {} }, []);
  return <section className="panel motion-settings"><div><span className="eyebrow">YOUR RHYTHM</span><h2>তোমার পছন্দের গতি</h2><p>Pulse Ledger · ছোট feedback, দ্রুত এন্ট্রি।</p></div><label className="motion-switch"><span><strong>শান্ত মোড</strong><small>Pulse ও সংখ্যার animation বন্ধ রাখো</small></span><input type="checkbox" checked={quiet} onChange={e => { const value = e.target.checked; setQuiet(value); document.documentElement.dataset.quiet = String(value); try { localStorage.setItem(MOTION_KEY, String(value)); } catch {} }}/></label></section>;
}

export function PulseBoot() {
  useEffect(() => { try { document.documentElement.dataset.quiet = String(localStorage.getItem(MOTION_KEY) === "true"); } catch {} }, []);
  return null;
}

export function CandleLoader() {
  return <span className="candle-loader" aria-hidden="true"><i/><i/><i/></span>;
}

// Only a presentation of the canonical money formatter. Screen readers always get the final value.
export function RollingMoney({ value }: { value: number }) {
  const [previous, setPrevious] = useState(0);
  useEffect(() => {
    if (previous === value) return;
    if (!motionAllowed()) { setPrevious(value); return; }
    const timer = setTimeout(() => setPrevious(value), 380);
    return () => clearTimeout(timer);
  }, [value, previous]);
  const text = money(value), old = money(previous), changed = value !== previous;
  return <span className="rolling-money" aria-label={text}><span aria-hidden="true">{Array.from(text).map((char, i) => <span key={i} className={/\d/.test(char) ? "money-digit" : "money-separator"}>{/\d/.test(char) && changed ? <span key={`${value}-${i}`} className="digit-track"><span>{old.padStart(text.length, " ")[i] || char}</span><span>{char}</span></span> : char}</span>)}</span></span>;
}

export function BalancePanel({ entries, balance, pending, onEntry }: { entries: Entry[]; balance: number; pending: number; onEntry: (kind: Kind) => void }) {
  const id = useId().replace(/:/g, "");
  const points = useMemo(() => {
    const end = today(), dates = Array.from({ length: 7 }, (_, i) => { const d = new Date(end + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 6 + i); return d.toISOString().slice(0, 10); });
    const active = entries.filter(e => !e.deleted_at), daily = new Map<string, number>();
    let running = 0;
    for (const row of active) { const change = cashChange(row); if (row.date < dates[0]) running += change; else daily.set(row.date, (daily.get(row.date) || 0) + change); }
    return dates.map(date => { running += daily.get(date) || 0; return { date, value: running }; });
  }, [entries]);
  const min = Math.min(...points.map(p => p.value)), max = Math.max(...points.map(p => p.value)), range = max - min;
  const coords = points.map((p, i) => `${8 + i * 48},${range ? 66 - ((p.value - min) / range) * 52 : 40}`);
  return <section className="pulse-hero" aria-label="বর্তমান ব্যালেন্স"><div className="hero-readout" style={{ "--balance-chars": money(balance).length } as React.CSSProperties}><div className="hero-caption"><span className="status-light"/><span>PERSONAL LEDGER</span><span className="hero-unit">BDT / ৳</span></div><p>এখন মোট ব্যালেন্স</p><div className="hero-balance"><RollingMoney value={balance}/></div><div className="hero-subline"><span>{pending ? `${pending}টি sync বাকি · ব্যালেন্সে ধরা আছে` : "সব অ্যাকাউন্ট মিলিয়ে"}</span><span className="hero-private">শুধু তোমার হিসাব</span></div><div className="balance-history"><div><span>ব্যালেন্সের গতিপথ</span><small>গত ৭ দিন</small></div>{entries.length ? <svg viewBox="0 0 304 80" role="img" aria-label={`গত সাত দিনের শেষ ব্যালেন্স ${money(points[6].value)}`}><title>{points.map(p => `${dateLabel(p.date)}: ${money(p.value)}`).join("; ")}</title><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#4ea8ff" stopOpacity=".22"/><stop offset="1" stopColor="#4ea8ff" stopOpacity="0"/></linearGradient></defs><path d={`M${coords.join(" L")} L296,80 L8,80 Z`} fill={`url(#${id})`}/><polyline points={coords.join(" ")} fill="none" stroke="#72baff" strokeWidth="2" pathLength="1" className="balance-line"/><circle cx="296" cy={coords[6].split(",")[1]} r="3" fill="#96ccff"/></svg> : <div className="history-empty">প্রথম এন্ট্রিতেই শুরু হবে তোমার টাকার গল্প।</div>}</div></div><div className="hero-actions"><div className="hero-action-heading"><span className="pulse-orb" aria-hidden="true"><i/><i/></span><div><span className="eyebrow">KEEP YOUR FLOW</span><h2>একটু হিসাব। অনেকটা স্বস্তি।</h2></div></div><div className="hero-action-grid"><button className="flow-action income-action" onClick={() => onEntry("income")}><span className="action-icon"><ArrowDownLeft/></span><span><strong>Cash In</strong><small>টাকা এলো</small></span><Plus size={17}/></button><button className="flow-action expense-action" onClick={() => onEntry("expense")}><span className="action-icon"><ArrowUpRight/></span><span><strong>Cash Out</strong><small>টাকা গেল</small></span><Plus size={17}/></button><button className="flow-action loan-action" onClick={() => onEntry("borrow")}><span className="action-icon"><Handshake/></span><span><strong>ঋণ / পাওনা</strong><small>সব বাকি, এক জায়গায়</small></span><Plus size={17}/></button></div><p className="hero-action-hint"><Zap size={13}/> পরিমাণ + ক্যাটাগরি → সেভ। ব্যস!</p></div></section>;
}

export function entryFeedback({ kind, amount, queued, edited }: { kind: Kind; amount: number; queued: boolean; edited: boolean }) {
  const tone = ["income", "collect", "opening"].includes(kind) ? "in" : ["expense", "repay"].includes(kind) ? "out" : "neutral";
  const labels: Partial<Record<Kind, string>> = { income: "আয় যোগ হলো", expense: "খরচ রাখা হলো", repay: "পরিশোধ রাখা হলো", collect: "টাকা গ্রহণ রাখা হলো" };
  toast.custom(id => <div className={`impact-toast tone-${tone}`} role="status"><span className="impact-check"><Check size={21}/>{Array.from({ length: 6 }, (_, i) => <i key={i} style={{ "--spark-angle": `${i * 60}deg` } as React.CSSProperties}/>)}</span><div><strong>{money(amount)} · {edited ? "আপডেট হয়েছে" : labels[kind] || KIND_LABEL[kind] + " সেভ হয়েছে"}</strong><small>{queued ? "ফোনে সেভ হয়েছে · Sync বাকি" : "হিসাবে সেভ হয়েছে"}</small></div><button aria-label="বার্তা বন্ধ করো" onClick={() => toast.dismiss(id)}><X size={16}/></button></div>, { duration: 2600 });
  if (motionAllowed()) { try { navigator.vibrate?.(10); } catch {} }
}
