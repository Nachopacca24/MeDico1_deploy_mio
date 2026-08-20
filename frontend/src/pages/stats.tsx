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
      <Minus className="h-3 w-3 shrink-0" />
      <span className="hidden sm:inline">igual que el mes pasado</span>
      <span className="sm:hidden">igual</span>
    </span>
  );
  const pct = previous > 0 ? Math.round(Math.abs(diff / previous) * 100) : 100;
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-green-500" : "text-red-400"}`}>
      {up ? <TrendingUp className="h-3 w-3 shrink-0" /> : <TrendingDown className="h-3 w-3 shrink-0" />}
      {up ? "+" : "-"}{pct}%
      <span className="hidden sm:inline"> {unit} vs mes anterior</span>
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent = false, iconColor = "" }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: React.ReactNode; accent?: boolean; iconColor?: string;
}) {
  return (
    <div className={`border rounded-xl sm:rounded-2xl p-2.5 sm:p-5 flex flex-col gap-1 sm:gap-2 min-w-0 overflow-hidden ${accent ? "bg-primary/5 border-primary/20" : "bg-card"}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm min-w-0">
        <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${iconColor}`} />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-xl sm:text-3xl font-black text-foreground leading-none">{value}</div>
      {sub && <div className="min-w-0 overflow-hidden">{sub}</div>}
    </div>
  );
}

type ChartMode = "cirugias" | "rvu" | "ambos";

export default function StatsPage() {
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>("ambos");
  const [procedureSort, setProcedureSort] = useState<"count" | "rvu">("count");
  const [pipelinePeriod, setPipelinePeriod] = useState<"all" | "month" | "week">("all");
  const { user } = useAuth();
  const isPremium = user?.has_premium_access;

  const loadStats = () => {
    setLoading(true);
    setLoadError(false);
    surgicalCaseService.getStats()
      .then(setStats)
      .catch(err => {
        // Without this, a network failure fell through to the same "Aún no
        // hay datos" screen as a genuinely empty account — misleading for a
        // Premium user who does have cases but hit a transient error.
        console.error('[stats] No se pudieron cargar las estadísticas:', err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isPremium) return; // don't fetch for free users
    loadStats();
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

  if (loadError) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
          <BarChart2 className="h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-xl font-bold">No se pudieron cargar las estadísticas</h2>
          <p className="text-muted-foreground max-w-sm">
            Hubo un problema de conexión. Intentá de nuevo.
          </p>
          <button
            onClick={loadStats}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Reintentar
          </button>
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
      key: "scheduled", label: "Programadas", shortLabel: "Prog.",
      count: cScheduled,
      sub: "sin operar todavía",
      icon: Clock, color: "text-blue-400", bar: "bg-blue-500",
    },
    {
      key: "completed", label: "Operadas", shortLabel: "Oper.",
      count: cCompleted,
      sub: "operadas, pendientes de factura",
      icon: CheckCircle2, color: "text-green-400", bar: "bg-green-500",
    },
    {
      key: "billed", label: "Facturadas", shortLabel: "Fact.",
      count: cBilled,
      sub: "facturadas, esperando cobro",
      icon: FileText, color: "text-yellow-400", bar: "bg-yellow-500",
    },
    {
      key: "paid", label: "Cobradas", shortLabel: "Cobr.",
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
      <div className="space-y-4 w-full pb-10">

        {/* Header */}
        <div className="border-b pb-3">
          <h1 className="text-2xl font-semibold tracking-tight mb-0.5">Estadísticas</h1>
          <p className="text-sm text-muted-foreground">Tu actividad clínica</p>
        </div>

        {/* KPI — Cirugías */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={Activity}
            label="Cirugías totales"
            value={stats.total_cases}
            sub={<span className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1">{stats.cases_this_month} este mes <DeltaBadge current={stats.cases_this_month} previous={stats.cases_last_month} /></span>}
          />
          <StatCard
            icon={CheckCircle2}
            label="Activas"
            value={active}
            iconColor="text-blue-400"
            sub={<span className="text-xs text-muted-foreground">sin cobrar</span>}
          />
          <StatCard
            icon={DollarSign}
            label="Cobradas"
            value={cPaid}
            iconColor="text-emerald-400"
            sub={<span className="text-xs text-muted-foreground">de {stats.total_cases}</span>}
          />
          <StatCard
            icon={Users}
            label="Colegas este mes"
            value={stats.collaborators_this_month}
          />
        </div>

        {/* KPI — RVU */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={Zap}
            label="RVU este mes"
            value={stats.rvu_this_month.toLocaleString('es-GT', { maximumFractionDigits: 1 })}
            sub={<DeltaBadge current={stats.rvu_this_month} previous={stats.rvu_last_month} unit="RVU" />}
            accent
          />
          <StatCard icon={Zap} label="RVU histórico" value={stats.total_rvu.toLocaleString('es-GT', { maximumFractionDigits: 1 })} accent />
          <StatCard icon={Zap} label="RVU / cirugía" value={stats.avg_rvu_per_case} accent />
          <StatCard icon={TrendingUp} label="Cir. / semana" value={stats.avg_per_week} />
        </div>

        {/* Pipeline de cirugías */}
        <div className="bg-card border rounded-xl p-3">
          <div className="flex items-center justify-between mb-2 gap-2">
            <h2 className="font-bold text-sm">Resumen de cirugías</h2>
            <div className="flex gap-0.5 text-xs bg-muted rounded-lg p-0.5 shrink-0">
              {([["all", "Todo"], ["month", "Mes"], ["week", "Sem."]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setPipelinePeriod(val)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                    pipelinePeriod === val ? "bg-background shadow text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {pipelinePeriod === "week" ? "Cirugías con fecha en esta semana" :
             pipelinePeriod === "month" ? "Cirugías con fecha en este mes" :
             "Todas tus cirugías históricas"}
          </p>

          {/* Funnel visual */}
          <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
            {pipeline.map((step, i) => (
              <div key={step.key} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={`flex-1 min-w-0 rounded-xl border p-2 text-center ${
                  step.count > 0 ? "border-border bg-muted/30" : "border-border/30 opacity-40"
                }`}>
                  <step.icon className={`h-4 w-4 mx-auto mb-0.5 ${step.color}`} />
                  <div className="text-lg font-black">{step.count}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{step.shortLabel}</div>
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
        <div className="bg-card border rounded-2xl p-3" data-tutorial="stats-chart">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-bold text-base">Actividad por mes</h2>
            <div className="flex gap-1 text-xs bg-muted rounded-lg p-1">
              {(["ambos", "cirugias", "rvu"] as ChartMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                    chartMode === m ? "bg-background shadow text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {m === "ambos" ? "Ambos" : m === "cirugias" ? "Cir." : "RVU"}
                </button>
              ))}
            </div>
          </div>
          {stats.monthly_trend.every(m => m.count === 0 && m.rvu === 0) ? (
            <p className="text-muted-foreground text-sm text-center py-8">Sin datos en los últimos 6 meses</p>
          ) : (
            <div className="w-full overflow-hidden">
              <ResponsiveContainer width="99%" height={180}>
                <BarChart data={stats.monthly_trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    cursor={{ fill: "currentColor", opacity: 0.04 }}
                  />
                  {(chartMode === "cirugias" || chartMode === "ambos") && (
                    <Bar dataKey="count" name="Cirugías" fill="hsl(var(--primary))" radius={[3,3,0,0]} maxBarSize={28} />
                  )}
                  {(chartMode === "rvu" || chartMode === "ambos") && (
                    <Bar dataKey="rvu" name="RVU" fill="hsl(var(--primary) / 0.4)" radius={[3,3,0,0]} maxBarSize={28} />
                  )}
                  {chartMode === "ambos" && <Legend wrapperStyle={{ fontSize: 11 }} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top procedimientos + Hospitales por RVU */}
        <div className="w-full min-w-0 space-y-3">

          <div className="bg-card border rounded-xl p-3 min-w-0">
            <div className="flex items-center justify-between mb-3 gap-2 min-w-0">
              <h2 className="font-bold text-sm truncate">Top procedimientos</h2>
              <div className="flex gap-0.5 text-xs bg-muted rounded-lg p-0.5 shrink-0">
                <button onClick={() => setProcedureSort("count")} className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${procedureSort === "count" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
                  Cant.
                </button>
                <button onClick={() => setProcedureSort("rvu")} className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${procedureSort === "rvu" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
                  RVU
                </button>
              </div>
            </div>
            {topProcedures.length === 0 ? (
              <p className="text-muted-foreground text-xs">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {topProcedures.map((p, i) => {
                  const val = procedureSort === "count" ? p.count : p.total_rvu;
                  const pct = maxProcVal > 0 ? Math.round((val / maxProcVal) * 100) : 0;
                  return (
                    <div key={p.name + i} className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 min-w-0 w-full">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                        <span className="flex-1 text-xs font-medium truncate min-w-0">{p.name}</span>
                        <span className="shrink-0 text-[10px] font-bold text-primary ml-1">{val}</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden ml-5">
                        <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card border rounded-xl p-3 min-w-0">
            <h2 className="font-bold text-sm mb-2">Hospitales por RVU</h2>
            {stats.top_hospitals_by_rvu.length === 0 ? (
              <p className="text-muted-foreground text-xs">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {stats.top_hospitals_by_rvu.map((h, i) => {
                  const pct = maxHospitalRvu > 0 ? Math.round((h.total_rvu / maxHospitalRvu) * 100) : 0;
                  return (
                    <div key={h.name + i} className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 min-w-0 w-full">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                        <span className="flex-1 text-xs font-medium truncate min-w-0">{h.name}</span>
                        <span className="shrink-0 text-[10px] font-bold text-primary ml-1">{h.total_rvu}</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden ml-5">
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
        <div className="w-full min-w-0 space-y-3">

          <div className="bg-card border rounded-xl p-3 min-w-0">
            <h2 className="font-bold text-sm mb-2">Seguros por cirugías</h2>
            {stats.top_insurers_by_count.length === 0 ? (
              <p className="text-muted-foreground text-xs">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {stats.top_insurers_by_count.map((ins, i) => {
                  const max = stats.top_insurers_by_count[0]?.count ?? 1;
                  const pct = Math.round((ins.count / max) * 100);
                  return (
                    <div key={ins.name + i} className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 min-w-0 w-full">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                        <span className="flex-1 text-xs font-medium truncate min-w-0">{ins.name}</span>
                        <span className="shrink-0 text-[10px] font-bold text-primary ml-1">{ins.count}</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden ml-5">
                        <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card border rounded-xl p-3 min-w-0">
            <h2 className="font-bold text-sm mb-2">Seguros por RVU</h2>
            {stats.top_insurers_by_rvu.length === 0 ? (
              <p className="text-muted-foreground text-xs">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {stats.top_insurers_by_rvu.map((ins, i) => {
                  const max = stats.top_insurers_by_rvu[0]?.total_rvu ?? 1;
                  const pct = Math.round((ins.total_rvu / max) * 100);
                  return (
                    <div key={ins.name + i} className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 min-w-0 w-full">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                        <span className="flex-1 text-xs font-medium truncate min-w-0">{ins.name}</span>
                        <span className="shrink-0 text-[10px] font-bold text-primary ml-1">{ins.total_rvu}</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden ml-5">
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
