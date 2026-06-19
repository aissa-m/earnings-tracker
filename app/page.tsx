"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Clock3,
  Coins,
  FileText,
  HandCoins,
  Layers3,
  Plus,
  ReceiptText,
  Scale,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Entry, Payment, supabase } from "@/lib/supabase";

const people = ["Eva", "Issa"] as const;
const workTypes = ["Labeling", "Reviewing"] as const;
const projects = ["Localized", "DenseFusion", "Textualization"] as const;

const labelingRates: Record<Entry["project"], number> = {
  Localized: 1.5,
  DenseFusion: 2.6,
  Textualization: 2,
};

const reviewRate = 25;

const projectIcons: Record<Entry["project"], typeof FileText> = {
  Localized: FileText,
  DenseFusion: Layers3,
  Textualization: Sparkles,
};

type FormState = {
  person: Entry["person"];
  work_type: Entry["work_type"];
  project: Entry["project"];
  dr: string;
  hours: string;
  minutes: string;
  date: string;
};

type PaymentFormState = {
  amount: string;
  date: string;
  note: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

const initialForm: FormState = {
  person: "Issa",
  work_type: "Labeling",
  project: "Localized",
  dr: "",
  hours: "",
  minutes: "",
  date: today(),
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getEntryTotal(entry: Pick<Entry, "work_type" | "project" | "amount">) {
  if (entry.work_type === "Reviewing") return Number(entry.amount) * reviewRate;
  return Number(entry.amount) * labelingRates[entry.project];
}

function formatAmount(entry: Entry) {
  if (entry.unit === "DR") return `${entry.amount} DR`;
  const totalMinutes = Math.round(Number(entry.amount) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/55 text-slate-700 shadow-sm backdrop-blur">
      {children}
    </span>
  );
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [form, setForm] = useState<FormState>(() => ({ ...initialForm, date: today() }));
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(() => ({ amount: "", date: today(), note: "" }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const [entriesResult, paymentsResult] = await Promise.all([
      supabase.from("entries").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("payments").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
    ]);

    if (entriesResult.error) setError(entriesResult.error.message);
    else setEntries((entriesResult.data ?? []) as Entry[]);

    if (paymentsResult.error) setError(paymentsResult.error.message);
    else setPayments((paymentsResult.data ?? []) as Payment[]);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const generatedByPerson = Object.fromEntries(people.map((person) => [person, 0])) as Record<string, number>;
    const paidByPerson = Object.fromEntries(people.map((person) => [person, 0])) as Record<string, number>;
    const pendingByPerson = Object.fromEntries(people.map((person) => [person, 0])) as Record<string, number>;
    const byProject = Object.fromEntries(projects.map((project) => [project, 0])) as Record<string, number>;

    let generatedTotal = 0;
    let paidTotal = 0;

    for (const entry of entries) {
      const entryTotal = getEntryTotal(entry);
      generatedByPerson[entry.person] += entryTotal;
      byProject[entry.project] += entryTotal;
      generatedTotal += entryTotal;
    }

    for (const payment of payments) {
      const issaAmount = Number(payment.issa_amount);
      const evaAmount = Number(payment.eva_amount);
      paidByPerson.Issa += issaAmount;
      paidByPerson.Eva += evaAmount;
      paidTotal += Number(payment.amount);
    }

    for (const person of people) {
      pendingByPerson[person] = generatedByPerson[person] - paidByPerson[person];
    }

    return {
      generatedByPerson,
      paidByPerson,
      pendingByPerson,
      byProject,
      generatedTotal,
      paidTotal,
      pendingTotal: generatedTotal - paidTotal,
    };
  }, [entries, payments]);

  const recentEntries = entries.slice(0, 6);
  const recentPayments = payments.slice(0, 5);
  const splitAmount = Number(paymentForm.amount || 0) / 2;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const isReview = form.work_type === "Reviewing";
    const hours = Number(form.hours || 0);
    const minutes = Number(form.minutes || 0);
    const amount = isReview ? hours + minutes / 60 : Number(form.dr);

    if (!amount || amount <= 0) {
      setError("Introduce una cantidad válida.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("entries").insert({
      person: form.person,
      work_type: form.work_type,
      project: form.project,
      amount,
      unit: isReview ? "hours" : "DR",
      date: form.date,
    });

    if (error) setError(error.message);
    else {
      setForm({ ...initialForm, person: form.person, date: form.date });
      await loadData();
    }

    setSaving(false);
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPayment(true);
    setError("");

    const amount = Number(paymentForm.amount);

    if (!amount || amount <= 0) {
      setError("Introduce una cantidad recibida válida.");
      setSavingPayment(false);
      return;
    }

    const half = Number((amount / 2).toFixed(2));
    const { error } = await supabase.from("payments").insert({
      amount,
      issa_amount: half,
      eva_amount: Number((amount - half).toFixed(2)),
      date: paymentForm.date,
      note: paymentForm.note.trim() || null,
    });

    if (error) setError(error.message);
    else {
      setPaymentForm({ amount: "", date: paymentForm.date, note: "" });
      await loadData();
    }

    setSavingPayment(false);
  }

  async function deleteEntry(id: string) {
    const confirmed = window.confirm("¿Eliminar este registro?");
    if (!confirmed) return;

    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) setError(error.message);
    else setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  async function deletePayment(id: string) {
    const confirmed = window.confirm("¿Eliminar este pago recibido?");
    if (!confirmed) return;

    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) setError(error.message);
    else setPayments((current) => current.filter((payment) => payment.id !== id));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/55 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:p-8">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute -bottom-24 left-8 h-52 w-52 rounded-full bg-slate-900/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/65 px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-slate-700 shadow-sm backdrop-blur">
              <Sparkles size={14} className="text-brand" /> Earnings
            </div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Pendiente por cobrar</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">{money(stats.pendingTotal)}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Generado: {money(stats.generatedTotal)} · Cobrado: {money(stats.paidTotal)}
            </p>
          </div>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-white/80 bg-slate-950 text-white shadow-xl shadow-slate-950/20 sm:h-16 sm:w-16">
            <WalletCards size={28} />
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-white/70 bg-white/60 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-500"><UserRound size={16} /> Issa pendiente</div>
            <p className="text-2xl font-black text-slate-950">{money(stats.pendingByPerson.Issa)}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">Cobrado {money(stats.paidByPerson.Issa)}</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/60 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-500"><UsersRound size={16} /> Eva pendiente</div>
            <p className="text-2xl font-black text-slate-950">{money(stats.pendingByPerson.Eva)}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">Cobrado {money(stats.paidByPerson.Eva)}</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/60 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-500"><Banknote size={16} /> Cobrado</div>
            <p className="text-2xl font-black text-slate-950">{money(stats.paidTotal)}</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-brand/80 p-4 text-slate-950 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center gap-2 text-xs font-black text-slate-800"><BadgeDollarSign size={16} /> Generado</div>
            <p className="text-2xl font-black">{money(stats.generatedTotal)}</p>
          </div>
        </div>
      </section>

      {error && <div className="mt-4 rounded-3xl border border-red-200 bg-red-50/80 p-4 text-sm font-semibold text-red-700 shadow-sm backdrop-blur">{error}</div>}

      <section className="mt-5 grid gap-5 lg:grid-cols-[420px_1fr]">
        <div className="grid gap-5">
          <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/70 bg-white/55 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:p-6">
            <div className="mb-5 flex items-center gap-3"><FieldIcon><Plus size={19} /></FieldIcon><div><h2 className="text-xl font-black text-slate-950">Nuevo registro</h2><p className="text-sm text-slate-500">Añade trabajo generado.</p></div></div>

            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="flex items-center gap-2"><UserRound size={16} /> Persona</span><select className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 font-bold text-slate-900 outline-none backdrop-blur transition focus:ring-4 focus:ring-brand/20" value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value as Entry["person"] })}>{people.map((person) => <option key={person}>{person}</option>)}</select></label>

              <div className="grid grid-cols-2 gap-3">
                {workTypes.map((type) => {
                  const active = form.work_type === type;
                  const Icon = type === "Labeling" ? FileText : Clock3;
                  return <button key={type} type="button" onClick={() => setForm({ ...form, work_type: type })} className={`rounded-3xl border p-4 text-left transition ${active ? "border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-950/20" : "border-white/70 bg-white/65 text-slate-700 backdrop-blur"}`}><Icon size={20} className={active ? "text-brand" : "text-slate-500"} /><p className="mt-3 text-sm font-black">{type}</p></button>;
                })}
              </div>

              <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="flex items-center gap-2"><Layers3 size={16} /> Proyecto</span><select className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 font-bold text-slate-900 outline-none backdrop-blur transition focus:ring-4 focus:ring-brand/20" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value as Entry["project"] })}>{projects.map((project) => <option key={project}>{project}</option>)}</select></label>

              {form.work_type === "Labeling" ? <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="flex items-center gap-2"><Coins size={16} /> DR realizados</span><input className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 text-lg font-black text-slate-950 outline-none backdrop-blur transition placeholder:text-slate-400 focus:ring-4 focus:ring-brand/20" type="number" min="0" step="1" value={form.dr} onChange={(e) => setForm({ ...form, dr: e.target.value })} placeholder="Ej: 60" /></label> : <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-sm font-bold text-slate-700"><span className="flex items-center gap-2"><Clock3 size={16} /> Horas</span><input className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 text-lg font-black text-slate-950 outline-none backdrop-blur transition placeholder:text-slate-400 focus:ring-4 focus:ring-brand/20" type="number" min="0" step="1" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="3" /></label><label className="grid gap-2 text-sm font-bold text-slate-700"><span className="flex items-center gap-2"><Clock3 size={16} /> Min</span><input className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 text-lg font-black text-slate-950 outline-none backdrop-blur transition placeholder:text-slate-400 focus:ring-4 focus:ring-brand/20" type="number" min="0" max="59" step="1" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} placeholder="30" /></label></div>}

              <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="flex items-center gap-2"><CalendarDays size={16} /> Fecha</span><input className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 font-bold text-slate-900 outline-none backdrop-blur transition focus:ring-4 focus:ring-brand/20" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>

              <button disabled={saving} className="mt-1 inline-flex items-center justify-center gap-2 rounded-3xl bg-slate-950 px-5 py-4 font-black text-white shadow-xl shadow-slate-950/20 transition active:scale-[0.98] disabled:opacity-60"><Plus size={20} className="text-brand" /> {saving ? "Guardando..." : "Guardar trabajo"}</button>
            </div>
          </form>

          <form onSubmit={handlePaymentSubmit} className="rounded-[2rem] border border-white/70 bg-white/55 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:p-6">
            <div className="mb-5 flex items-center gap-3"><FieldIcon><HandCoins size={19} /></FieldIcon><div><h2 className="text-xl font-black text-slate-950">Pago recibido</h2><p className="text-sm text-slate-500">Se divide 50% / 50%.</p></div></div>
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="flex items-center gap-2"><Banknote size={16} /> Cantidad recibida</span><input className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 text-lg font-black text-slate-950 outline-none backdrop-blur transition placeholder:text-slate-400 focus:ring-4 focus:ring-brand/20" type="number" min="0" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="Ej: 200" /></label>
              <div className="grid grid-cols-2 gap-3"><div className="rounded-3xl border border-white/70 bg-white/65 p-4 backdrop-blur"><p className="text-xs font-bold text-slate-500">Issa recibe</p><p className="mt-1 text-2xl font-black text-slate-950">{money(splitAmount)}</p></div><div className="rounded-3xl border border-white/70 bg-white/65 p-4 backdrop-blur"><p className="text-xs font-bold text-slate-500">Eva recibe</p><p className="mt-1 text-2xl font-black text-slate-950">{money(splitAmount)}</p></div></div>
              <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="flex items-center gap-2"><CalendarDays size={16} /> Fecha</span><input className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 font-bold text-slate-900 outline-none backdrop-blur transition focus:ring-4 focus:ring-brand/20" type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} /></label>
              <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="flex items-center gap-2"><ReceiptText size={16} /> Nota</span><input className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 font-bold text-slate-900 outline-none backdrop-blur transition placeholder:text-slate-400 focus:ring-4 focus:ring-brand/20" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} placeholder="Ej: Primer pago" /></label>
              <button disabled={savingPayment} className="inline-flex items-center justify-center gap-2 rounded-3xl bg-brand px-5 py-4 font-black text-slate-950 shadow-xl shadow-brand/20 transition active:scale-[0.98] disabled:opacity-60"><Scale size={20} /> {savingPayment ? "Guardando..." : "Registrar pago"}</button>
            </div>
          </form>
        </div>

        <div className="grid gap-5">
          <section className="rounded-[2rem] border border-white/70 bg-white/55 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">Proyectos</h2><p className="text-sm text-slate-500">Totales generados</p></div><FieldIcon><ChartNoAxesColumnIncreasing size={19} /></FieldIcon></div>
            <div className="grid gap-3 sm:grid-cols-3">{projects.map((project) => { const Icon = projectIcons[project]; return <article key={project} className="rounded-3xl border border-white/70 bg-white/65 p-4 shadow-sm backdrop-blur"><div className="mb-5 flex items-center justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white"><Icon size={20} className="text-brand" /></div><span className="rounded-full bg-slate-950/5 px-3 py-1 text-xs font-black text-slate-500">{project === "DenseFusion" ? "$2.60" : project === "Localized" ? "$1.50" : "$2.00"}</span></div><p className="text-sm font-bold text-slate-500">{project}</p><p className="mt-1 text-2xl font-black text-slate-950">{money(stats.byProject[project])}</p></article>; })}</div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/55 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">Pagos</h2><p className="text-sm text-slate-500">Dinero ya repartido</p></div>{loading ? <p className="text-sm font-bold text-slate-500">Cargando...</p> : <FieldIcon><HandCoins size={19} /></FieldIcon>}</div>
            <div className="grid gap-3">{recentPayments.map((payment) => <article key={payment.id} className="rounded-3xl border border-white/70 bg-white/65 p-4 shadow-sm backdrop-blur"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-slate-950"><Banknote size={21} /></div><div><p className="font-black text-slate-950">{money(Number(payment.amount))}</p><p className="text-xs font-bold text-slate-500">Issa {money(Number(payment.issa_amount))} · Eva {money(Number(payment.eva_amount))}</p></div></div><div className="text-right"><p className="text-xs font-bold text-slate-500">{formatDate(payment.date)}</p><button onClick={() => deletePayment(payment.id)} className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black text-red-500 hover:bg-red-50" title="Eliminar"><Trash2 size={13} /></button></div></div>{payment.note && <p className="mt-3 rounded-2xl bg-slate-950/5 px-3 py-2 text-xs font-bold text-slate-500">{payment.note}</p>}</article>)}{!loading && payments.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white/45 p-6 text-center backdrop-blur"><p className="font-black text-slate-950">No hay pagos registrados</p><p className="mt-1 text-sm text-slate-500">Cuando llegue dinero, añádelo aquí.</p></div>}</div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/55 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">Actividad</h2><p className="text-sm text-slate-500">Últimos trabajos</p></div>{loading ? <p className="text-sm font-bold text-slate-500">Cargando...</p> : <FieldIcon><BriefcaseBusiness size={19} /></FieldIcon>}</div>
            <div className="grid gap-3">{recentEntries.map((entry) => { const Icon = projectIcons[entry.project]; return <article key={entry.id} className="rounded-3xl border border-white/70 bg-white/65 p-4 shadow-sm backdrop-blur"><div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10"><Icon size={20} className="text-brand" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{entry.project}</p><p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500"><span className="inline-flex items-center gap-1"><UserRound size={13} /> {entry.person}</span><span>•</span><span className="inline-flex items-center gap-1">{entry.work_type === "Reviewing" ? <Clock3 size={13} /> : <Coins size={13} />} {entry.work_type}</span><span>•</span><span>{formatDate(entry.date)}</span></p></div><div className="text-right"><p className="text-lg font-black text-slate-950">{money(getEntryTotal(entry))}</p><p className="text-xs font-bold text-slate-500">{formatAmount(entry)}</p></div></div></div></div><div className="mt-3 flex justify-end"><button onClick={() => deleteEntry(entry.id)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black text-red-500 transition hover:bg-red-50" title="Eliminar"><Trash2 size={14} /> Eliminar</button></div></article>; })}{!loading && entries.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white/45 p-8 text-center backdrop-blur"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white"><Plus size={20} className="text-brand" /></div><p className="font-black text-slate-950">Todavía no hay registros</p><p className="mt-1 text-sm text-slate-500">Añade el primero desde el formulario.</p></div>}</div>
          </section>
        </div>
      </section>
    </main>
  );
}
