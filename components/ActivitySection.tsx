"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, Layers3, Sparkles, FileText, Trash2 } from "lucide-react";
import { Entry, Project } from "@/lib/supabase";

const people = ["Eva", "Issa"] as const;
const defaultReviewRate = 25;

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

function resolveProject(projects: Project[], entry: Entry) {
  return projects.find((project) => project.id === entry.project_id) ?? projects.find((project) => project.name === entry.project) ?? null;
}

function entryProjectName(projects: Project[], entry: Entry) {
  return resolveProject(projects, entry)?.name ?? entry.project;
}

function entryTotal(projects: Project[], entry: Entry) {
  const project = resolveProject(projects, entry);
  const rate = entry.work_type === "Reviewing" ? Number(project?.reviewing_rate ?? defaultReviewRate) : Number(project?.labeling_rate ?? 0);
  return Number(entry.amount) * rate;
}

function projectIcon(projectName: string) {
  const name = projectName.toLowerCase();
  if (name.includes("dense")) return Layers3;
  if (name.includes("text")) return Sparkles;
  return FileText;
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/55 text-slate-700 shadow-sm backdrop-blur">{children}</span>;
}

export default function ActivitySection({ entries, projects, onDelete }: { entries: Entry[]; projects: Project[]; onDelete: (id: string) => void }) {
  const [personFilter, setPersonFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const project = resolveProject(projects, entry);
      const matchesPerson = personFilter === "all" || entry.person === personFilter;
      const matchesProject = projectFilter === "all" || project?.id === projectFilter || entry.project_id === projectFilter;
      return matchesPerson && matchesProject;
    });
  }, [entries, projects, personFilter, projectFilter]);

  return (
    <section className="glass-card">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Actividad</h2>
          <p className="text-sm text-slate-500">{filteredEntries.length} de {entries.length} registros</p>
        </div>
        <FieldIcon><BriefcaseBusiness size={19} /></FieldIcon>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Persona
          <select className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 font-bold text-slate-900 outline-none backdrop-blur transition focus:ring-4 focus:ring-brand/20" value={personFilter} onChange={(event) => setPersonFilter(event.target.value)}>
            <option value="all">Todas</option>
            {people.map((person) => <option key={person} value={person}>{person}</option>)}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Proyecto
          <select className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 font-bold text-slate-900 outline-none backdrop-blur transition focus:ring-4 focus:ring-brand/20" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            <option value="all">Todos</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
      </div>

      {filteredEntries.length ? (
        <div className="grid gap-3">
          {filteredEntries.map((entry) => {
            const name = entryProjectName(projects, entry);
            const Icon = projectIcon(name);

            return (
              <article key={entry.id} className="mini-card">
                <div className="flex items-center gap-3">
                  <div className="icon-dark"><Icon size={20} className="text-brand" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{name}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{entry.person} · {entry.work_type} · {formatDate(entry.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-950">{money(entryTotal(projects, entry))}</p>
                        <p className="text-xs font-bold text-slate-500">{formatAmount(entry)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button onClick={() => onDelete(entry.id)} className="delete-button"><Trash2 size={14} /> Eliminar</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/45 p-6 text-center text-sm font-bold text-slate-500">
          No hay registros con esos filtros.
        </div>
      )}
    </section>
  );
}
