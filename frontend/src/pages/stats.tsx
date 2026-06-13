// src/pages/stats.tsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { surgicalCaseService } from "@/services/surgicalCaseService";
import { useAuth } from "@/shared/contexts/AuthContext";
import type { CaseStats } from "@/types/surgical-case";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Activity, Users, TrendingUp, TrendingDown,
  Hospital, Minus, BarChart2, Zap,
  CheckCircle2, Clock, FileText, DollarSign, ChevronRight,
  Lock, Star, ShieldCheck,
} from "lucide-react";

function DeltaBadge({ current, previous, unit = "" }: { current: number; previous: number; unit?: string }) {
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
      {up ? "+" : "-"}{pct}% {unit} vs mes anterior
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent = false, iconColor = "" }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: React.ReactNode; accent?: boolean; iconColor?: string;
}) {
  return (
    <div className={`border rounded-2xl p-5 flex flex-col gap-2 ${accent ? "bg-primary/5 border-primary/20" : "bg-card"}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        {label}
      </div>
      <div className="text-2xl sm:text-3xl font-black text-foreground leading-none">{value}</div>
      {sub && <div>{sub}</div>}
    </div>
  );
}

type ChartMode = "cirugias" | "rvu" | "ambos";

export default function StatsPage() {
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<ChartMode>("ambos");
  const [procedureSort, setProcedureSort] = useState<"count" | "rvu">("count");
  const [pipelinePeriod, setPipelinePeriod] = useState<"all" | "month" | "week">("all");
  const { user } = useAuth();
  const isPremium = user?.plan === 'premium';

  useEffect(() => {
    if (!isPremium) return; // don't fetch for free users
    surgicalCaseService.getStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, [isPremium]);

  // ── Paywall for free users ───────────────────────────────────
  if (!isPremium) {
    return (
      <AppLayout>
        <div className="relative overflow-hidden rounded-2xl">
          {/* Blurred preview */}
          <div className="blur-md pointer-events-none select-none opacity-50">
            <div className="space-y-6 max-w-5xl mx-auto pb-10">
              <div className="border-b pb-4">
                <h1 className="text-3xl font-semibold tracking-tight mb-1">Estadísticas</h1>
                <p className="text-muted-foreground">Tu actividad clínica de un vistazo</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["Cirugías totales", "Activas", "Cobradas", "Colegas"].map(l => (
                  <div key={l} className="bg-card border rounded-2xl p-5">
                    <div className="text-sm text-muted-foreground mb-2">{l}</div>
                    <div className="text-3xl font-black">--</div>
                  </div>
                ))}
              </div>
              <div className="bg-card border rounded-2xl p-5 h-64" />
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-card border rounded-2xl p-5 h-48" />
                <div className="bg-card border rounded-2xl p-5 h-48" />
              </div>
            </div>
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-card/95 backdrop-blur-sm border border-primary/20 rounded-3xl p-10 text-center max-w-sm shadow-2xl mx-4">
              <div className="inline-flex p-4 bg-primary/10 rounded-full mb-5">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Solo Premium</span>
              </div>
              <h2 className="text-xl font-black mb-3">Estadísticas avanzadas</h2>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                Accede a tu pipeline de cirugías, RVU por mes, top procedimientos y hospitales.
                Disponible solo en el plan Premium.
              </p>
              <Link
                to="/settings"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                <Star className="h-4 w-4 fill-white" />
                Ver planes
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

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

  // Select pipeline dataset based on chosen period
  const pipelineData = pipelinePeriod === "week"
    ? stats.pipeline_week
    : pipelinePeriod === "month"
    ? stats.pipeline_month
    : stats.cases_by_status;

  const cScheduled = pipelineData.scheduled?.count ?? 0;
  const cCompleted = pipelineData.completed?.count ?? 0;
  const cBilled    = pipelineData.billed?.count ?? 0;
  const cPaid      = pipelineData.paid?.count ?? 0;
  const cancelled  = pipelineData.cancelled?.count ?? 0;
  const periodTotal = cScheduled + cCompleted + cBilled + cPaid + cancelled;

  // KPI: "Activas" = not yet closed (not paid, not cancelled)
  const active = cScheduled + cCompleted + cBilled;
  const maxPipeline = Math.max(periodTotal, 1);

  // Pipeline EXCLUSIVO — cada cirugía está en un solo estado
  // cScheduled  = sin operar todavía
  // cCompleted  = operada, pendiente de facturar
  // cBilled     = facturada, pendiente de cobrar
  // cPaid       = cobrada ✓
  const pipeline = [
    {
      key: "scheduled", label: "Programadas",
      count: cScheduled,
      sub: "sin operar todavía",
      icon: Clock, color: "text-blue-400", bar: "bg-blue-500",
    },
    {
      key: "completed", label: "Operadas",
      count: cCompleted,
      sub: "operadas, pendientes de factura",
      icon: CheckCircle2, color: "text-green-400", bar: "bg-green-500",
    },
    {
      key: "billed", label: "Facturadas",
      count: cBilled,
      sub: "facturadas, esperando cobro",
      icon: FileText, color: "text-yellow-400", bar: "bg-yellow-500",
    },
    {
      key: "paid", label: "Cobradas",
      count: cPaid,
      sub: "completamente cobradas ✓",
      icon: DollarSign, color: "text-emerald-400", bar: "bg-emerald-500",
    },
  ];

  const topProcedures = procedureSort === "count"
    ? stats.top_procedures
    : stats.top_procedures_by_rvu;
  const maxProcVal = topProcedures.length > 0
    ? Math.max(...topProcedures.map(p => procedureSort === "count" ? p.count : p.total_rvu))
    : 1;

  const maxHospitalRvu = stats.top_hospitals_by_rvu.length > 0
    ? Math.max(...stats.top_hospitals_by_rvu.map(h => h.total_rvu))
    : 1;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-10">

        {/* Header */}
        <div className="border-b pb-4">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">Estadísticas</h1>
          <p className="text-muted-foreground">Tu actividad clínica de un vistazo</p>
        </div>

        {/* KPI — Cirugías */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Activity}
            label="Cirugías totales"
            value={stats.total_cases}
            sub={<span className="text-xs text-muted-foreground">{stats.cases_this_month} este mes <DeltaBadge current={stats.cases_this_month} previous={stats.cases_last_month} /></span>}
          />
          <StatCard
            icon={CheckCircle2}
            label="Activas"
            value={active}
            iconColor="text-blue-400"
            sub={<span className="text-xs text-muted-foreground">programadas + operadas sin cobrar</span>}
          />
          <StatCard
            icon={DollarSign}
            label="Cobradas"
            value={cPaid}
            iconColor="text-emerald-400"
            sub={<span className="text-xs text-muted-foreground">de {stats.total_cases} totales</span>}
          />
          <StatCard
            icon={Users}
            label="Colegas este mes"
            value={stats.collaborators_this_month}
          />
        </div>

        {/* KPI — RVU */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Zap}
            label="RVU este mes"
            value={stats.rvu_this_month.toLocaleString('es-GT', { maximumFractionDigits: 1 })}
            sub={<DeltaBadge current={stats.rvu_this_month} previous={stats.rvu_last_month} unit="en RVU" />}
            accent
          />
          <StatCard icon={Zap} label="RVU total histórico"   value={stats.total_rvu.toLocaleString('es-GT', { maximumFractionDigits: 1 })} accent />
          <StatCard icon={Zap} label="RVU promedio / cirugía" value={stats.avg_rvu_per_case} accent />
          <StatCard icon={TrendingUp} label="Cirugías / semana (prom.)" value={stats.avg_per_week} />
        </div>

        {/* Pipeline de cirugías */}
        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="font-bold text-lg">Pipeline de cirugías</h2>
            <div className="flex gap-1 text-xs bg-muted rounded-lg p-1">
              {([["all", "Todo"], ["month", "Este mes"], ["week", "Esta semana"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setPipelinePeriod(val)}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    pipelinePeriod === val ? "bg-background shadow text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            {pipelinePeriod === "week" ? "Cirugías con fecha en esta semana" :
             pipelinePeriod === "month" ? "Cirugías con fecha en este mes" :
             "Todas tus cirugías históricas"}
          </p>

          {/* Funnel visual */}
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
            {pipeline.map((step, i) => (
              <div key={step.key} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={`flex-1 min-w-0 rounded-xl border p-3 text-center ${
                  step.count > 0 ? "border-border bg-muted/30" : "border-border/30 opacity-40"
                }`}>
                  <step.icon className={`h-5 w-5 mx-auto mb-1 ${step.color}`} />
                  <div className="text-xl sm:text-2xl font-black">{step.count}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{step.label}</div>
                </div>
                {i < pipeline.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Barras de progreso — escala relativa al total de cirugías */}
          <div className="space-y-2.5">
            {pipeline.map(step => {
              const pct = maxPipeline > 0 ? Math.round((step.count / maxPipeline) * 100) : 0;
              return (
                <div key={step.key} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-muted-foreground">{step.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${step.bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right font-bold shrink-0">{step.count}</span>
                  <span className="w-40 text-xs text-muted-foreground/60 hidden md:block">{step.sub}</span>
                </div>
              );
            })}
            {cancelled > 0 && (
              <div className="flex items-center gap-3 text-sm opacity-40">
                <span className="w-28 shrink-0 text-muted-foreground">Canceladas</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.round((cancelled / maxPipeline) * 100)}%` }} />
                </div>
                <span className="w-6 text-right font-bold shrink-0">{cancelled}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart — actividad mensual */}
        <div className="bg-card border rounded-2xl p-5" data-tutorial="stats-chart">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-bold text-lg">Actividad por mes</h2>
            <div className="flex gap-1 text-xs bg-muted rounded-lg p-1">
              {(["ambos", "cirugias", "rvu"] as ChartMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    chartMode === m ? "bg-background shadow text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {m === "ambos" ? "Ambos" : m === "cirugias" ? "Cirugías" : "RVU"}
                </button>
              ))}
            </div>
          </div>
          {stats.monthly_trend.every(m => m.count === 0 && m.rvu === 0) ? (
            <p className="text-muted-foreground text-sm text-center py-8">Sin datos en los últimos 6 meses</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.monthly_trend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  cursor={{ fill: "currentColor", opacity: 0.04 }}
                />
                {(chartMode === "cirugias" || chartMode === "ambos") && (
                  <Bar dataKey="count" name="Cirugías" fill="hsl(var(--primary))" radius={[4,4,0,0]} maxBarSize={36} />
                )}
                {(chartMode === "rvu" || chartMode === "ambos") && (
                  <Bar dataKey="rvu" name="RVU" fill="hsl(var(--primary) / 0.4)" radius={[4,4,0,0]} maxBarSize={36} />
                )}
                {chartMode === "ambos" && <Legend wrapperStyle={{ fontSize: 12 }} />}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top procedimientos + Hospitales por RVU */}
        <div className="grid md:grid-cols-2 gap-4">

          <div className="bg-card border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-bold text-lg">Top procedimientos</h2>
              <div className="flex gap-1 text-xs bg-muted rounded-lg p-1">
                <button onClick={() => setProcedureSort("count")} className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${procedureSort === "count" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
                  Por cantidad
                </button>
                <button onClick={() => setProcedureSort("rvu")} className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${procedureSort === "rvu" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
                  Por RVU
                </button>
              </div>
            </div>
            {topProcedures.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {topProcedures.map((p, i) => {
                  const val = procedureSort === "count" ? p.count : p.total_rvu;
                  const pct = maxProcVal > 0 ? Math.round((val / maxProcVal) * 100) : 0;
                  return (
                    <div key={p.name + i}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">{i + 1}</span>
                        <span className="flex-1 text-sm font-medium truncate">{p.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{p.count}× · <span className="text-primary font-bold">{p.total_rvu} RVU</span></span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden ml-7">
                        <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-1">Hospitales por RVU</h2>
            <p className="text-xs text-muted-foreground mb-4">Donde generas más unidades de valor relativo</p>
            {stats.top_hospitals_by_rvu.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {stats.top_hospitals_by_rvu.map((h, i) => {
                  const pct = maxHospitalRvu > 0 ? Math.round((h.total_rvu / maxHospitalRvu) * 100) : 0;
                  return (
                    <div key={h.name + i}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">{i + 1}</span>
                        <Hospital className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm font-medium truncate">{h.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{h.count} cir. · <span className="text-primary font-bold">{h.total_rvu} RVU</span></span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden ml-7">
                        <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Top seguros */}
        <div className="grid md:grid-cols-2 gap-4">

          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-1">Seguros por cirugías</h2>
            <p className="text-xs text-muted-foreground mb-4">Con qué seguros operás más frecuentemente</p>
            {stats.top_insurers_by_count.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin datos — registrá el seguro al crear una cirugía</p>
            ) : (
              <div className="space-y-3">
                {stats.top_insurers_by_count.map((ins, i) => {
                  const max = stats.top_insurers_by_count[0]?.count ?? 1;
                  const pct = Math.round((ins.count / max) * 100);
                  return (
                    <div key={ins.name + i}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">{i + 1}</span>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm font-medium truncate">{ins.name}</span>
                        <span className="shrink-0 text-xs font-bold text-primary">{ins.count} cir.</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden ml-7">
                        <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-1">Seguros por RVU</h2>
            <p className="text-xs text-muted-foreground mb-4">Con qué seguros generás más valor relativo</p>
            {stats.top_insurers_by_rvu.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin datos — registrá el seguro al crear una cirugía</p>
            ) : (
              <div className="space-y-3">
                {stats.top_insurers_by_rvu.map((ins, i) => {
                  const max = stats.top_insurers_by_rvu[0]?.total_rvu ?? 1;
                  const pct = Math.round((ins.total_rvu / max) * 100);
                  return (
                    <div key={ins.name + i}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">{i + 1}</span>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm font-medium truncate">{ins.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{ins.count} cir. · <span className="text-primary font-bold">{ins.total_rvu} RVU</span></span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden ml-7">
                        <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
