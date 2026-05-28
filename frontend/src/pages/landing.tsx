// src/pages/landing.tsx

import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import {
  Stethoscope,
  Clock,
  Calculator,
  Users,
  Calendar,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Star,
  Zap,
  Shield,
  Hospital,
  TrendingUp,
  FileSpreadsheet,
  Smartphone,
} from "lucide-react";

export default function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">MéDico</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/signup"
              className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-6">
            <Stethoscope className="h-3.5 w-3.5" />
            Hecho por médicos, para médicos
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none mb-6">
            Controla tus cirugías.
            <br />
            <span className="text-primary">Recupera tu tiempo.</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Registra una cirugía en menos de 2 minutos. Calcula honorarios con la
            Tabla de California. Sin Excel. Sin papel. Sin caos.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-lg px-8 py-4 rounded-xl hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              Empieza gratis — 14 días Premium
              <ChevronRight className="h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 border border-white/10 text-gray-300 font-semibold text-lg px-8 py-4 rounded-xl hover:bg-white/5 transition-all"
            >
              Ya tengo cuenta
            </Link>
          </div>

          <p className="mt-4 text-xs text-gray-600">
            Sin tarjeta de crédito. Sin compromiso.
          </p>
        </div>
      </section>

      {/* ── PROBLEMA: EL EXCEL ──────────────────────────────────── */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">
              El problema
            </p>
            <h2 className="text-4xl font-black mb-4">
              ¿Sigues registrando tus cirugías en Excel?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              No eres el único. Pero hay una mejor manera.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* El caos actual */}
            <div className="bg-gray-900 border border-red-900/40 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <FileSpreadsheet className="h-5 w-5 text-red-400" />
                <span className="font-bold text-red-400">Así es ahora</span>
              </div>
              <div className="space-y-3 font-mono text-sm">
                <div className="bg-gray-800 rounded px-3 py-2 flex items-center gap-3 opacity-60">
                  <span className="text-gray-500 w-4">A</span>
                  <span className="text-gray-400">CirugíasHospitalHerrera_v3_FINAL.xlsx</span>
                </div>
                <div className="bg-gray-800 rounded px-3 py-2 flex items-center gap-3 opacity-70">
                  <span className="text-gray-500 w-4">B</span>
                  <span className="text-gray-400">TablaCaliforniaActualizada2023.xlsx</span>
                </div>
                <div className="bg-gray-800 rounded px-3 py-2 flex items-center gap-3 opacity-80">
                  <span className="text-gray-500 w-4">C</span>
                  <span className="text-gray-400">HonorariosFebrero_copia(2).xlsx</span>
                </div>
                <div className="bg-gray-800 rounded px-3 py-2 flex items-center gap-3">
                  <span className="text-gray-500 w-4">D</span>
                  <span className="text-red-400">TablaCaliforniaActualizada2023_v2_FINAL_este sí.xlsx</span>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {[
                  "Buscar el Excel correcto entre 5 versiones",
                  "Calcular RVU × multiplicador a mano",
                  "Perder el archivo y empezar de cero",
                  "No saber cuánto ganaste este mes",
                ].map(t => (
                  <div key={t} className="flex items-center gap-2 text-sm text-gray-400">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Con MéDico */}
            <div className="bg-gray-900 border border-primary/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Smartphone className="h-5 w-5 text-primary" />
                <span className="font-bold text-primary">Con MéDico</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-3">
                  <p className="font-semibold text-white">Colecistectomía laparoscópica</p>
                  <p className="text-gray-400 text-xs mt-0.5">4.60 RVU · Q 700/RVU</p>
                  <p className="text-primary font-black text-lg mt-1">Q 3,220.00</p>
                </div>
                <div className="bg-gray-800 rounded-lg px-3 py-2 text-gray-400 text-xs">
                  + Ayudante: Dr. Ramírez
                </div>
                <div className="bg-gray-800 rounded-lg px-3 py-2 text-gray-400 text-xs">
                  Hospital: Centro Médico
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {[
                  "Tabla de California integrada y actualizada",
                  "Cálculo automático de honorarios",
                  "Historial organizado por mes y hospital",
                  "Saber exactamente cuánto ganaste",
                ].map(t => (
                  <div key={t} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stat */}
          <div className="mt-12 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
            <p className="text-4xl font-black text-primary mb-2">1 de cada 4 horas</p>
            <p className="text-gray-300 text-lg">
              de un médico se pierde en tareas administrativas que no son atención al paciente.
            </p>
            <p className="text-gray-600 text-xs mt-3">
              Fuente: American Medical Association Physician Survey, 2022 · Annals of Internal Medicine, Sinsky et al., 2016
            </p>
          </div>
        </div>
      </section>

      {/* ── TABLA DE CALIFORNIA ─────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">
                Tabla de California
              </p>
              <h2 className="text-4xl font-black mb-4 leading-tight">
                Ya está incluida.
                <br />
                Lista para usar.
              </h2>
              <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                Cada procedimiento tiene su código, nombre y valor en RVU.
                Vos solo configurás tu multiplicador por hospital y MéDico calcula
                el honorario exacto al instante.
              </p>
              <p className="text-gray-400 mb-6">
                ¿No encontrás un procedimiento? Podés reportarlo y nosotros lo
                validamos e incorporamos. La tabla crece con la comunidad.
              </p>
              <div className="bg-gray-900 border border-white/10 rounded-xl p-4 font-mono text-sm">
                <div className="text-gray-500 mb-2 text-xs">Fórmula de honorario</div>
                <div className="text-white">
                  RVU <span className="text-gray-500">×</span>{" "}
                  <span className="text-primary">multiplicador_hospital</span>{" "}
                  <span className="text-gray-500">=</span>{" "}
                  <span className="text-green-400">honorario</span>
                </div>
                <div className="text-gray-600 text-xs mt-2">
                  Ej: 4.60 × Q700 = <span className="text-green-400">Q 3,220.00</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { code: "27447", name: "Artroplastia total de rodilla", rvu: "23.50" },
                { code: "43239", name: "Esofagogastroduodenoscopia con biopsia", rvu: "3.50" },
                { code: "47562", name: "Colecistectomía laparoscópica", rvu: "4.60" },
                { code: "27130", name: "Artroplastia total de cadera", rvu: "22.62" },
                { code: "49505", name: "Hernioplastia inguinal abierta", rvu: "5.19" },
              ].map((p) => (
                <div
                  key={p.code}
                  className="flex items-center justify-between bg-gray-900 border border-white/5 rounded-xl px-4 py-3 hover:border-primary/30 transition-colors"
                >
                  <div>
                    <span className="text-xs text-gray-600 font-mono">{p.code}</span>
                    <p className="text-sm font-medium text-white">{p.name}</p>
                  </div>
                  <span className="text-primary font-black">{p.rvu} RVU</span>
                </div>
              ))}
              <p className="text-center text-xs text-gray-600 pt-1">
                +1,200 procedimientos disponibles
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black mb-4">Todo lo que necesitás</h2>
            <p className="text-gray-400 text-lg">En una sola app. Sin complicaciones.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Zap,
                title: "Registro en 2 minutos",
                desc: "Sale del quirófano, abre MéDico, registra. Antes de llegar al estacionamiento ya está guardado.",
                color: "text-yellow-400",
                bg: "bg-yellow-400/10",
              },
              {
                icon: Calculator,
                title: "Calculadora médica",
                desc: "Fórmulas clínicas de uso frecuente integradas. Todo en un solo lugar.",
                color: "text-blue-400",
                bg: "bg-blue-400/10",
              },
              {
                icon: Users,
                title: "Colegas y ayudantes",
                desc: "Invitá a tu equipo a colaborar en un caso. Ellos ven su parte, vos controlás todo.",
                color: "text-green-400",
                bg: "bg-green-400/10",
              },
              {
                icon: Calendar,
                title: "Google Calendar",
                desc: "Sincronizá tus cirugías con tu calendario. Tu agenda médica siempre actualizada.",
                color: "text-purple-400",
                bg: "bg-purple-400/10",
              },
              {
                icon: Hospital,
                title: "Múltiples hospitales",
                desc: "Cada hospital tiene su propio multiplicador. Cambiás de hospital, el cálculo se actualiza solo.",
                color: "text-pink-400",
                bg: "bg-pink-400/10",
              },
              {
                icon: TrendingUp,
                title: "Historial y estadísticas",
                desc: "Mirá cuánto ganaste por mes, por hospital, por procedimiento. Tu práctica en números.",
                color: "text-orange-400",
                bg: "bg-orange-400/10",
              },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="bg-gray-900 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors"
              >
                <div className={`inline-flex p-2.5 rounded-xl ${bg} mb-4`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRECIOS ─────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black mb-4">Simple y justo</h2>
            <p className="text-gray-400 text-lg">Empezá gratis, subí cuando lo necesités.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-8">
              <h3 className="text-xl font-bold mb-1">Free</h3>
              <p className="text-gray-400 text-sm mb-6">Para empezar</p>
              <div className="text-4xl font-black mb-8">Q0<span className="text-lg text-gray-500 font-normal">/mes</span></div>
              <div className="space-y-3">
                {[
                  { ok: true, text: "Hasta 5 cirugías activas" },
                  { ok: true, text: "Hasta 2 colegas / ayudantes" },
                  { ok: true, text: "Tabla de California completa" },
                  { ok: true, text: "Calculadora médica" },
                  { ok: false, text: "Anuncios personalizados por especialidad" },
                  { ok: false, text: "Sin Google Calendar" },
                ].map(({ ok, text }) => (
                  <div key={text} className="flex items-center gap-2 text-sm">
                    {ok
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      : <XCircle className="h-4 w-4 text-gray-700 shrink-0" />}
                    <span className={ok ? "text-gray-300" : "text-gray-600"}>{text}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/signup"
                className="mt-8 block text-center border border-white/10 text-gray-300 font-semibold py-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                Empezar gratis
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/40 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  14 días gratis
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                <h3 className="text-xl font-bold">Premium</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6">Para médicos que van en serio</p>
              <div className="text-4xl font-black mb-8">
                $4.99<span className="text-lg text-gray-400 font-normal">/mes</span>
              </div>
              <div className="space-y-3">
                {[
                  "Cirugías activas ilimitadas",
                  "Colegas y colaboración ilimitados",
                  "Sin anuncios ni interrupciones",
                  "Integración con Google Calendar",
                  "Acceso anticipado a nuevas funciones",
                ].map((text) => (
                  <div key={text} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-gray-200">{text}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/signup"
                className="mt-8 block text-center bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                Empezar — 14 días gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CIERRE ──────────────────────────────────────────────── */}
      <section className="py-24 px-4 text-center bg-gradient-to-b from-transparent to-primary/5">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex p-4 bg-primary/10 rounded-full mb-6">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
            Un minuto menos en burocracia
            <br />
            <span className="text-primary">es un minuto más salvando vidas.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            MéDico te devuelve ese tiempo.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-primary text-white font-bold text-lg px-10 py-4 rounded-xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95"
          >
            Registrarme gratis
            <ChevronRight className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-gray-600">
            14 días Premium sin tarjeta de crédito.
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            <span>MéDico App — Guatemala</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-gray-400 transition-colors">Iniciar sesión</Link>
            <Link to="/signup" className="hover:text-gray-400 transition-colors">Registrarse</Link>
            <a href="mailto:contacto@medicoapp.app" className="hover:text-gray-400 transition-colors">Contacto</a>
          </div>
          <span>© 2026 MéDico. Todos los derechos reservados.</span>
        </div>
      </footer>

    </div>
  );
}
