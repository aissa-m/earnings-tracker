"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, WalletCards } from "lucide-react";
import { Entry, supabase } from "@/lib/supabase";

const people = ["Eva", "Issa"] as const;
const workTypes = ["Labeling", "Reviewing"] as const;
const projects = ["Localized", "DenseFusion", "Textualization"] as const;

const labelingRates: Record<Entry["project"], number> = {
  Localized: 1.5,
  DenseFusion: 2.6,
  Textualization: 2,
};

const reviewRate = 25;

type FormState = {
  person: Entry["person"];
  work_type: Entry["work_type"];
  project: Entry["project"];
  dr: string;
  hours: string;
  minutes: string;
  date: string;
};

const initialForm: FormState = {
  person: "Issa",
  work_type: "Labeling",
  project: "Localized",
  dr: "",
  hours: "",
  minutes: "",
  date: new Date().toISOString().slice(0, 10),
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

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadEntries() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setEntries((data ?? []) as Entry[]);

    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
  }, []);

  const stats = useMemo(() => {
    const byPerson = Object.fromEntries(people.map((person) => [person, 0])) as Record<string, number>;
    const byProject = Object.fromEntries(projects.map((project) => [project, 0])) as Record<string, number>;
    let total = 0;

    for (const entry of entries) {
      const entryTotal = getEntryTotal(entry);
      byPerson[entry.person] += entryTotal;
      byProject[entry.project] += entryTotal;
      total += entryTotal;
    }

    return { byPerson, byProject, total };
  }, [entries]);

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
      await loadEntries();
    }

    setSaving(false);
  }

  async function deleteEntry(id: string) {
    const confirmed = window.confirm("¿Eliminar este registro?");
    if (!confirmed) return;

    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) setError(error.message);
    else setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.35em] text-brand">Earnings Tracker</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Control de ingresos</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Guarda trabajos de Labeling y Reviewing, calcula automáticamente el total por persona y por proyecto.
            </p>
          </div>
          <div className="rounded-2xl border border-brand/30 bg-brand/10 p-5 text-right">
            <p className="text-sm text-slate-300">Total general</p>
            <p className="text-4xl font-black text-brand">{money(stats.total)}</p>
          </div>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</div>}

      <section className="grid gap-4 md:grid-cols-3">
        {people.map((person) => (
          <article key={person} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
            <p className="text-sm text-slate-400">Total {person}</p>
            <p className="mt-2 text-3xl font-bold">{money(stats.byPerson[person])}</p>
          </article>
        ))}
        <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
          <p className="text-sm text-slate-400">Registros</p>
          <p className="mt-2 text-3xl font-bold">{entries.length}</p>
        </article>
      </section>

      <section className="grid gap-8 lg:grid-cols-[420px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-brand/15 p-3 text-brand"><WalletCards size={24} /></div>
            <div>
              <h2 className="text-xl font-bold">Añadir registro</h2>
              <p className="text-sm text-slate-400">Las tarifas se calculan solas.</p>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              Persona
              <select className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3" value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value as Entry["person"] })}>
                {people.map((person) => <option key={person}>{person}</option>)}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-300">
              Tipo
              <select className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3" value={form.work_type} onChange={(e) => setForm({ ...form, work_type: e.target.value as Entry["work_type"] })}>
                {workTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-300">
              Proyecto
              <select className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value as Entry["project"] })}>
                {projects.map((project) => <option key={project}>{project}</option>)}
              </select>
            </label>

            {form.work_type === "Labeling" ? (
              <label className="grid gap-2 text-sm font-medium text-slate-300">
                DR
                <input className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3" type="number" min="0" step="1" value={form.dr} onChange={(e) => setForm({ ...form, dr: e.target.value })} placeholder="Ej: 60" />
              </label>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2 text-sm font-medium text-slate-300">
                  Horas
                  <input className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3" type="number" min="0" step="1" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="Ej: 3" />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-300">
                  Minutos
                  <input className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3" type="number" min="0" max="59" step="1" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} placeholder="Ej: 30" />
                </label>
              </div>
            )}

            <label className="grid gap-2 text-sm font-medium text-slate-300">
              Fecha
              <input className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>

            <button disabled={saving} className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
              <Plus size={20} /> {saving ? "Guardando..." : "Guardar registro"}
            </button>
          </div>
        </form>

        <div className="grid gap-8">
          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
            <h2 className="mb-4 text-xl font-bold">Totales por proyecto</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {projects.map((project) => (
                <div key={project} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-sm text-slate-400">{project}</p>
                  <p className="mt-2 text-2xl font-bold">{money(stats.byProject[project])}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Historial</h2>
              {loading && <p className="text-sm text-slate-400">Cargando...</p>}
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-white/10 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Persona</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Proyecto</th>
                    <th className="px-4 py-3">Cantidad</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="bg-slate-950/30">
                      <td className="px-4 py-3 text-slate-300">{entry.date}</td>
                      <td className="px-4 py-3 font-semibold">{entry.person}</td>
                      <td className="px-4 py-3">{entry.work_type}</td>
                      <td className="px-4 py-3">{entry.project}</td>
                      <td className="px-4 py-3">{formatAmount(entry)}</td>
                      <td className="px-4 py-3 font-bold text-brand">{money(getEntryTotal(entry))}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteEntry(entry.id)} className="rounded-xl p-2 text-red-300 transition hover:bg-red-500/10 hover:text-red-200" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && entries.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan={7}>Todavía no hay registros.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
