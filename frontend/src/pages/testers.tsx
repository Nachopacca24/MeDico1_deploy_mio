import { Link } from "react-router-dom";
import { Smartphone, Apple, Mail, CheckCircle, Users, Star, ArrowRight, Chrome, Share2, PlusSquare, Download } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";

const CONTACT_EMAIL = "contacto@medicoapp.app";
// Reemplazá este link con el tuyo desde Play Console → Closed testing → Manage track → Copy link
const PLAY_STORE_OPT_IN_URL = "https://play.google.com/apps/testing/TU_APP_ID";

const steps = {
  ios: [
    { icon: <Share2 className="h-5 w-5" />, title: "Abrí Safari", desc: 'En tu iPhone o iPad, abrí la app en Safari (no Chrome).' },
    { icon: <Share2 className="h-5 w-5" />, title: 'Tocá el ícono de compartir', desc: 'El botón ⬆️ en la barra inferior de Safari.' },
    { icon: <PlusSquare className="h-5 w-5" />, title: '"Agregar a pantalla de inicio"', desc: 'Buscá esa opción en el menú y tocá Agregar.' },
    { icon: <CheckCircle className="h-5 w-5" />, title: "¡Listo!", desc: 'MeDico App aparecerá como ícono en tu pantalla. Abrila y registrate.' },
  ],
  android: [
    { icon: <Chrome className="h-5 w-5" />, title: "Aceptá la invitación", desc: 'Hacé clic en el botón de abajo para unirte al programa de pruebas en Google Play.' },
    { icon: <Download className="h-5 w-5" />, title: "Instalá la app", desc: 'Una vez aceptada la invitación, buscá MeDico App en Play Store e instalá.' },
    { icon: <CheckCircle className="h-5 w-5" />, title: "¡Listo!", desc: 'Abrí la app, registrate y explorá. Tu feedback cuenta mucho.' },
  ],
};

const benefits = [
  { icon: <Star className="h-5 w-5 text-yellow-500" />, text: "Acceso Premium gratuito durante todo el período de prueba" },
  { icon: <Users className="h-5 w-5 text-sky-600" />, text: "Formás parte del lanzamiento oficial de la app" },
  { icon: <CheckCircle className="h-5 w-5 text-emerald-500" />, text: "Tu feedback directo da forma a las próximas funciones" },
  { icon: <Star className="h-5 w-5 text-yellow-500" />, text: "Descuento especial cuando salgamos a producción" },
];

export default function TestersPage() {
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
          <p className="text-sky-800/80 text-lg mb-8 max-w-xl mx-auto">
            Somos un proyecto independiente y necesitamos médicos reales que prueben la app antes del lanzamiento oficial en Android. Tu experiencia vale más que cualquier automatización.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={`#android`}>
              <Button size="lg" className="bg-sky-700 hover:bg-sky-800 text-white w-full sm:w-auto gap-2">
                <Smartphone className="h-5 w-5" /> Unirme desde Android
              </Button>
            </a>
            <a href="#ios">
              <Button size="lg" variant="outline" className="border-sky-700 text-sky-800 hover:bg-sky-50 w-full sm:w-auto gap-2">
                <Apple className="h-5 w-5" /> Unirme desde iPhone
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
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-sky-100 rounded-xl p-2.5">
              <Smartphone className="h-6 w-6 text-sky-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Android — Google Play</h2>
              <p className="text-sm text-slate-500">Instalación oficial desde Play Store</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {steps.android.map((step, i) => (
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

          <a href={PLAY_STORE_OPT_IN_URL} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-sky-700 hover:bg-sky-800 text-white w-full gap-2">
              <Smartphone className="h-5 w-5" />
              Unirme al programa de pruebas en Google Play
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
          <p className="text-xs text-slate-400 text-center mt-2">
            Requiere cuenta de Google. El proceso toma menos de 1 minuto.
          </p>
        </div>
      </div>

      {/* iOS */}
      <div id="ios" className="px-6 py-14 scroll-mt-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-slate-100 rounded-xl p-2.5">
              <Apple className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">iPhone / iPad — Instalar como app</h2>
              <p className="text-sm text-slate-500">Sin App Store. Se instala desde el navegador en segundos.</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {steps.ios.map((step, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{step.title}</p>
                  <p className="text-slate-500 text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-6 text-sm text-sky-800">
            <strong>Importante:</strong> Abrí esta página en <strong>Safari</strong> (no Chrome ni otro navegador) para que aparezca la opción "Agregar a pantalla de inicio".
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
          <h2 className="text-2xl font-bold text-sky-900 mb-3">¿Querés ser tester o tenés preguntas?</h2>
          <p className="text-sky-800/80 mb-6">
            Escribinos directamente. Te respondemos rápido y te guiamos en el proceso de instalación.
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
