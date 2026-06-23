"use client";

import { FormEvent, useState } from "react";

export default function AccessPage() {
  const [user, setUser] = useState("");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: key }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || "No se ha podido acceder.");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="glass-card w-full max-w-md">
        <h1 className="text-3xl font-black text-slate-950">Dinerico</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">Acceso privado al panel.</p>

        {error && <div className="mt-5 rounded-3xl border border-red-200 bg-red-50/80 p-4 text-sm font-bold text-red-700">{error}</div>}

        <form onSubmit={submit} className="mt-6 grid gap-4">
          <input className="rounded-3xl border border-white/70 bg-white/75 px-4 py-4 text-lg font-black text-slate-950 outline-none backdrop-blur transition placeholder:text-slate-400 focus:ring-4 focus:ring-brand/20" value={user} onChange={(event) => setUser(event.target.value)} placeholder="Usuario" />
          <input className="rounded-3xl border border-white/70 bg-white/75 px-4 py-4 text-lg font-black text-slate-950 outline-none backdrop-blur transition placeholder:text-slate-400 focus:ring-4 focus:ring-brand/20" type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Clave" />
          <button disabled={loading} className="main-button">{loading ? "Entrando..." : "Entrar"}</button>
        </form>
      </section>
    </main>
  );
}
