// src/pages/landing.tsx

import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import {
  Clock,
  Calculator,
  Users,
  Calendar,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Star,
  Shield,
  TrendingUp,
  FileText,
  Image,
  Building2,
  Heart,
  Newspaper,
  Briefcase,
  ArrowRight,
  Infinity as InfinityIcon,
  Sparkles,
  ImagePlus,
  Zap,
  BarChart2,
  ShieldCheck,
} from "lucide-react";

export default function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-white/5" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-white rounded-xl p-1">
              <img src="/MEDICO-BAJA-01-solo-logo.JPG" alt="" className="h-7 w-7 object-contain" />
            </div>
            <div className="flex flex-col leading-tight border-l-2 border-primary pl-3">
              <span className="text-base font-bold tracking-tight text-white">MeDico App</span>
              <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Gestión Quirúrgica · Guatemala</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              Iniciar sesión
            </Link>
            <Link to="/signup" className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="pt-36 pb-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">

          <div className="flex flex-col md:flex-row items-center justify-center gap-0 mb-10">

            {/* ── Columna izquierda: logo ── */}
            <div className="flex flex-col items-center justify-center shrink-0 w-full md:w-80 pb-10 md:pb-0 md:pr-16 md:border-r md:border-white/10">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-3xl bg-primary/35 blur-2xl scale-125" />
                <div className="relative bg-white rounded-3xl shadow-2xl ring-1 ring-white/10 overflow-hidden w-52 h-52 flex items-center justify-center">
                  <img
                    src="/MEDICO-BAJA-01-fondo-balnco-solido.jpg"
                    alt="MeDico App"
                    className="w-64 h-64 object-contain scale-110"
                  />
                </div>
              </div>
              <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase mt-1 text-center">Gestión Quirúrgica · Guatemala</span>
            </div>

            {/* ── Divisor horizontal en móvil ── */}
            <div className="w-2/3 h-px bg-white/10 md:hidden mb-10" />

            {/* ── Columna derecha: texto ── */}
            <div className="flex-1 md:pl-16 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-6">
                Hecha por médicos, para médicos — Guatemala
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] mb-8">
                Las horas de un médico valen{" "}
                <span className="text-amber-400">oro</span>.
                <br />
                <span className="text-primary">Nosotros te ayudamos a aprovecharlas mejor.</span>
              </h1>
            </div>

          </div>

          {/* Qué es la app */}
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            MeDico App es la plataforma que gestioná tu práctica quirúrgica desde un solo lugar. Registrá cirugías, calculá honorarios con la Tabla de California, generá reportes en PDF y mantené toda tu información organizada y siempre disponible.
          </p>

          {/* Por qué existe */}
          <div className="max-w-2xl mx-auto mb-10 text-left bg-white/5 border border-white/10 rounded-2xl px-6 py-5">
            <p className="text-primary font-semibold text-xs uppercase tracking-widest mb-2">
              ¿Por qué existe MeDico App?
            </p>
            <p className="text-gray-400 leading-relaxed text-base">
              Nació de una necesidad real del día a día médico. Fue desarrollada junto a médicos
              y cada función existe para resolver un problema que ellos mismos enfrentan,
              porque la mejor forma de crear una herramienta para médicos es construirla con ellos.
            </p>
          </div>

          <div className="text-center">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-lg px-8 py-4 rounded-xl hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                14 días de Premium gratis al registrarte.
                <ChevronRight className="h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 border border-white/10 text-gray-300 font-semibold text-lg px-8 py-4 rounded-xl hover:bg-white/5 transition-all"
              >
                Ya tengo cuenta
              </Link>
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-widest text-amber-400">Sin tarjeta de crédito. Sin compromiso.</p>
          </div>
        </div>
      </section>

      {/* ── QUÉ ES ──────────────────────────────────────────────── */}
      <section className="py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { num: "+4,000", label: "procedimientos quirúrgicos" },
              { num: "2 min",  label: "para registrar una cirugía" },
              { num: "100%",   label: "basada en Tabla de California" },
              { num: "0",      label: "Excel necesarios" },
            ].map(({ num, label }) => (
              <div key={label} className="bg-gray-900 border border-white/5 rounded-2xl p-5">
                <p className="text-3xl font-black text-primary mb-1">{num}</p>
                <p className="text-gray-400 text-sm leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TODAS LAS FUNCIONES ─────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Funciones</p>
            <h2 className="text-4xl font-black mb-4">Todo lo que tu práctica necesita</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Cada función fue diseñada a partir de cómo funciona realmente la práctica quirúrgica privada.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Briefcase,
                title: "Casos quirúrgicos",
                desc: "Registrá cada cirugía con paciente, diagnóstico, procedimientos, hospital, fecha y honorarios. Se archivan automáticamente cuando marcás el caso como cobrado.",
                color: "text-blue-400",
                bg: "bg-blue-400/10",
              },
              {
                icon: Calculator,
                title: "Calculadora de honorarios",
                desc: "Ingresá el procedimiento, elegí el hospital y MeDico App calcula automáticamente el honorario usando la Tabla de California y tu multiplicador configurado.",
                color: "text-green-400",
                bg: "bg-green-400/10",
              },
              {
                icon: FileText,
                title: "Exportación PDF",
                desc: "Generá un reporte profesional de cada cirugía en PDF: datos del paciente, procedimientos, honorarios y seguro. Listo para enviar a la aseguradora o al paciente.",
                color: "text-yellow-400",
                bg: "bg-yellow-400/10",
              },
              {
                icon: TrendingUp,
                title: "Estadísticas",
                desc: "Visualizá donde operas mas seguido. Entiende tu práctica en números reales.",
                color: "text-orange-400",
                bg: "bg-orange-400/10",
              },
              {
                icon: Users,
                title: "Colegas y ayudantes",
                desc: "Asigná un médico ayudante a un caso. Ellos reciben notificación, ven los detalles que les corresponden y pueden colaborar. Vos mantenés el control total.",
                color: "text-purple-400",
                bg: "bg-purple-400/10",
              },
              {
                icon: Calendar,
                title: "Google Calendar",
                desc: "Cada cirugía que registrás aparece automáticamente en tu Google Calendar con fecha, hora, hospital y procedimientos. Tu agenda médica siempre al día.",
                color: "text-pink-400",
                bg: "bg-pink-400/10",
              },
              {
                icon: Building2,
                title: "Hospitales y seguros",
                desc: "Configurá tu multiplicador RVU por hospital y guardá tus seguros médicos frecuentes. El cálculo de honorarios se adapta a cada hospital automáticamente.",
                color: "text-cyan-400",
                bg: "bg-cyan-400/10",
              },
              {
                icon: Heart,
                title: "Favoritos",
                desc: "Marcá los procedimientos que más usás como favoritos. Al registrar una nueva cirugía, aparecen primero y los RVU se cargan sin que tengas que buscar nada.",
                color: "text-red-400",
                bg: "bg-red-400/10",
              },
              {
                icon: Image,
                title: "Imágenes quirúrgicas",
                desc: "Adjuntá fotos de la cirugía directamente al caso. Se almacenan de forma segura y se eliminan automáticamente 3 meses después de archivar el caso.",
                color: "text-indigo-400",
                bg: "bg-indigo-400/10",
                badge: "Premium",
              },
              {
                icon: Shield,
                title: "Datos cifrados",
                desc: "El nombre, identificación, diagnóstico y notas del paciente se cifran con Fernet (AES-128-CBC + HMAC-SHA256) antes de guardarse en el servidor. Ni siquiera nosotros podemos leerlos.",
                color: "text-emerald-400",
                bg: "bg-emerald-400/10",
              },
              {
                icon: Newspaper,
                title: "Novedades médicas",
                desc: "Sección de contenido patrocinado por hospitales, farmacéuticas y casas médicas segmentado por tu especialidad. Contenido relevante para tu práctica.",
                color: "text-amber-400",
                bg: "bg-amber-400/10",
              },
              {
                icon: Clock,
                title: "Registro rápido",
                desc: "Sale del quirófano y registrá la cirugía en menos de 2 minutos. Procedimientos frecuentes precargados, campos mínimos requeridos, guardado automático.",
                color: "text-teal-400",
                bg: "bg-teal-400/10",
              },
            ].map(({ icon: Icon, title, desc, color, bg, badge }) => (
              <div key={title} className="bg-gray-900 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors relative">
                {badge && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                    {badge}
                  </span>
                )}
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

      {/* ── TABLA DE CALIFORNIA ─────────────────────────────────── */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Tabla de California</p>
              <h2 className="text-4xl font-black mb-4 leading-tight">
                Ya está incluida.
                <br />Lista para usar.
              </h2>
              <p className="text-gray-400 text-lg mb-5 leading-relaxed">
                Más de 4,000 procedimientos quirúrgicos con código CPT, nombre y valor RVU.
                Configurás tu multiplicador por hospital una sola vez y MeDico App
                calcula el honorario exacto al instante.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                ¿No encontrás un procedimiento? Lo reportás y lo incorporamos.
                La tabla crece con la comunidad médica.
              </p>
              <div className="bg-gray-950 border border-white/10 rounded-xl p-4 font-mono text-sm">
                <div className="text-gray-500 mb-2 text-xs uppercase tracking-wider">Fórmula de honorario</div>
                <div className="text-white text-base">
                  RVU <span className="text-gray-600">×</span>{" "}
                  <span className="text-primary">multiplicador_hospital</span>{" "}
                  <span className="text-gray-600">=</span>{" "}
                  <span className="text-green-400 font-bold">honorario</span>
                </div>
                <div className="text-gray-600 text-xs mt-2">
                  Ej: 9.70 × Q700 = <span className="text-green-400 font-semibold">Q 6,790.00</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { code: "60240", name: "Tiroidectomía total",                    rvu: "9.70",  esp: "Endocrino" },
                { code: "27132", name: "Artroplastia total de cadera",            rvu: "22.10", esp: "Ortopedia" },
                { code: "44140", name: "Colectomía parcial con anastomosis",      rvu: "9.80",  esp: "Digestivo" },
                { code: "47480", name: "Colecistotomía con exploración",          rvu: "7.40",  esp: "Digestivo" },
                { code: "33030", name: "Pericardiectomía sin bypass",             rvu: "17.50", esp: "Cardiovascular" },
                { code: "19303", name: "Mastectomía simple total",               rvu: "7.30",  esp: "Mama" },
              ].map((p) => (
                <div key={p.code} className="flex items-center justify-between bg-gray-900 border border-white/5 rounded-xl px-4 py-3 hover:border-primary/30 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-mono">{p.code}</span>
                      <span className="text-[10px] text-gray-700 bg-gray-800 px-1.5 py-0.5 rounded">{p.esp}</span>
                    </div>
                    <p className="text-sm font-medium text-white mt-0.5">{p.name}</p>
                  </div>
                  <span className="text-primary font-black shrink-0 ml-3">{p.rvu} RVU</span>
                </div>
              ))}
              <p className="text-center text-xs text-gray-600 pt-1">+4,000 procedimientos disponibles</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ───────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Cómo funciona</p>
            <h2 className="text-4xl font-black mb-4">Tres pasos. Dos minutos.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Registrá la cirugía",
                desc: "Ingresá el nombre del paciente, el hospital, el diagnóstico y los procedimientos. Los favoritos y el multiplicador ya están cargados.",
              },
              {
                step: "02",
                title: "MeDico App calcula",
                desc: "El sistema cruza los procedimientos con la Tabla de California, aplica tu multiplicador por hospital y te muestra el honorario total al instante.",
              },
              {
                step: "03",
                title: "Exportá y administra",
                desc: "Generá el PDF del caso para enviarlo a la aseguradora. El caso queda en tu historial. Cuando se marca la cirugia como cobrado, se archiva automáticamente.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <div className="bg-gray-900 border border-white/5 rounded-2xl p-6 h-full">
                  <span className="text-5xl font-black text-white/5 select-none block mb-3">{step}</span>
                  <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                </div>
                {step !== "03" && (
                  <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                    <ArrowRight className="h-5 w-5 text-primary/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRECIOS ─────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Precios</p>
            <h2 className="text-4xl font-black mb-4">Simple y justo</h2>
            <p className="text-gray-400 text-lg">Empezá gratis. Sube cuando lo necesités.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 items-stretch">

            {/* ── Free ──────────────────────────────────────────── */}
            <div className="rounded-2xl border border-gray-700 bg-gray-900 flex flex-col overflow-hidden">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Gratis</span>
                </div>
                <h3 className="text-2xl font-bold text-white">Plan Free</h3>
                <p className="text-sm text-gray-400 mt-1">Para empezar sin compromisos</p>
                <div className="flex items-end gap-1 mt-4 mb-2">
                  <span className="text-5xl font-extrabold tracking-tight text-white">Q0</span>
                  <span className="text-gray-500 text-sm mb-2">/mes</span>
                </div>
              </div>
              <div className="px-6 pb-6 flex-1 flex flex-col">
                <div className="w-full h-px bg-white/10 mb-5" />
                <div className="space-y-3.5 flex-1">
                  {[
                    { icon: <Zap        className="h-4 w-4 text-blue-400"     />, text: '5 cirugías activas' },
                    { icon: <Heart      className="h-4 w-4 text-rose-400"     />, text: '5 procedimientos en favoritos' },
                    { icon: <Building2  className="h-4 w-4 text-gray-400"     />, text: '2 hospitales favoritos' },
                    { icon: <Users      className="h-4 w-4 text-violet-400"   />, text: 'Hasta 3 colegas + sistema completo' },
                    { icon: <Calendar   className="h-4 w-4 text-emerald-400"  />, text: 'Google Calendar integrado' },
                    { icon: <Zap        className="h-4 w-4 text-gray-500"     />, text: 'Incluye anuncios', muted: true },
                    { icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />, text: 'Seguros médicos de Guatemala' },
                    { icon: <Calculator  className="h-4 w-4 text-cyan-400"   />, text: 'Calculadora de honorarios' },
                    { icon: <XCircle    className="h-4 w-4 text-gray-600"     />, text: 'Sin estadísticas personales', muted: true },
                    { icon: <XCircle    className="h-4 w-4 text-gray-600"     />, text: 'Sin exportar PDF', muted: true },
                  ].map(({ icon, text, muted }) => (
                    <div key={text} className="flex items-center gap-3 text-sm">
                      <span className="flex-shrink-0">{icon}</span>
                      <span className={muted ? 'text-gray-600' : 'text-gray-300'}>{text}</span>
                    </div>
                  ))}
                </div>
                <Link to="/signup" className="block text-center border border-white/10 text-gray-300 font-semibold py-3 rounded-xl hover:bg-white/5 transition-colors mt-6">
                  Empezar gratis
                </Link>
              </div>
            </div>

            {/* ── Premium ───────────────────────────────────────── */}
            <div className="rounded-2xl flex flex-col overflow-hidden ring-1 ring-amber-400/50 bg-gray-900">
              <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Premium</span>
                  </div>
                  <span className="text-xs font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
                    14 días gratis
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white">MeDico App Premium</h3>
                <p className="text-sm text-gray-400 mt-1">Experiencia completa, sin límites</p>
                <div className="flex items-end gap-1 mt-4 mb-2">
                  <span className="text-5xl font-extrabold tracking-tight text-amber-400">$9</span>
                  <span className="text-gray-400 text-sm mb-2">/mes</span>
                </div>
              </div>
              <div className="px-6 pb-6 flex-1 flex flex-col">
                <div className="w-full h-px bg-amber-400/20 mb-5" />
                <div className="space-y-3.5 flex-1">
                  {[
                    { icon: <InfinityIcon className="h-4 w-4 text-amber-400"   />, text: 'Cirugías activas ilimitadas' },
                    { icon: <Heart      className="h-4 w-4 text-rose-400"     />, text: 'Procedimientos favoritos ilimitados' },
                    { icon: <Building2  className="h-4 w-4 text-amber-300"    />, text: 'Hospitales favoritos ilimitados' },
                    { icon: <Users      className="h-4 w-4 text-violet-400"   />, text: 'Colegas ilimitados + colaboración' },
                    { icon: <Calendar   className="h-4 w-4 text-emerald-400"  />, text: 'Google Calendar integrado' },
                    { icon: <BarChart2  className="h-4 w-4 text-blue-400"     />, text: 'Estadísticas personales avanzadas' },
                    { icon: <Shield     className="h-4 w-4 text-emerald-400"  />, text: 'Sin anuncios ni interrupciones' },
                    { icon: <FileText   className="h-4 w-4 text-sky-400"      />, text: 'Exportar cirugías como PDF' },
                    { icon: <ImagePlus  className="h-4 w-4 text-amber-300"    />, text: 'Imágenes por cirugía (hasta 5 fotos)' },
                    { icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />, text: 'Seguros médicos de Guatemala' },
                    { icon: <Calculator  className="h-4 w-4 text-cyan-400"   />, text: 'Calculadora de honorarios' },
                    { icon: <Sparkles   className="h-4 w-4 text-amber-400"    />, text: 'Acceso anticipado a nuevas funciones' },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-3 text-sm">
                      <span className="flex-shrink-0">{icon}</span>
                      <span className="font-medium text-gray-200">{text}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/signup"
                  className="block text-center bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-3 rounded-xl transition-colors shadow-lg shadow-amber-400/20 mt-6"
                >
                  Empezar — 14 días gratis
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FILOSOFÍA ───────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 border border-white/5 rounded-3xl p-10 md:p-14">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-5">
                  <img src="/logo_transparente.png" alt="" className="h-8 object-contain" />
                </div>
                <h2 className="text-3xl font-black mb-4">
                  Hecha por médicos,<br />para médicos.
                </h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  MeDico App no es una app genérica de gestión adaptada a medicina.
                  Fue diseñada entendiendo cómo funciona la práctica quirúrgica privada
                  en Latinoamérica: la Tabla de California, los multiplicadores por hospital,
                  los ayudantes, los honorarios por procedimiento.
                </p>
                <p className="text-gray-400 leading-relaxed">
                  Cada detalle existe porque un médico lo necesitó.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  {
                    title: "La tabla construida por médicos",
                    desc: "La Tabla de California está centralizada, actualizada y disponible para todos. Si falta un procedimiento, la comunidad lo reporta y lo incorporamos.",
                  },
                  {
                    title: "Devolverte el tiempo",
                    desc: "Un médico pierde 1 de cada 4 horas en tareas administrativas. MeDico App existe para que ese tiempo vuelva a donde corresponde: los pacientes.",
                  },
                  {
                    title: "Sin curva de aprendizaje",
                    desc: "Si podés usar WhatsApp, podés usar MeDico App. No hay capacitación, no hay manuales, no hay onboarding de 30 minutos.",
                  },
                ].map(({ title, desc }) => (
                  <div key={title} className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white text-sm">{title}</p>
                      <p className="text-gray-400 text-sm mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CIERRE CTA ──────────────────────────────────────────── */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex p-4 bg-primary/10 border border-primary/20 rounded-full mb-8">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black mb-3 leading-tight">
            Un minuto menos en burocracia
          </h2>
          <h2 className="text-4xl sm:text-5xl font-black mb-8 leading-tight text-primary">
            es un minuto más con tus pacientes.
          </h2>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-primary text-white font-bold text-lg px-10 py-4 rounded-xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95"
          >
            Registrarme gratis
            <ChevronRight className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-gray-600">14 días Premium sin tarjeta de crédito.</p>
        </div>
      </section>

      {/* ── GOOGLE CALENDAR — requerido para verificación OAuth ─── */}
      <section id="google-calendar" className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Integración con Google Calendar
          </div>
          <h2 className="text-2xl font-bold text-white">
            Tus cirugías, en tu calendario automáticamente
          </h2>
          <p className="text-gray-400 leading-relaxed">
            MeDico App solicita acceso a Google Calendar para crear, actualizar y eliminar
            eventos quirúrgicos directamente en la agenda del médico. Cada cirugía registrada
            aparece como un evento con fecha, hora, hospital y procedimientos.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {[
              { title: "¿Qué datos accede?", desc: "Solo accede a Google Calendar para crear y modificar los eventos de las cirugías del médico. No lee eventos existentes ni accede a otros servicios." },
              { title: "¿Cómo se autoriza?", desc: "El médico autoriza el acceso una sola vez desde Configuración. La sincronización es automática desde ese momento. Puede revocar el acceso en cualquier momento." },
              { title: "¿Dónde se almacena?", desc: "Los tokens de Google Calendar se guardan localmente en el dispositivo del médico. MeDico App no los almacena en sus servidores." },
            ].map(item => (
              <div key={item.title} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-white text-sm">{item.title}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="bg-white rounded px-1 py-0.5">
              <img src="/MEDICO-BAJA-01-solo-logo.JPG" alt="" className="h-4 w-auto" />
            </div>
            <span>MeDico App — Guatemala</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login"   className="hover:text-gray-400 transition-colors">Iniciar sesión</Link>
            <Link to="/signup"  className="hover:text-gray-400 transition-colors">Registrarse</Link>
            <a href="/terms.html"   target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">Términos</a>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">Privacidad</a>
            <a href="mailto:contacto@medicoapp.app" className="hover:text-gray-400 transition-colors">Contacto</a>
          </div>
          <span>© 2026 MeDico App. Todos los derechos reservados.</span>
        </div>
      </footer>

    </div>
  );
}
