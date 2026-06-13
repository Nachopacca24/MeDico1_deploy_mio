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
  /** data-tutorial attribute del elemento a destacar con spotlight */
  target?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { step: 1,  route: '/operations', emoji: '🩺', target: 'procedures-search',
    title: 'Tabla de California',
    description: 'Más de 4,000 procedimientos quirúrgicos con su código CPT y valor en RVU. Esta es la base de todos tus cálculos de honorarios. Están divididos por especialidad.',
    hint: 'Buscá un procedimiento que usés frecuentemente y tocá ⭐ para agregarlo a favoritos.' },

  { step: 2,  route: '/hospitals', emoji: '🏥', target: 'hospitals-list',
    title: 'Hospitales',
    description: 'Registrá los hospitales donde operás. A cada uno le podés configurar tu multiplicador RVU — así MeDico App calcula el honorario exacto según el hospital.',
    hint: 'Buscá tu hospital principal y marcalo como favorito.' },

  { step: 3,  route: '/insurances', emoji: '🛡️', target: 'insurances-list',
    title: 'Seguros médicos',
    description: 'Guardá los seguros médicos que manejás frecuentemente. Al registrar una cirugía, los podés seleccionar rápidamente sin tener que escribirlos cada vez.',
    hint: 'Agregá un seguro que usés seguido como favorito.' },

  { step: 4,  route: '/favorites', emoji: '⭐', target: 'favorites-list',
    title: 'Tus favoritos',
    description: 'Acá aparecen todos tus favoritos: procedimientos, hospitales y seguros. Al crear una cirugía, estos se cargan primero para que puedas registrar más rápido.',
    hint: 'Revisá que tus favoritos estén aquí — se pre-cargan cada vez que creés una nueva cirugía.' },

  { step: 5,  route: '/colleagues', emoji: '👥', target: 'colleague-code',
    title: 'Colegas y ayudantes',
    description: 'Tu código de colega es único y personal. Compartilo con otros médicos para que te envíen solicitudes de colaboración, o buscá el código de un colega para enviarle una solicitud vos.',
    hint: 'Copiá tu código personal (aparece arriba de la página) y enviáselo a un colega.' },

  { step: 6,  route: '/calendar', emoji: '📅', target: 'calendar-connect',
    title: 'Google Calendar',
    description: 'Conectá tu Google Calendar y cada cirugía que registrés aparece automáticamente en tu agenda con fecha, hora, hospital y procedimientos.',
    hint: 'Tocá "Conectar Google Calendar" para autorizar la sincronización.' },

  { step: 7,  route: '/cases', emoji: '📋', target: 'new-case-btn',
    title: 'Mis cirugías',
    description: 'Acá vas a ver todas tus cirugías registradas. Vamos a crear una cirugía de simulación — podés eliminarla después cuando esté en estado "Cobrado".',
    hint: 'Tocá el botón "+ Nueva Cirugía" para comenzar la simulación.' },

  { step: 8,  route: '/cases/new', emoji: '👤', target: 'patient-data',
    title: 'Datos del paciente',
    description: 'Usá estos datos de prueba: Nombre → Juan Pérez · ID → 123 · completá Edad, Género y Diagnóstico principal.',
    hint: 'Completá los datos del paciente y bajá a la siguiente sección.' },

  { step: 9,  route: '/cases/new', emoji: '🏥', target: 'hospital-selector',
    title: 'Hospital, seguro y fecha',
    description: 'Seleccioná el hospital — tus favoritos aparecen primero. Lo mismo para el seguro. El multiplicador RVU lo define el hospital; podés dejarlo en blanco para practicar.',
    hint: 'RVU × multiplicador = honorario final.' },

  { step: 10, route: '/cases/new', emoji: '🩺', target: 'procedures-selector',
    title: 'Procedimientos quirúrgicos',
    description: 'Seleccioná los procedimientos realizados. Tus favoritos aparecen al inicio. Podés agregar más de uno y buscar cualquier otro en "Buscar otros procedimientos".',
    hint: 'Agregá al menos un procedimiento — es obligatorio para guardar.' },

  { step: 11, route: '/cases/new', emoji: '🤝', target: 'save-case-btn',
    title: 'Guardar cirugía',
    description: 'Ya casi terminás. Si tenés un colega vinculado podés seleccionarlo como ayudante. También podés subir hasta 5 imágenes por cirugía.',
    hint: 'Tocá "Crear Caso" para guardar tu cirugía de simulación.' },

  { step: 12, route: '/cases', emoji: '🔄', target: 'case-status',
    title: 'Los 3 estados',
    description: '① Operado — cirugía realizada. ② Facturado — registrás el número de factura. ③ Cobrado — honorario cobrado, el caso se archiva. Desde cualquier estado podés exportar PDF.',
    hint: 'Tocá "Ver" en cualquier caso para ver todas las opciones, incluido exportar PDF.' },

  { step: 13, route: '/stats', emoji: '📊', target: 'stats-chart',
    title: 'Estadísticas',
    description: 'Visualizá cuánto generaste por mes, por hospital y por procedimiento. Se actualizan cada vez que marcás un caso como cobrado.',
    hint: 'Explorá los filtros de fecha y hospital para ver tu práctica en números.' },

  { step: 14, route: '/calculator', emoji: '🧮', target: 'calculator-form',
    title: 'Calculadora de honorarios',
    description: 'Calculá el honorario de cualquier procedimiento al instante, sin crear una cirugía. Útil para cotizaciones rápidas.',
    hint: 'Seleccioná un procedimiento y tu hospital favorito para ver el cálculo.' },

  { step: 15, route: '/novedades', emoji: '📰', target: 'novedades-list',
    title: 'Novedades',
    description: 'Contenido de hospitales, casas médicas y laboratorios segmentado por tu especialidad. Congresos, nuevos equipos, actualizaciones de tarifas.',
    hint: 'El contenido se actualiza constantemente — revisá Novedades frecuentemente.' },

  { step: 16, route: '/settings', emoji: '⚙️', target: 'settings-plan-tab',
    title: 'Tu perfil y plan',
    description: '¡Último paso! Actualizá tu especialidad, mirá tu plan actual y gestioná tu suscripción desde aquí.',
    hint: 'Revisá que tu especialidad esté bien configurada — afecta estadísticas y anuncios.' },
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
