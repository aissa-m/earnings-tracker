"use client";

import { FormEvent, useState } from "react";
import { Banknote, CalendarDays, HandCoins, ReceiptText, Scale, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

type PaymentForm = {
  amount: string;
  issa_amount: string;
  eva_amount: string;
  date: string;
  note: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function toInputValue(value: number) {
  return value > 0 ? roundMoney(value).toString() : "";
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/55 text-slate-700 shadow-sm backdrop-blur">{children}</span>;
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return <div className="mb-5 flex items-center gap-3"><FieldIcon>{icon}</FieldIcon><div><h2 className="text-xl font-black text-slate-950">{title}</h2><p className="text-sm text-slate-500">{subtitle}</p></div></div>;
}

function InputLabel({ icon, label, value, onChange, placeholder, type = "number", step = "0.01" }: { icon: React.ReactNode; label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; step?: string }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="flex items-center gap-2">{icon} {label}</span><input className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 text-lg font-black text-slate-950 outline-none backdrop-blur transition placeholder:text-slate-400 focus:ring-4 focus:ring-brand/20" type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? step : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

export default function PaymentSplitForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<PaymentForm>({ amount: "", issa_amount: "", eva_amount: "", date: today(), note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleAmountChange(value: string) {
    const amount = Number(value || 0);
    const half = roundMoney(amount / 2);
    setForm((current) => ({ ...current, amount: value, issa_amount: toInputValue(half), eva_amount: toInputValue(roundMoney(amount - half)) }));
  }

  function handleIssaChange(value: string) {
    const amount = Number(form.amount || 0);
    const issaAmount = Number(value || 0);
    const evaAmount = Math.max(0, roundMoney(amount - issaAmount));
    setForm((current) => ({ ...current, issa_amount: value, eva_amount: toInputValue(evaAmount) }));
  }

  function handleEvaChange(value: string) {
    const amount = Number(form.amount || 0);
    const evaAmount = Number(value || 0);
    const issaAmount = Math.max(0, roundMoney(amount - evaAmount));
    setForm((current) => ({ ...current, eva_amount: value, issa_amount: toInputValue(issaAmount) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const amount = roundMoney(Number(form.amount || 0));
    const issaAmount = roundMoney(Number(form.issa_amount || 0));
    const evaAmount = roundMoney(Number(form.eva_amount || 0));
    const splitTotal = roundMoney(issaAmount + evaAmount);

    if (!amount || amount <= 0) setError("Introduce una cantidad recibida válida.");
    else if (issaAmount < 0 || evaAmount < 0) setError("El reparto no puede tener cantidades negativas.");
    else if (splitTotal !== amount) setError("El reparto debe coincidir con el total recibido.");
    else {
      const { error: paymentError } = await supabase.from("payments").insert({
        amount,
        issa_amount: issaAmount,
        eva_amount: evaAmount,
        date: form.date,
        note: form.note.trim() || null,
      });

      if (paymentError) setError(paymentError.message);
      else {
        setForm({ amount: "", issa_amount: "", eva_amount: "", date: form.date, note: "" });
        await onSaved();
      }
    }

    setSaving(false);
  }

  const amount = Number(form.amount || 0);
  const issaAmount = Number(form.issa_amount || 0);
  const evaAmount = Number(form.eva_amount || 0);

  return (
    <form onSubmit={handleSubmit} className="glass-card">
      <SectionTitle icon={<HandCoins size={19} />} title="Pago recibido" subtitle="Por defecto 50/50, editable manualmente." />
      {error && <div className="mb-4 rounded-3xl border border-red-200 bg-red-50/80 p-4 text-sm font-bold text-red-700">{error}</div>}
      <div className="grid gap-4">
        <InputLabel icon={<Banknote size={16} />} label="Cantidad recibida" value={form.amount} onChange={handleAmountChange} placeholder="Ej: 200" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InputLabel icon={<UserRound size={16} />} label="Issa recibe" value={form.issa_amount} onChange={handleIssaChange} placeholder="0" />
          <InputLabel icon={<UserRound size={16} />} label="Eva recibe" value={form.eva_amount} onChange={handleEvaChange} placeholder="0" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-white/70 bg-white/65 p-4 backdrop-blur"><p className="text-xs font-bold text-slate-500">Issa</p><p className="mt-1 text-2xl font-black text-slate-950">{money(issaAmount)}</p></div>
          <div className="rounded-3xl border border-white/70 bg-white/65 p-4 backdrop-blur"><p className="text-xs font-bold text-slate-500">Eva</p><p className="mt-1 text-2xl font-black text-slate-950">{money(evaAmount)}</p></div>
        </div>
        <p className={`rounded-2xl px-3 py-2 text-xs font-black ${amount && roundMoney(issaAmount + evaAmount) !== amount ? "bg-red-50 text-red-500" : "bg-slate-950/5 text-slate-500"}`}>Total repartido: {money(issaAmount + evaAmount)} / {money(amount)}</p>
        <InputLabel icon={<CalendarDays size={16} />} label="Fecha" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} step="1" />
        <InputLabel icon={<ReceiptText size={16} />} label="Nota" type="text" value={form.note} onChange={(value) => setForm({ ...form, note: value })} placeholder="Ej: Primer pago" step="1" />
        <button disabled={saving} className="green-button"><Scale size={20} /> {saving ? "Guardando..." : "Registrar pago"}</button>
      </div>
    </form>
  );
}
