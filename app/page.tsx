"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Coins,
  FileText,
  HandCoins,
  HomeIcon,
  Layers3,
  Plus,
  ReceiptText,
  Scale,
  Settings2,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Entry, Payment, Project, WorkType, supabase } from "@/lib/supabase";

const people = ["Eva", "Issa"] as const;
const workTypes: WorkType[] = ["Labeling", "Reviewing"];
const defaultReviewRate = 25;

type View = "home" | "projects";

type EntryForm = {
  person: "Eva" | "Issa";
  work_type: WorkType;
  project: string;
  dr: string;
  hours: string;
  minutes: string;
  date: string;
};

type PaymentForm = { amount: string; date: string; note: string };
type ProjectForm = {
  name: string;
  supports_labeling: boolean;
  supports_reviewing: boolean;
  labeling_rate: string;
  reviewing_rate: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`));
}

function formatAmount(entry: Entry) {
  if (entry.unit === "DR") return `${entry.amount} DR`;
  const totalMinutes = Math.round(Number(entry.amount) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/55 text-slate-700 shadow-sm backdrop-blur">{children}</span>;
}

function projectRate(projects: Project[], entry: Pick<Entry, "project" | "work_type">) {
  const project = projects.find((item) => item.name === entry.project);
  if (entry.work_type === "Reviewing") return Number(project?.reviewing_rate ?? defaultReviewRate);
  return Number(project?.labeling_rate ?? 0);
}

function getEntryTotal(projects: Project[], entry: Pick<Entry, "work_type" | "project" | "amount">) {
  return Number(entry.amount) * projectRate(projects, entry);
}

function projectIcon(projectName: string) {
  const name = projectName.toLowerCase();
  if (name.includes("dense")) return Layers3;
  if (name.includes("text")) return Sparkles;
  return FileText;
}

const initialProjectForm: ProjectForm = {
  name: "",
  supports_labeling: true,
  supports_reviewing: false,
  labeling_rate: "",
  reviewing_rate: "25",
};

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [entryForm, setEntryForm] = useState<EntryForm>({ person: "Issa", work_type: "Labeling", project: "", dr: "", hours: "", minutes: "", date: today() });
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({ amount: "", date: today(), note: "" });
  const [projectForm, setProjectForm] = useState<ProjectForm>(initialProjectForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [error, setError] = useState("");

  const availableProjects = useMemo(
    () => projects.filter((project) => project.is_active && (entryForm.work_type === "Labeling" ? project.supports_labeling : project.supports_reviewing)),
    [projects, entryForm.work_type]
  );

  async function loadData() {
    setLoading(true);
    setError("");

    const [entriesResult, paymentsResult, projectsResult] = await Promise.all([
      supabase.from("entries").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("payments").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("projects").select("*").order("name", { ascending: true }),
    ]);

    if (entriesResult.error) setError(entriesResult.error.message);
    else setEntries((entriesResult.data ?? []) as Entry[]);

    if (paymentsResult.error) setError(paymentsResult.error.message);
    else setPayments((paymentsResult.data ?? []) as Payment[]);

    if (projectsResult.error) setError(projectsResult.error.message);
    else {
      const loadedProjects = (projectsResult.data ?? []) as Project[];
      setProjects(loadedProjects);
      setEntryForm((current) => ({ ...current, project: current.project || loadedProjects.find((item) => item.is_active)?.name || "" }));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!availableProjects.length) {
      setEntryForm((current) => ({ ...current, project: "" }));
      return;
    }
    if (!availableProjects.some((project) => project.name === entryForm.project)) {
      setEntryForm((current) => ({ ...current, project: availableProjects[0].name }));
    }
  }, [availableProjects, entryForm.project]);

  const stats = useMemo(() => {
    const generatedByPerson = Object.fromEntries(people.map((person) => [person, 0])) as Record<string, number>;
    const paidByPerson = Object.fromEntries(people.map((person) => [person, 0])) as Record<string, number>;
    const pendingByPerson = Object.fromEntries(people.map((person) => [person, 0])) as Record<string, number>;
    const byProject = Object.fromEntries(projects.map((project) => [project.name, 0])) as Record<string, number>;
    let generatedTotal = 0;
    let paidTotal = 0;

    for (const entry of entries) {
      const total = getEntryTotal(projects, entry);
      generatedByPerson[entry.person] += total;
      byProject[entry.project] = (byProject[entry.project] || 0) + total;
      generatedTotal += total;
    }

    for (const payment of payments) {
      paidByPerson.Issa += Number(payment.issa_amount);
      paidByPerson.Eva += Number(payment.eva_amount);
      paidTotal += Number(payment.amount);
    }

    for (const person of people) pendingByPerson[person] = generatedByPerson[person] - paidByPerson[person];
    return { generatedByPerson, paidByPerson, pendingByPerson, byProject, generatedTotal, paidTotal, pendingTotal: generatedTotal - paidTotal };
  }, [entries, payments, projects]);

  async function handleEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const isReview = entryForm.work_type === "Reviewing";
    const amount = isReview ? Number(entryForm.hours || 0) + Number(entryForm.minutes || 0) / 60 : Number(entryForm.dr);

    if (!entryForm.project) setError("Primero crea o selecciona un proyecto válido.");
    else if (!amount || amount <= 0) setError("Introduce una cantidad válida.");
    else {
      const { error } = await supabase.from("entries").insert({
        person: entryForm.person,
        work_type: entryForm.work_type,
        project: entryForm.project,
        amount,
        unit: isReview ? "hours" : "DR",
        date: entryForm.date,
      });

      if (error) setError(error.message);
      else {
        setEntryForm((current) => ({ ...current, dr: "", hours: "", minutes: "" }));
        await loadData();
      }
    }

    setSaving(false);
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPayment(true);
    setError("");
    const amount = Number(paymentForm.amount);

    if (!amount || amount <= 0) setError("Introduce una cantidad recibida válida.");
    else {
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
    }

    setSavingPayment(false);
  }

  async function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProject(true);
    setError("");

    const name = projectForm.name.trim();
    const labelingRate = projectForm.supports_labeling ? Number(projectForm.labeling_rate) : null;
    const reviewingRate = projectForm.supports_reviewing ? Number(projectForm.reviewing_rate || defaultReviewRate) : null;

    if (!name) setError("Introduce el nombre del proyecto.");
    else if (!projectForm.supports_labeling && !projectForm.supports_reviewing) setError("El proyecto debe tener Labeling, Reviewing o ambos.");
    else if (projectForm.supports_labeling && (!labelingRate || labelingRate <= 0)) setError("Introduce una tarifa válida para Labeling.");
    else if (projectForm.supports_reviewing && (!reviewingRate || reviewingRate <= 0)) setError("Introduce una tarifa válida para Reviewing.");
    else {
      const { error } = await supabase.from("projects").insert({
        name,
        supports_labeling: projectForm.supports_labeling,
        supports_reviewing: projectForm.supports_reviewing,
        labeling_rate: labelingRate,
        reviewing_rate: reviewingRate,
      });
      if (error) setError(error.message);
      else {
        setProjectForm(initialProjectForm);
        await loadData();
      }
    }

    setSavingProject(false);
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("¿Eliminar este registro?")) return;
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) setError(error.message);
    else setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  async function deletePayment(id: string) {
    if (!window.confirm("¿Eliminar este pago recibido?")) return;
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) setError(error.message);
    else setPayments((current) => current.filter((payment) => payment.id !== id));
  }

  async function toggleProject(project: Project) {
    const { error } = await supabase.from("projects").update({ is_active: !project.is_active }).eq("id", project.id);
    if (error) setError(error.message);
    else setProjects((current) => current.map((item) => (item.id === project.id ? { ...item, is_active: !item.is_active } : item)));
  }

  const splitAmount = Number(paymentForm.amount || 0) / 2;
  const recentEntries = entries.slice(0, 6);
  const recentPayments = payments.slice(0, 5);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
      <nav className="sticky top-3 z-20 mb-5 grid grid-cols-2 gap-2 rounded-full border border-white/70 bg-white/70 p-2 shadow-lg backdrop-blur-2xl">
        <button onClick={() => setView("home")} className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-black transition ${view === "home" ? "bg-slate-950 text-white" : "text-slate-600"}`}><HomeIcon size={17} /> Inicio</button>
        <button onClick={() => setView("projects")} className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-black transition ${view === "projects" ? "bg-slate-950 text-white" : "text-slate-600"}`}><Settings2 size={17} /> Proyectos</button>
      </nav>

      {error && <div className="mb-4 rounded-3xl border border-red-200 bg-red-50/80 p-4 text-sm font-semibold text-red-700 shadow-sm backdrop-blur">{error}</div>}

      {view === "home" ? (
        <>
          <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/55 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:p-8">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/25 blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/65 px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-slate-700 shadow-sm backdrop-blur"><Sparkles size={14} className="text-brand" /> Earnings</div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Pendiente por cobrar</p>
                <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">{money(stats.pendingTotal)}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">Generado: {money(stats.generatedTotal)} · Cobrado: {money(stats.paidTotal)}</p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-white/80 bg-slate-950 text-white shadow-xl"><WalletCards size={28} /></div>
            </div>
            <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={<UserRound size={16} />} label="Issa pendiente" value={money(stats.pendingByPerson.Issa)} sub={`Cobrado ${money(stats.paidByPerson.Issa)}`} />
              <Stat icon={<UsersRound size={16} />} label="Eva pendiente" value={money(stats.pendingByPerson.Eva)} sub={`Cobrado ${money(stats.paidByPerson.Eva)}`} />
              <Stat icon={<Banknote size={16} />} label="Cobrado" value={money(stats.paidTotal)} />
              <Stat icon={<BadgeDollarSign size={16} />} label="Generado" value={money(stats.generatedTotal)} green />
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[420px_1fr]">
            <div className="grid gap-5">
              <form onSubmit={handleEntrySubmit} className="glass-card">
                <SectionTitle icon={<Plus size={19} />} title="Nuevo registro" subtitle="Añade trabajo generado." />
                <div className="grid gap-4">
                  <SelectLabel icon={<UserRound size={16} />} label="Persona" value={entryForm.person} onChange={(value) => setEntryForm({ ...entryForm, person: value as "Eva" | "Issa" })} options={people.map((person) => ({ label: person, value: person }))} />
                  <div className="grid grid-cols-2 gap-3">{workTypes.map((type) => <button key={type} type="button" onClick={() => setEntryForm({ ...entryForm, work_type: type })} className={`rounded-3xl border p-4 text-left transition ${entryForm.work_type === type ? "border-slate-950 bg-slate-950 text-white shadow-xl" : "border-white/70 bg-white/65 text-slate-700 backdrop-blur"}`}>{type === "Labeling" ? <FileText size={20} className={entryForm.work_type === type ? "text-brand" : "text-slate-500"} /> : <Clock3 size={20} className={entryForm.work_type === type ? "text-brand" : "text-slate-500"} />}<p className="mt-3 text-sm font-black">{type}</p></button>)}</div>
                  <SelectLabel icon={<Layers3 size={16} />} label="Proyecto" value={entryForm.project} onChange={(value) => setEntryForm({ ...entryForm, project: value })} options={availableProjects.map((project) => ({ label: project.name, value: project.name }))} />
                  {entryForm.work_type === "Labeling" ? <InputLabel icon={<Coins size={16} />} label="DR realizados" value={entryForm.dr} onChange={(value) => setEntryForm({ ...entryForm, dr: value })} placeholder="Ej: 60" /> : <div className="grid grid-cols-2 gap-3"><InputLabel icon={<Clock3 size={16} />} label="Horas" value={entryForm.hours} onChange={(value) => setEntryForm({ ...entryForm, hours: value })} placeholder="3" /><InputLabel icon={<Clock3 size={16} />} label="Min" value={entryForm.minutes} onChange={(value) => setEntryForm({ ...entryForm, minutes: value })} placeholder="30" max="59" /></div>}
                  <InputLabel icon={<CalendarDays size={16} />} label="Fecha" type="date" value={entryForm.date} onChange={(value) => setEntryForm({ ...entryForm, date: value })} />
                  <button disabled={saving} className="main-button"><Plus size={20} className="text-brand" /> {saving ? "Guardando..." : "Guardar trabajo"}</button>
                </div>
              </form>

              <form onSubmit={handlePaymentSubmit} className="glass-card">
                <SectionTitle icon={<HandCoins size={19} />} title="Pago recibido" subtitle="Se divide 50% / 50%." />
                <div className="grid gap-4">
                  <InputLabel icon={<Banknote size={16} />} label="Cantidad recibida" value={paymentForm.amount} onChange={(value) => setPaymentForm({ ...paymentForm, amount: value })} placeholder="Ej: 200" step="0.01" />
                  <div className="grid grid-cols-2 gap-3"><MiniAmount label="Issa recibe" value={money(splitAmount)} /><MiniAmount label="Eva recibe" value={money(splitAmount)} /></div>
                  <InputLabel icon={<CalendarDays size={16} />} label="Fecha" type="date" value={paymentForm.date} onChange={(value) => setPaymentForm({ ...paymentForm, date: value })} />
                  <InputLabel icon={<ReceiptText size={16} />} label="Nota" type="text" value={paymentForm.note} onChange={(value) => setPaymentForm({ ...paymentForm, note: value })} placeholder="Ej: Primer pago" />
                  <button disabled={savingPayment} className="green-button"><Scale size={20} /> {savingPayment ? "Guardando..." : "Registrar pago"}</button>
                </div>
              </form>
            </div>

            <div className="grid gap-5">
              <ListSection title="Proyectos" subtitle="Totales generados" icon={<BriefcaseBusiness size={19} />}>
                <div className="grid gap-3 sm:grid-cols-2">{projects.map((project) => { const Icon = projectIcon(project.name); return <article key={project.id} className="mini-card"><div className="mb-4 flex items-center justify-between"><div className="icon-dark"><Icon size={20} className="text-brand" /></div><p className="rounded-full bg-slate-950/5 px-3 py-1 text-xs font-black text-slate-500">{project.supports_labeling ? `$${project.labeling_rate}/DR` : ""} {project.supports_reviewing ? `$${project.reviewing_rate}/h` : ""}</p></div><p className="text-sm font-bold text-slate-500">{project.name}</p><p className="mt-1 text-2xl font-black text-slate-950">{money(stats.byProject[project.name] || 0)}</p></article>; })}</div>
              </ListSection>

              <ListSection title="Pagos" subtitle="Dinero ya repartido" icon={<HandCoins size={19} />}>
                <div className="grid gap-3">{recentPayments.map((payment) => <article key={payment.id} className="mini-card"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-slate-950"><Banknote size={21} /></div><div><p className="font-black text-slate-950">{money(Number(payment.amount))}</p><p className="text-xs font-bold text-slate-500">Issa {money(Number(payment.issa_amount))} · Eva {money(Number(payment.eva_amount))}</p></div></div><button onClick={() => deletePayment(payment.id)} className="delete-button"><Trash2 size={13} /></button></div>{payment.note && <p className="mt-3 rounded-2xl bg-slate-950/5 px-3 py-2 text-xs font-bold text-slate-500">{payment.note}</p>}</article>)}</div>
              </ListSection>

              <ListSection title="Actividad" subtitle="Últimos trabajos" icon={loading ? undefined : <BriefcaseBusiness size={19} />}>
                <div className="grid gap-3">{recentEntries.map((entry) => { const Icon = projectIcon(entry.project); return <article key={entry.id} className="mini-card"><div className="flex items-center gap-3"><div className="icon-dark"><Icon size={20} className="text-brand" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{entry.project}</p><p className="mt-1 text-xs font-bold text-slate-500">{entry.person} · {entry.work_type} · {formatDate(entry.date)}</p></div><div className="text-right"><p className="text-lg font-black text-slate-950">{money(getEntryTotal(projects, entry))}</p><p className="text-xs font-bold text-slate-500">{formatAmount(entry)}</p></div></div></div></div><div className="mt-3 flex justify-end"><button onClick={() => deleteEntry(entry.id)} className="delete-button"><Trash2 size={14} /> Eliminar</button></div></article>; })}</div>
              </ListSection>
            </div>
          </section>
        </>
      ) : (
        <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <form onSubmit={handleProjectSubmit} className="glass-card">
            <SectionTitle icon={<Settings2 size={19} />} title="Nuevo proyecto" subtitle="Puede tener Labeling, Reviewing o ambas." />
            <div className="grid gap-4">
              <InputLabel icon={<BriefcaseBusiness size={16} />} label="Nombre" type="text" value={projectForm.name} onChange={(value) => setProjectForm({ ...projectForm, name: value })} placeholder="Ej: WorldSim" />
              <div className="grid grid-cols-2 gap-3"><CheckButton active={projectForm.supports_labeling} label="Labeling" icon={<FileText size={20} />} onClick={() => setProjectForm({ ...projectForm, supports_labeling: !projectForm.supports_labeling })} /><CheckButton active={projectForm.supports_reviewing} label="Reviewing" icon={<Clock3 size={20} />} onClick={() => setProjectForm({ ...projectForm, supports_reviewing: !projectForm.supports_reviewing })} /></div>
              {projectForm.supports_labeling && <InputLabel icon={<Coins size={16} />} label="Tarifa Labeling ($/DR)" value={projectForm.labeling_rate} onChange={(value) => setProjectForm({ ...projectForm, labeling_rate: value })} placeholder="Ej: 1.50" step="0.01" />}
              {projectForm.supports_reviewing && <InputLabel icon={<Clock3 size={16} />} label="Tarifa Reviewing ($/h)" value={projectForm.reviewing_rate} onChange={(value) => setProjectForm({ ...projectForm, reviewing_rate: value })} placeholder="Ej: 25" step="0.01" />}
              <button disabled={savingProject} className="main-button"><Plus size={20} className="text-brand" /> {savingProject ? "Guardando..." : "Crear proyecto"}</button>
            </div>
          </form>

          <ListSection title="Gestión de proyectos" subtitle="Activa o pausa proyectos" icon={<Settings2 size={19} />}>
            <div className="grid gap-3 sm:grid-cols-2">{projects.map((project) => { const Icon = projectIcon(project.name); return <article key={project.id} className={`mini-card ${!project.is_active ? "opacity-55" : ""}`}><div className="mb-4 flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="icon-dark"><Icon size={20} className="text-brand" /></div><div><p className="font-black text-slate-950">{project.name}</p><p className="text-xs font-bold text-slate-500">{project.supports_labeling ? `Labeling $${project.labeling_rate}/DR` : ""} {project.supports_reviewing ? `Reviewing $${project.reviewing_rate}/h` : ""}</p></div></div><button onClick={() => toggleProject(project)} className={`rounded-full px-3 py-1.5 text-xs font-black ${project.is_active ? "bg-brand text-slate-950" : "bg-slate-950 text-white"}`}>{project.is_active ? "Activo" : "Pausado"}</button></div></article>; })}</div>
          </ListSection>
        </section>
      )}
    </main>
  );
}

function Stat({ icon, label, value, sub, green = false }: { icon: React.ReactNode; label: string; value: string; sub?: string; green?: boolean }) {
  return <div className={`rounded-3xl border border-white/70 p-4 shadow-sm backdrop-blur ${green ? "bg-brand/80 text-slate-950" : "bg-white/60"}`}><div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-500">{icon} {label}</div><p className="text-2xl font-black text-slate-950">{value}</p>{sub && <p className="mt-1 text-xs font-bold text-slate-500">{sub}</p>}</div>;
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return <div className="mb-5 flex items-center gap-3"><FieldIcon>{icon}</FieldIcon><div><h2 className="text-xl font-black text-slate-950">{title}</h2><p className="text-sm text-slate-500">{subtitle}</p></div></div>;
}

function ListSection({ title, subtitle, icon, children }: { title: string; subtitle: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <section className="glass-card"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">{title}</h2><p className="text-sm text-slate-500">{subtitle}</p></div>{icon && <FieldIcon>{icon}</FieldIcon>}</div>{children}</section>;
}

function InputLabel({ icon, label, value, onChange, placeholder, type = "number", step = "1", max }: { icon: React.ReactNode; label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; step?: string; max?: string }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="flex items-center gap-2">{icon} {label}</span><input className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 text-lg font-black text-slate-950 outline-none backdrop-blur transition placeholder:text-slate-400 focus:ring-4 focus:ring-brand/20" type={type} min={type === "number" ? "0" : undefined} max={max} step={type === "number" ? step : undefined} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}

function SelectLabel({ icon, label, value, onChange, options }: { icon: React.ReactNode; label: string; value: string; onChange: (value: string) => void; options: { label: string; value: string }[] }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="flex items-center gap-2">{icon} {label}</span><select className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 font-bold text-slate-900 outline-none backdrop-blur transition focus:ring-4 focus:ring-brand/20" value={value} onChange={(e) => onChange(e.target.value)}>{options.length ? options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>) : <option value="">Sin proyectos</option>}</select></label>;
}

function CheckButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-3xl border p-4 text-left transition ${active ? "border-slate-950 bg-slate-950 text-white shadow-xl" : "border-white/70 bg-white/65 text-slate-700 backdrop-blur"}`}>{icon}<p className="mt-3 text-sm font-black">{label}</p></button>;
}

function MiniAmount({ label, value }: { label: string; value: string }) {
  return <div className="rounded-3xl border border-white/70 bg-white/65 p-4 backdrop-blur"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div>;
}
