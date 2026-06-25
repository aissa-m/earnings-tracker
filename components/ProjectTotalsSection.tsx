"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, ChevronLeft, ChevronRight, FileText, Layers3, Sparkles } from "lucide-react";
import { Project } from "@/lib/supabase";

const pageSize = 4;

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
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

export default function ProjectTotalsSection({ projects, totals }: { projects: Project[]; totals: Record<string, number> }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(projects.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleProjects = useMemo(() => projects.slice((currentPage - 1) * pageSize, currentPage * pageSize), [projects, currentPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <section className="glass-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">Proyectos</h2>
          <p className="text-sm text-slate-500">{projects.length} proyectos · totales generados</p>
        </div>
        <FieldIcon><BriefcaseBusiness size={19} /></FieldIcon>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleProjects.map((project) => {
          const Icon = projectIcon(project.name);
          return (
            <article key={project.id} className="mini-card">
              <div className="mb-4 flex items-center justify-between">
                <div className="icon-dark"><Icon size={20} className="text-brand" /></div>
                <p className="rounded-full bg-slate-950/5 px-3 py-1 text-xs font-black text-slate-500">
                  {project.supports_labeling ? `$${project.labeling_rate}/DR` : ""} {project.supports_reviewing ? `$${project.reviewing_rate}/h` : ""}
                </p>
              </div>
              <p className="text-sm font-bold text-slate-500">{project.name}</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{money(totals[project.id] || 0)}</p>
            </article>
          );
        })}
      </div>

      {projects.length > pageSize && (
        <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs font-black text-slate-500 sm:text-left">Página {currentPage} de {totalPages}</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition active:scale-[0.98] disabled:opacity-35"><ChevronLeft size={17} /> Anterior</button>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition active:scale-[0.98] disabled:opacity-35">Siguiente <ChevronRight size={17} /></button>
          </div>
        </div>
      )}
    </section>
  );
}
