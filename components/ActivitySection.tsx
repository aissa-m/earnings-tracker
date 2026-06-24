"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Check, ChevronLeft, ChevronRight, FileText, Layers3, PencilLine, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { Entry, Project, supabase } from "@/lib/supabase";

const people = ["Eva", "Issa"] as const;
const defaultReviewRate = 25;
const pageSize = 6;

type EditForm = {
  project_id: string;
  amount: string;
  hours: string;
  minutes: string;
};

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

function getEditableProjects(projects: Project[], entry: Entry) {
  const currentProject = resolveProject(projects, entry);
  return projects.filter((project) => {
    const supportsType = entry.work_type === "Labeling" ? project.supports_labeling : project.supports_reviewing;
    return supportsType || project.id === currentProject?.id;
  });
}

function getInitialEditForm(projects: Project[], entry: Entry): EditForm {
  const project = resolveProject(projects, entry);
  const fallbackProject = getEditableProjects(projects, entry)[0];
  const totalMinutes = Math.round(Number(entry.amount) * 60);

  return {
    project_id: project?.id ?? fallbackProject?.id ?? "",
    amount: entry.unit === "DR" ? String(entry.amount) : "",
    hours: entry.unit === "hours" ? String(Math.floor(totalMinutes / 60)) : "",
    minutes: entry.unit === "hours" ? String(totalMinutes % 60) : "",
  };
}

export default function ActivitySection({ entries, projects, onDelete, onSaved }: { entries: Entry[]; projects: Project[]; onDelete: (id: string) => void; onSaved: () => Promise<void> }) {
  const [personFilter, setPersonFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ project_id: "", amount: "", hours: "", minutes: "" });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const project = resolveProject(projects, entry);
      const matchesPerson = personFilter === "all" || entry.person === personFilter;
      const matchesProject = projectFilter === "all" || project?.id === projectFilter || entry.project_id === projectFilter;
      return matchesPerson && matchesProject;
    });
  }, [entries, projects, personFilter, projectFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
    setEditingId(null);
    setError("");
  }, [personFilter, projectFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function startEdit(entry: Entry) {
    const form = getInitialEditForm(projects, entry);
    setError("");
    setEditingId(entry.id);
    setEditForm(form);
  }

  function cancelEdit() {
    setError("");
    setEditingId(null);
    setEditForm({ project_id: "", amount: "", hours: "", minutes: "" });
  }

  async function saveEdit(entry: Entry) {
    setError("");
    setSavingId(entry.id);

    const project = projects.find((item) => item.id === editForm.project_id);
    const minutes = Number(editForm.minutes || 0);
    const amount = entry.unit === "DR" ? Number(editForm.amount) : Number(editForm.hours || 0) + minutes / 60;

    if (!project) setError("Selecciona un proyecto válido.");
    else if (entry.unit === "hours" && (minutes < 0 || minutes > 59)) setError("Los minutos deben estar entre 0 y 59.");
    else if (!amount || amount <= 0) setError("Introduce una cantidad válida.");
    else {
      const { data, error: updateError } = await supabase
        .from("entries")
        .update({ project_id: project.id, project: project.name, amount })
        .eq("id", entry.id)
        .select("id")
        .single();

      if (updateError) setError(updateError.message);
      else if (!data?.id) setError("No se ha podido actualizar el registro.");
      else {
        cancelEdit();
        await onSaved();
      }
    }

    setSavingId(null);
  }

  return (
    <section className="glass-card">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Actividad</h2>
          <p className="text-sm text-slate-500">{filteredEntries.length} de {entries.length} registros</p>
        </div>
        <FieldIcon><BriefcaseBusiness size={19} /></FieldIcon>
      </div>

      {error && <div className="mb-4 rounded-3xl border border-red-200 bg-red-50/80 p-4 text-sm font-bold text-red-700">{error}</div>}

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
        <>
          <div className="grid gap-3">
            {visibleEntries.map((entry) => {
              const name = entryProjectName(projects, entry);
              const Icon = projectIcon(name);
              const isEditing = editingId === entry.id;
              const editableProjects = getEditableProjects(projects, entry);

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

                  {isEditing && (
                    <div className="mt-4 grid gap-3 rounded-3xl border border-white/70 bg-white/50 p-3">
                      <label className="grid gap-2 text-sm font-bold text-slate-700">
                        Proyecto
                        <select className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 font-bold text-slate-900 outline-none backdrop-blur transition focus:ring-4 focus:ring-brand/20" value={editForm.project_id} onChange={(event) => setEditForm({ ...editForm, project_id: event.target.value })}>
                          {editableProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                        </select>
                      </label>

                      {entry.unit === "DR" ? (
                        <label className="grid gap-2 text-sm font-bold text-slate-700">
                          DR realizados
                          <input className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 text-lg font-black text-slate-950 outline-none backdrop-blur transition placeholder:text-slate-400 focus:ring-4 focus:ring-brand/20" type="number" min="0" step="1" value={editForm.amount} onChange={(event) => setEditForm({ ...editForm, amount: event.target.value })} />
                        </label>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <label className="grid gap-2 text-sm font-bold text-slate-700">
                            Horas
                            <input className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 text-lg font-black text-slate-950 outline-none backdrop-blur transition placeholder:text-slate-400 focus:ring-4 focus:ring-brand/20" type="number" min="0" step="1" value={editForm.hours} onChange={(event) => setEditForm({ ...editForm, hours: event.target.value })} />
                          </label>
                          <label className="grid gap-2 text-sm font-bold text-slate-700">
                            Min
                            <input className="rounded-3xl border border-white/70 bg-white/70 px-4 py-3 text-lg font-black text-slate-950 outline-none backdrop-blur transition placeholder:text-slate-400 focus:ring-4 focus:ring-brand/20" type="number" min="0" max="59" step="1" value={editForm.minutes} onChange={(event) => setEditForm({ ...editForm, minutes: event.target.value })} />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {isEditing ? (
                      <>
                        <button type="button" onClick={() => saveEdit(entry)} disabled={savingId === entry.id} className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-black text-slate-950 transition active:scale-[0.98]"><Check size={14} /> {savingId === entry.id ? "Guardando..." : "Guardar"}</button>
                        <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-950/5"><RotateCcw size={14} /> Cancelar</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => startEdit(entry)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-950/5"><PencilLine size={14} /> Editar</button>
                    )}
                    <button type="button" onClick={() => onDelete(entry.id)} className="delete-button"><Trash2 size={14} /> Eliminar</button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center text-xs font-black text-slate-500 sm:text-left">Página {currentPage} de {totalPages}</p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition active:scale-[0.98] disabled:opacity-35"><ChevronLeft size={17} /> Anterior</button>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition active:scale-[0.98] disabled:opacity-35">Siguiente <ChevronRight size={17} /></button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/45 p-6 text-center text-sm font-bold text-slate-500">
          No hay registros con esos filtros.
        </div>
      )}
    </section>
  );
}
