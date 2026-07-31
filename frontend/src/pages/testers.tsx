import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Smartphone, Apple, Mail, CheckCircle, Users, Star, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { useSiteSettings } from "@/shared/hooks/useSiteSettings";

const CONTACT_EMAIL = "contacto@medicoapp.app";

const iosSteps = [
  {
    img: "/medico-inicio.jpg",
    title: "Abrí Safari y entrá a la app",
    desc: "Abrí Safari en tu iPhone o iPad y visitá la página de MeDico App. Tocá los tres puntos (•••) o el ícono de compartir en la barra del navegador.",
  },
  {
    img: "/medico-compartir.jpg",
    title: "Tocá el ícono de Compartir",
    desc: "En la barra inferior de Safari, tocá el ícono de compartir (la cajita con la flechita hacia arriba ⬆️).",
  },
  {
    img: "/medico-ver-mas.jpg",
    title: "Tocá \"Ver más\"",
    desc: "En el menú que se despliega, deslizá hacia abajo y tocá el botón \"Ver más\" para ver todas las opciones disponibles.",
  },
  {
    img: "/medico-menu.jpg",
    title: "Seleccioná \"Agregar a inicio\"",
    desc: "Buscá la opción \"Agregar a pantalla de inicio\" y tocála. Aparecerá una pantalla de confirmación.",
  },
  {
    img: "/medico-agregar.jpg",
    title: "Confirmá el nombre y tocá Agregar",
    desc: "Verificá que el nombre diga \"MeDico App\". Si no está, escribilo. Luego tocá \"Agregar\" en la esquina superior derecha. ¡Listo!",
  },
];

const androidSteps = [
  {
    title: "Escribinos tu correo de Google Play",
    desc: `Enviá un mail a ${CONTACT_EMAIL} indicando el correo que tenés registrado en Google Play Store. Sin ese correo no podemos darte acceso.`,
  },
  {
    title: "Recibís tu invitación",
    desc: "En unas horas te enviamos un link personalizado para unirte al programa de pruebas. La app no es pública — solo acceden quienes reciben la invitación.",
  },
  {
    title: "Instalá desde Play Store",
    desc: "Seguí el link, aceptá la invitación en Google Play y descargá MeDico App.",
  },
  {
    title: "¡Listo!",
    desc: "Abrí la app, registrate y explorá. Tu feedback nos ayuda a mejorar antes del lanzamiento oficial.",
  },
];

const benefits = [
  { icon: <Star className="h-5 w-5 text-yellow-500" />, text: "Acceso Premium gratuito durante todo el período de prueba" },
  { icon: <Users className="h-5 w-5 text-sky-600" />, text: "Formás parte del lanzamiento oficial de la app" },
  { icon: <CheckCircle className="h-5 w-5 text-emerald-500" />, text: "Tu feedback directo da forma a las próximas funciones" },
  { icon: <Star className="h-5 w-5 text-yellow-500" />, text: "Descuento especial cuando salgamos a producción" },
];

export default function TestersPage() {
  const settings = useSiteSettings();
  const testerCount = parseInt(settings.ANDROID_TESTERS_COUNT ?? '12', 10);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* Hero */}
      <div className="bg-gradient-to-br from-sky-50 via-sky-200 to-sky-400 px-6 py-16 text-center relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-white/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 mb-8 text-sky-900 font-bold text-xl">
            <img src="/favicon.png" alt="MeDico App" className="h-9 w-9 object-contain drop-shadow-sm" />
            MeDico App
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-sky-900 leading-tight mb-4">
            Ayudanos a llevar MeDico App<br className="hidden sm:block" /> a todos los médicos
          </h1>

          {/* Contador de testers */}
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-sky-200 rounded-full px-5 py-2 mb-6 shadow-sm">
            <span className="text-lg">🎉</span>
            <span className="text-sky-900 font-semibold text-sm">
              ¡Ya tenemos <span className="text-sky-600 font-extrabold text-base">{testerCount}</span> testers oficiales en Android. ¡Unite!
            </span>
          </div>

          <p className="text-sky-800/80 text-lg mb-4 max-w-xl mx-auto">
            Somos un proyecto independiente y necesitamos médicos reales que prueben la app antes del lanzamiento oficial. Tu experiencia vale más que cualquier automatización.
          </p>
          <div className="max-w-xl mx-auto mb-8 space-y-2 text-sm text-sky-800/70">
            <p>
              Cualquier duda, sugerencia, opinión o problema que encuentres en la app, escribinos a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline underline-offset-2 hover:text-sky-900">
                {CONTACT_EMAIL}
              </a>
              . Estamos para ayudarte.
            </p>
            <p>
              📲 Las notificaciones push funcionan en <span className="font-semibold">Android</span>. En <span className="font-semibold">iPhone con Safari</span> no están disponibles por ahora.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#android">
              <Button size="lg" className="bg-sky-700 hover:bg-sky-800 text-white w-full sm:w-auto gap-2">
                <Smartphone className="h-5 w-5" /> Ser tester en Android
              </Button>
            </a>
            <a href="#ios">
              <Button size="lg" variant="outline" className="border-sky-700 text-sky-800 hover:bg-sky-50 w-full sm:w-auto gap-2">
                <Apple className="h-5 w-5" /> Instalar en iPhone
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Qué ganás */}
      <div className="max-w-3xl mx-auto px-6 py-14">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">¿Qué ganás siendo tester?</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {benefits.map((b, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="mt-0.5 shrink-0">{b.icon}</div>
                <p className="text-slate-700 text-sm">{b.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Android */}
      <div id="android" className="bg-white border-y border-slate-100 px-6 py-14 scroll-mt-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-sky-100 rounded-xl p-2.5">
              <Smartphone className="h-6 w-6 text-sky-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">Android — Google Play</h2>
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200">
                  <Clock className="h-3 w-3" /> En proceso
                </span>
              </div>
              <p className="text-sm text-slate-500">Programa de pruebas cerrado — cupos limitados</p>
            </div>
          </div>

          <p className="text-slate-500 text-sm mb-8">
            Estamos en fase de pruebas cerradas en Google Play. Para unirte necesitamos agregar tu correo manualmente al programa.
          </p>

          <div className="space-y-4 mb-8">
            {androidSteps.map((step, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{step.title}</p>
                  <p className="text-slate-500 text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <a href={`mailto:${CONTACT_EMAIL}?subject=Quiero ser tester Android de MeDico App&body=Hola! Quiero unirme como tester en Android. Mi correo de Google Play es: `}>
            <Button size="lg" className="bg-sky-700 hover:bg-sky-800 text-white w-full gap-2">
              <Mail className="h-5 w-5" />
              Enviar mi correo de Google Play
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
          <p className="text-xs text-slate-400 text-center mt-2">
            Abre tu app de correo con el mensaje listo. Solo completá tu email de Google Play y enviá.
          </p>

          {/* Qué verás cuando recibas el link */}
          <div className="mt-10 border-t border-slate-100 pt-8">
            <h3 className="font-bold text-slate-800 mb-2">¿Qué vas a ver cuando te enviemos el link?</h3>
            <p className="text-slate-500 text-sm mb-5">
              Una vez que nos escribas, te agregamos como tester y te mandamos el link personalizado. Al abrirlo vas a ver una página como esta:
            </p>

            <img
              src="/andoridtest.jpeg"
              alt="Página de Google Play Testing — You are a tester"
              className="w-full max-w-sm mx-auto rounded-2xl shadow-md mb-6"
            />

            <ol className="space-y-3 mb-6">
              <li className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs mt-0.5">1</span>
                <p className="text-slate-600 text-sm">
                  Tocá el botón azul <span className="font-semibold text-sky-700">«Become a tester»</span> para aceptar la invitación.
                </p>
              </li>
              <li className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs mt-0.5">2</span>
                <p className="text-slate-600 text-sm">
                  Vas a ver <span className="font-semibold text-emerald-600">«You are a tester.»</span> en verde — eso confirma que estás dentro.
                </p>
              </li>
              <li className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs mt-0.5">3</span>
                <p className="text-slate-600 text-sm">
                  Tocá el link azul <span className="font-semibold text-sky-700">«download it on Google Play»</span> para descargar la app.
                </p>
              </li>
            </ol>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
              <p className="font-semibold mb-1">¿No te llega el link o no funciona?</p>
              <p className="mb-2">Entrá directamente desde acá:</p>
              <a
                href="https://play.google.com/store/apps/details?id=app.medicoapp.medico"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sky-600 font-semibold hover:underline break-all"
              >
                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
                play.google.com/store/apps/details?id=app.medicoapp.medico
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* iOS */}
      <div id="ios" className="px-6 py-14 scroll-mt-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-slate-100 rounded-xl p-2.5">
              <Apple className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-800">iPhone / iPad — Safari</h2>
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200">
                  <Clock className="h-3 w-3" /> App Store próximamente
                </span>
              </div>
              <p className="text-sm text-slate-500">Instalá como app desde Safari — sin necesidad de App Store</p>
            </div>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-8 text-sm text-sky-800">
            <strong>Importante:</strong> Abrí esta página en <strong>Safari</strong> (no Chrome ni otro navegador) para que aparezcan todas las opciones del menú.
          </div>

          {/* Pasos con imágenes */}
          <div className="space-y-8 mb-8">
            {iosSteps.map((step, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 mb-1">{step.title}</p>
                  <p className="text-slate-500 text-sm mb-3">{step.desc}</p>
                  <img
                    src={step.img}
                    alt={step.title}
                    className="w-full object-contain max-h-64 rounded-xl"
                  />
                </div>
              </div>
            ))}
          </div>

          <a href={typeof window !== 'undefined' ? window.location.origin : 'https://medicoapp.app'} target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 w-full gap-2">
              <Apple className="h-5 w-5" />
              Abrir MeDico App en Safari
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* Contacto */}
      <div className="bg-gradient-to-br from-sky-50 via-sky-100 to-sky-200 px-6 py-14 text-center">
        <div className="max-w-xl mx-auto">
          <Mail className="h-10 w-10 text-sky-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-sky-900 mb-3">¿Tenés preguntas o querés ser tester?</h2>
          <p className="text-sky-800/80 mb-6">
            Escribinos directamente. Te respondemos rápido y te guiamos en el proceso paso a paso.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`}>
            <Button size="lg" className="bg-sky-700 hover:bg-sky-800 text-white gap-2 text-base px-8">
              <Mail className="h-5 w-5" />
              {CONTACT_EMAIL}
            </Button>
          </a>
          <p className="text-sky-700/60 text-sm mt-4">
            También podés escribirnos para reportar cualquier bug o sugerencia durante la prueba.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-slate-400 text-sm">
        © {new Date().getFullYear()} MeDico App — <Link to="/" className="hover:text-sky-600 underline underline-offset-2">Volver al inicio</Link>
      </div>
    </div>
  );
}
