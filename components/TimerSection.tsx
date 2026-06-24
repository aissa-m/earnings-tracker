"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock3, Pause, Play, Plus, Trash2 } from "lucide-react";
import { Project, WorkType } from "@/lib/supabase";

type TimerStatus = "running" | "paused";

type WorkTimer = {
  id: string;
  project: string;
  work_type: WorkType;
  note: string;
  status: TimerStatus;
  started_at: number;
  updated_at: number;
  paused_at?: number | null;
  elapsed_seconds: number;
};

type TimerForm = {
  project: string;
  work_type: WorkType;
  note: string;
};

const storageKey = "dinerico_work_timers";

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, "0")).join(":");
}

function formatTime(timestamp?: number | null) {
  if (!timestamp) return "--:--";

  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getTimerSeconds(timer: WorkTimer, now: number) {
  if (timer.status === "paused") return timer.elapsed_seconds;
  return timer.elapsed_seconds + Math.floor((now - timer.updated_at) / 1000);
}

function readTimers() {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WorkTimer[]) : [];
  } catch {
    return [];
  }
}

export default function TimerSection({ projects }: { projects: Project[] }) {
  const [timers, setTimers] = useState<WorkTimer[]>([]);
  const [now, setNow] = useState(Date.now());
  const activeProjects = useMemo(() => projects.filter((project) => project.is_active), [projects]);
  const [form, setForm] = useState<TimerForm>({ project: "", work_type: "Reviewing", note: "" });

  useEffect(() => {
    setTimers(readTimers());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(timers));
  }, [timers]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeProjects.length) {
      setForm((current) => ({ ...current, project: "" }));
      return;
    }

    if (!activeProjects.some((project) => project.name === form.project)) {
      setForm((current) => ({ ...current, project: activeProjects[0].name }));
    }
  }, [activeProjects, form.project]);

  function createTimer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.project) return;

    const timestamp = Date.now();
    const timer: WorkTimer = {
      id: crypto.randomUUID(),
      project: form.project,
      work_type: form.work_type,
      note: form.note.trim(),
      status: "running",
      started_at: timestamp,
      updated_at: timestamp,
      paused_at: null,
      elapsed_seconds: 0,
    };

    setTimers((current) => [timer, ...current]);
    setForm((current) => ({ ...current, note: "" }));
  }

  function pauseTimer(timer: WorkTimer) {
    const timestamp = Date.now();
    setTimers((current) =>
      current.map((item) =>
        item.id === timer.id
          ? { ...item, status: "paused", elapsed_seconds: getTimerSeconds(item, timestamp), updated_at: timestamp, paused_at: timestamp }
          : item
      )
    );
  }

  function resumeTimer(timer: WorkTimer) {
    const timestamp = Date.now();
    setTimers((current) => current.map((item) => (item.id === timer.id ? { ...item, status: "running", updated_at: timestamp, paused_at: null } : item)));
  }

  function deleteTimer(id: string) {
    if (!window.confirm("¿Eliminar este temporizador?")) return;
    setTimers((current) => current.filter((timer) => timer.id !== id));
  }

  const totalRunning = timers.filter((timer) => timer.status === "running").length;

  return (
    <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <form onSubmit={createTimer} className="glass-card">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-brand shadow-lg"><Clock3 size={22} /></span>
          <div>
            <h2 className="text-xl font-black text-slate-950">Nuevo temporizador</h2>
            <p className="text-sm text-slate-500">Crea varios timers a la vez.</p>
          </div>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Proyecto
            <select className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 font-bold text-slate-900 outline-none backdrop-blur transition focus:ring-4 focus:ring-brand/20" value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })}>
              {activeProjects.length ? activeProjects.map((project) => <option key={project.id} value={project.name}>{project.name}</option>) : <option value="">Sin proyectos activos</option>}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            {(["Labeling", "Reviewing"] as WorkType[]).map((type) => (
              <button key={type} type="button" onClick={() => setForm({ ...form, work_type: type })} className={`rounded-3xl border p-4 text-left transition ${form.work_type === type ? "border-slate-950 bg-slate-950 text-white shadow-xl" : "border-white/70 bg-white/65 text-slate-700 backdrop-blur"}`}>
                {type === "Labeling" ? <span className="text-lg font-black">DR</span> : <Clock3 size={22} className={form.work_type === type ? "text-brand" : "text-slate-500"} />}
                <p className="mt-3 text-sm font-black">{type}</p>
              </button>
            ))}
          </div>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Nota opcional
            <input className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 text-lg font-black text-slate-950 outline-none backdrop-blur transition placeholder:text-slate-400 focus:ring-4 focus:ring-brand/20" type="text" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Ej: tanda de revisión" />
          </label>

          <button disabled={!form.project} className="main-button"><Plus size={20} className="text-brand" /> Crear temporizador</button>
        </div>
      </form>

      <div className="glass-card">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Temporizadores activos</h2>
            <p className="text-sm text-slate-500">{timers.length} creados · {totalRunning} en marcha</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-2xl bg-slate-950/5 px-3 py-2 text-xs font-black text-slate-500"><Clock3 size={15} /> LocalStorage</span>
        </div>

        {timers.length ? (
          <div className="grid gap-3">
            {timers.map((timer) => {
              const seconds = getTimerSeconds(timer, now);
              return (
                <article key={timer.id} className="mini-card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-950">{timer.project}</p>
                        <span className="rounded-full bg-slate-950/5 px-3 py-1 text-xs font-black text-slate-500">{timer.work_type}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${timer.status === "running" ? "bg-brand text-slate-950" : "bg-slate-950 text-white"}`}>{timer.status === "running" ? "En marcha" : "Pausado"}</span>
                      </div>
                      {timer.note && <p className="mt-2 text-sm font-semibold text-slate-500">{timer.note}</p>}
                      <div className="mt-3 grid gap-2 text-xs font-black text-slate-500 sm:grid-cols-2">
                        <span className="rounded-2xl bg-slate-950/5 px-3 py-2">Inicio: {formatTime(timer.started_at)}</span>
                        {timer.status === "paused" && <span className="rounded-2xl bg-slate-950/5 px-3 py-2">Pausado: {formatTime(timer.paused_at ?? timer.updated_at)}</span>}
                      </div>
                    </div>

                    <p className="text-4xl font-black tabular-nums tracking-tight text-slate-950 sm:text-right">{formatDuration(seconds)}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                    {timer.status === "running" ? (
                      <button onClick={() => pauseTimer(timer)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition active:scale-[0.98]"><Pause size={17} className="text-brand" /> Pausar</button>
                    ) : (
                      <button onClick={() => resumeTimer(timer)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-black text-slate-950 transition active:scale-[0.98]"><Play size={17} /> Reanudar</button>
                    )}
                    <button onClick={() => deleteTimer(timer.id)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-500 transition active:scale-[0.98]"><Trash2 size={17} /> Eliminar</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white/45 p-6 text-center">
            <Clock3 size={42} className="text-slate-300" />
            <h3 className="mt-4 text-2xl font-black text-slate-950">Sin temporizadores</h3>
            <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">Crea un temporizador para empezar a contar tiempo por proyecto.</p>
          </div>
        )}
      </div>
    </section>
  );
}
