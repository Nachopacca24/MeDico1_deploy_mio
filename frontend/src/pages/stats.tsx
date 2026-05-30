// src/pages/stats.tsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { surgicalCaseService } from "@/services/surgicalCaseService";
import type { CaseStats } from "@/types/surgical-case";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Activity, Stethoscope, Users, TrendingUp, TrendingDown,
  Hospital, Minus, Plus, BarChart2,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Programadas",
  completed: "Operadas",
  billed: "Facturadas",
  paid: "Cobradas",
  cancelled: "Canceladas",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  billed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  paid: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const diff = current - previous;
  if (diff === 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" /> igual que el mes pasado
    </span>
  );
  const pct = previous > 0 ? Math.round(Math.abs(diff / previous) * 100) : 100;
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-green-500" : "text-red-400"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : "-"}{pct}% vs mes anterior
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string | number; sub?: React.ReactNode;
}) {
  return (
    <div className="bg-card border rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-3xl font-black text-foreground">{value}</div>
      {sub && <div>{sub}</div>}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    surgicalCaseService.getStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!stats || stats.total_cases === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
          <BarChart2 className="h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-xl font-bold">Aún no hay datos</h2>
          <p className="text-muted-foreground max-w-sm">
            Registra tu primera cirugía para ver tus estadísticas clínicas aquí.
          </p>
          <Link
            to="/cases/new"
            className="bg-primary text-primary-foreground font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Registrar cirugía
          </Link>
        </div>
      </AppLayout>
    );
  }

  const specialties = Object.entries(stats.cases_by_specialty)
    .map(([name, val]) => ({ name, count: val.count }))
    .sort((a, b) => b.count - a.count);

  const totalSpecialtyCases = specialties.reduce((s, x) => s + x.count, 0);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-8">

        {/* Header */}
        <div className="border-b pb-4">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">Estadísticas</h1>
          <p className="text-muted-foreground">Tu actividad clínica de un vistazo</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Activity}
            label="Cirugías este mes"
            value={stats.cases_this_month}
            sub={<DeltaBadge current={stats.cases_this_month} previous={stats.cases_last_month} />}
          />
          <StatCard
            icon={Stethoscope}
            label="Procedimientos totales"
            value={stats.total_procedures}
          />
          <StatCard
            icon={Plus}
            label="Especialidades activas"
            value={stats.active_specialties}
          />
          <StatCard
            icon={Users}
            label="Colegas este mes"
            value={stats.collaborators_this_month}
          />
        </div>

        {/* Bar chart — cirugías por mes */}
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="font-bold text-lg mb-4">Cirugías por mes</h2>
          {stats.monthly_trend.every(m => m.count === 0) ? (
            <p className="text-muted-foreground text-sm text-center py-8">Sin datos en los últimos 6 meses</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.monthly_trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "currentColor", opacity: 0.5 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "currentColor", opacity: 0.5 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 13,
                  }}
                  formatter={(value: number) => [value, "Cirugías"]}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  cursor={{ fill: "currentColor", opacity: 0.04 }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Specialty + Status row */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Especialidades */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-4">Por especialidad</h2>
            {specialties.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {specialties.map(({ name, count }) => {
                  const pct = totalSpecialtyCases > 0 ? Math.round((count / totalSpecialtyCases) * 100) : 0;
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium truncate">{name}</span>
                        <span className="text-muted-foreground ml-2 shrink-0">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Estados */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-4">Por estado</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.cases_by_status)
                .filter(([, v]) => v.count > 0)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([key, val]) => (
                  <div
                    key={key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${STATUS_COLORS[key] ?? "bg-muted text-foreground border-border"}`}
                  >
                    <span>{STATUS_LABELS[key] ?? key}</span>
                    <span className="font-black">{val.count}</span>
                  </div>
                ))}
              {Object.values(stats.cases_by_status).every(v => v.count === 0) && (
                <p className="text-muted-foreground text-sm">Sin datos</p>
              )}
            </div>

            {/* Extra metrics */}
            <div className="mt-5 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Total cirugías</p>
                <p className="text-2xl font-black">{stats.total_cases}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Prom. por semana</p>
                <p className="text-2xl font-black">{stats.avg_per_week}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top procedures + hospitals row */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Top procedimientos */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-4">Top procedimientos</h2>
            {stats.top_procedures.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin datos</p>
            ) : (
              <ol className="space-y-3">
                {stats.top_procedures.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">{p.name}</span>
                    <span className="shrink-0 text-sm font-bold text-primary">{p.count}×</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Top hospitales */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-4">Hospitales frecuentes</h2>
            {stats.top_hospitals.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin datos</p>
            ) : (
              <ol className="space-y-3">
                {stats.top_hospitals.map((h, i) => (
                  <li key={h.name} className="flex items-center gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                    <Hospital className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm font-medium truncate">{h.name}</span>
                    <span className="shrink-0 text-sm font-bold text-primary">{h.count} cirugías</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
