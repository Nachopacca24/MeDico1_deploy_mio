// src/core/contexts/TutorialContext.tsx

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export interface TutorialStep {
  step: number;
  route: string;
  emoji: string;
  title: string;
  description: string;
  hint: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  // ── 1. Tabla de California ───────────────────────────────────────
  {
    step: 1,
    route: '/operations',
    emoji: '🩺',
    title: 'Tabla de California',
    description: 'Acá encontrás más de 4,000 procedimientos quirúrgicos con su código CPT y valor en RVU. Esta es la base de todos tus cálculos de honorarios.',
    hint: 'Buscá un procedimiento que usés frecuentemente y tocá ⭐ para agregarlo a favoritos.',
  },
  // ── 2. Hospitales ────────────────────────────────────────────────
  {
    step: 2,
    route: '/hospitals',
    emoji: '🏥',
    title: 'Hospitales',
    description: 'Registrá los hospitales donde operás. A cada uno le podés configurar tu multiplicador RVU — así MeDico App calcula el honorario exacto según el hospital.',
    hint: 'Buscá tu hospital principal y marcalo como favorito.',
  },
  // ── 3. Seguros ───────────────────────────────────────────────────
  {
    step: 3,
    route: '/insurances',
    emoji: '🛡️',
    title: 'Seguros médicos',
    description: 'Guardá los seguros médicos que manejás frecuentemente. Al registrar una cirugía, los podés seleccionar rápidamente sin tener que escribirlos cada vez.',
    hint: 'Agregá un seguro que usés seguido como favorito.',
  },
  // ── 4. Favoritos ─────────────────────────────────────────────────
  {
    step: 4,
    route: '/favorites',
    emoji: '⭐',
    title: 'Tus favoritos',
    description: 'Acá aparecen todos tus favoritos: procedimientos, hospitales y seguros. Al crear una cirugía, estos se cargan primero para que puedas registrar más rápido.',
    hint: 'Revisá que tus favoritos estén aquí — se pre-cargan cada vez que creés una nueva cirugía.',
  },
  // ── 5. Colegas ───────────────────────────────────────────────────
  {
    step: 5,
    route: '/colleagues',
    emoji: '👥',
    title: 'Colegas y ayudantes',
    description: 'Tu código de colega es único y personal. Compartilo con otros médicos para que te envíen solicitudes de colaboración, o buscá el código de un colega para enviarle una solicitud vos. Las solicitudes recibidas aparecen en la pestaña "Recibidos" y las enviadas en "Enviados".',
    hint: 'Copiá tu código personal (aparece arriba de la página) y enviáselo a un colega.',
  },
  // ── 6. Google Calendar ───────────────────────────────────────────
  {
    step: 6,
    route: '/calendar',
    emoji: '📅',
    title: 'Google Calendar',
    description: 'Conectá tu Google Calendar y cada cirugía que registrés aparece automáticamente en tu agenda con fecha, hora, hospital y procedimientos. Se actualiza solo cada vez que editás un caso.',
    hint: 'Tocá "Conectar Google Calendar" para autorizar la sincronización.',
  },
  // ── 7. Mis cirugías — ver lista ──────────────────────────────────
  {
    step: 7,
    route: '/cases',
    emoji: '📋',
    title: 'Mis cirugías',
    description: 'Acá vas a ver todas tus cirugías registradas, organizadas por estado. Vamos a crear una cirugía de simulación para que te familiarices con el sistema. Podés eliminarla después — solo se puede eliminar cuando está en estado "Cobrado".',
    hint: 'Tocá el botón "+ Nueva Cirugía" para comenzar la simulación.',
  },
  // ── 8. Nueva cirugía — datos del paciente ────────────────────────
  {
    step: 8,
    route: '/cases/new',
    emoji: '👤',
    title: 'Datos del paciente',
    description: 'Para la simulación usá estos datos: Nombre → Juan Pérez · ID → 123 (este campo es para el número de expediente o ID que asigna el hospital) · Completá también Edad, Género y Diagnóstico principal.',
    hint: 'Completá la sección de datos del paciente y bajá a la siguiente sección del formulario.',
  },
  // ── 9. Nueva cirugía — hospital, seguro y fecha ──────────────────
  {
    step: 9,
    route: '/cases/new',
    emoji: '🏥',
    title: 'Hospital, seguro y fecha',
    description: 'Seleccioná el hospital — tus favoritos aparecen primero. Lo mismo para el seguro médico. Ingresá la fecha y hora de la cirugía. El multiplicador RVU lo define el hospital; podés dejarlo en blanco o escribir cualquier número para practicar.',
    hint: 'El multiplicador convierte los RVU en honorario: RVU × multiplicador = honorario final.',
  },
  // ── 10. Nueva cirugía — procedimientos ──────────────────────────
  {
    step: 10,
    route: '/cases/new',
    emoji: '🩺',
    title: 'Procedimientos quirúrgicos',
    description: 'Seleccioná los procedimientos que se realizaron en la cirugía. Tus procedimientos favoritos aparecen al inicio de la lista para agilizar el registro. Podés agregar más de uno, si alguno no esta ahi tambien lo puedes buscar en Buscar Otros procedimientos.',
    hint: 'Buscá y agregá al menos un procedimiento — es obligatorio para guardar la cirugía.',
  },
  // ── 11. Nueva cirugía — ayudante, imágenes y guardar ────────────
  {
    step: 11,
    route: '/cases/new',
    emoji: '🤝',
    title: 'Ayudante e imágenes',
    description: 'En médico ayudante: si tenés un colega vinculado podés seleccionarlo y le llegará una notificación. Si no, escribí el nombre manualmente o elegí "Sin ayudante". También podés subir hasta 5 imágenes en total por cirugía (preoperatorias ahora, postoperatorias después).',
    hint: 'Cuando todo esté completo, tocá "Guardar cirugía" para registrar tu cirugía de simulación.',
  },
  // ── 12. Los 3 estados + PDF ──────────────────────────────────────
  {
    step: 12,
    route: '/cases',
    emoji: '🔄',
    title: 'Los 3 estados de una cirugía',
    description: 'La tarjeta de la cirugía tiene tres botones, Operado, Facturado y Cobrado. ① Operado — cirugía realizada, podés subir fotos postoperatorias. ② Facturado — registrás el número de factura para mejor control (opcional). ③ Cobrado — el honorario fue cobrado, el caso se archiva. En estado "Cobrado" las imagagenes se eliminan en 3 meses y la cirugia en 6 meses. Desde cualquier estado podés exportar el PDF.',
    hint: 'Tocá el botón Ver en cualquier caso para ver todas las opciones, incluido exportar PDF. Toca el botón Exportar PDF, baja y selecciona la cirugai a exportar y luego vuelve a subir y aprieta de neuvo el boton para convertir los datos de la cirugía a PDF para poder llevar un regisro propio. ',
  },
  // ── 13. Estadísticas ─────────────────────────────────────────────
  {
    step: 13,
    route: '/stats',
    emoji: '📊',
    title: 'Estadísticas',
    description: 'Visualizá cuánto generaste por mes, por hospital y por procedimiento. Las estadísticas se actualizan cada vez que marcás un caso como cobrado. Son exclusivas tuyas — nadie más las ve.',
    hint: 'Explorá los filtros de fecha y hospital para ver tu práctica en números reales.',
  },
  // ── 14. Calculadora ──────────────────────────────────────────────
  {
    step: 14,
    route: '/calculator',
    emoji: '🧮',
    title: 'Calculadora de honorarios',
    description: 'Calculá el honorario de cualquier procedimiento al instante, sin necesidad de crear una cirugía. Útil para cotizaciones rápidas o para responder "¿cuánto cobrás por esto?" en el momento.',
    hint: 'Seleccioná un procedimiento y tu hospital favorito para ver el cálculo al instante.',
  },
  // ── 15. Novedades ────────────────────────────────────────────────
  {
    step: 15,
    route: '/novedades',
    emoji: '📰',
    title: 'Novedades',
    description: 'Acá encontrás contenido publicado por hospitales, casas médicas, farmacéuticas y laboratorios segmentado por tu especialidad. Visitala frecuentemente para estar al día con congresos, nuevos equipos, actualizaciones de tarifas y noticias relevantes para tu práctica.',
    hint: 'El contenido se actualiza constantemente — revisá Novedades cada vez que entrés a la app.',
  },
  // ── 16. Configuración ────────────────────────────────────────────
  {
    step: 16,
    route: '/settings',
    emoji: '⚙️',
    title: 'Tu perfil y plan',
    description: '¡Último paso! Desde Configuración podés actualizar tu especialidad y datos de perfil, ver tu plan actual (Free o Premium), gestionar tu suscripción y controlar la conexión con Google Calendar.',
    hint: 'Revisá que tu especialidad esté correctamente configurada — afecta las estadísticas y los anuncios que ves.',
  },
];

const STORAGE_KEY = 'medico_tutorial';

interface TutorialState {
  seen: boolean;       // modal de bienvenida ya se mostró
  active: boolean;     // tutorial en curso
  step: number;        // paso actual (1-11)
  completed: boolean;  // tutorial terminado
}

const defaultState: TutorialState = {
  seen: false,
  active: false,
  step: 1,
  completed: false,
};

function loadState(): TutorialState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
  } catch {
    return defaultState;
  }
}

function saveState(state: TutorialState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

interface TutorialContextValue {
  tutorialState: TutorialState;
  currentStepData: TutorialStep | null;
  startTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => void;
  dismissWelcome: () => void;
  restartTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [tutorialState, setTutorialState] = useState<TutorialState>(loadState);
  const navigate = useNavigate();

  const update = useCallback((patch: Partial<TutorialState>) => {
    setTutorialState(prev => {
      const next = { ...prev, ...patch };
      saveState(next);
      return next;
    });
  }, []);

  const startTutorial = useCallback(() => {
    update({ seen: true, active: true, step: 1, completed: false });
    navigate(TUTORIAL_STEPS[0].route);
  }, [update, navigate]);

  const nextStep = useCallback(() => {
    const nextStepNum = tutorialState.step + 1;
    if (nextStepNum > TUTORIAL_STEPS.length) {
      update({ active: false, completed: true });
    } else {
      update({ step: nextStepNum });
      navigate(TUTORIAL_STEPS[nextStepNum - 1].route);
    }
  }, [tutorialState.step, update, navigate]);

  const skipTutorial = useCallback(() => {
    update({ active: false, seen: true });
  }, [update]);

  const dismissWelcome = useCallback(() => {
    update({ seen: true });
  }, [update]);

  const restartTutorial = useCallback(() => {
    update({ seen: true, active: true, step: 1, completed: false });
    navigate(TUTORIAL_STEPS[0].route);
  }, [update, navigate]);

  const currentStepData = tutorialState.active
    ? (TUTORIAL_STEPS[tutorialState.step - 1] ?? null)
    : null;

  return (
    <TutorialContext.Provider value={{
      tutorialState,
      currentStepData,
      startTutorial,
      nextStep,
      skipTutorial,
      dismissWelcome,
      restartTutorial,
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used inside TutorialProvider');
  return ctx;
}
