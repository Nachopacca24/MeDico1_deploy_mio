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
  {
    step: 1, route: '/operations', emoji: '🩺', target: 'procedures-search',
    title: 'Buscá tus procedimientos',
    description: 'Acá están los +4,000 procedimientos de la Tabla de California con su código y valor en RVU. Antes de crear tu primera cirugía, guardá los que más usás.',
    hint: 'Escribí el nombre de un procedimiento → tocá ⭐ para guardarlo como favorito. Se cargarán automáticamente en cada cirugía.',
  },
  {
    step: 2, route: '/hospitals', emoji: '🏥', target: 'hospitals-list',
    title: 'Configurá tu hospital',
    description: 'Registrá los hospitales donde operás. Cada hospital tiene su propio multiplicador RVU — ese número convierte el valor RVU en el honorario real que cobrás.',
    hint: 'Encontrá tu hospital → tocá ⭐ → abrilo y configurá el multiplicador RVU. Sin esto el cálculo no funciona.',
  },
  {
    step: 3, route: '/insurances', emoji: '🛡️', target: 'insurances-list',
    title: 'Seguros médicos',
    description: 'Guardá los seguros que manejás frecuentemente. Al crear una cirugía se cargan solos, sin necesidad de escribirlos cada vez.',
    hint: 'Tocá ⭐ en los seguros que más usás para guardarlos.',
  },
  {
    step: 4, route: '/favorites', emoji: '⭐', target: 'favorites-list',
    title: 'Tus favoritos',
    description: 'Todo lo que marcaste con ⭐ aparece acá: procedimientos, hospitales y seguros. Cuando creés una cirugía nueva, estos se pre-cargan para que sea más rápido.',
    hint: 'Si no ves algo, volvé a la sección correspondiente y marcalo con ⭐.',
  },
  {
    step: 5, route: '/colleagues', emoji: '👥', target: 'colleague-code',
    title: 'Colegas y ayudantes',
    description: 'Tu código de colega es único. Compartilo con otros médicos para colaborar. Si alguien te invita a una cirugía como ayudante, la verás en la sección "Cirugías".',
    hint: 'Copiá tu código (aparece arriba de la pantalla) y enviáselo a un colega por WhatsApp o mensaje.',
  },
  {
    step: 6, route: '/calendar', emoji: '📅', target: 'calendar-connect',
    title: 'Google Calendar',
    description: 'Conectá tu cuenta de Google y cada cirugía que registrés aparece automáticamente en tu agenda con fecha, hora, hospital y procedimientos.',
    hint: 'Tocá "Conectar Google Calendar" y autorizá el acceso. Solo se necesita hacer una vez.',
  },
  {
    step: 7, route: '/cases', emoji: '📋', target: 'new-case-btn',
    title: 'Crear una cirugía',
    description: 'Acá vas a ver todas tus cirugías. Ahora vamos a crear una de práctica juntos. Cuando termines el tutorial podés eliminarla desde el detalle del caso.',
    hint: 'Tocá el botón "+ Nueva Cirugía" para empezar.',
  },
  {
    step: 8, route: '/cases/new', emoji: '👤', target: 'patient-data',
    title: '① Datos del paciente',
    description: 'Completá el nombre, ID de expediente, edad, género y diagnóstico del paciente. Para practicar usá: Nombre → Juan Pérez · ID → 123 · Edad → 45.',
    hint: 'Los datos del paciente están cifrados — solo vos podés verlos.',
  },
  {
    step: 9, route: '/cases/new', emoji: '🏥', target: 'hospital-selector',
    title: '② Hospital, seguro y fecha',
    description: 'Seleccioná el hospital (tus favoritos aparecen primero), el seguro médico y la fecha de la cirugía. El multiplicador se carga solo según el hospital elegido.',
    hint: 'RVU × multiplicador del hospital = honorario en Q. Podés cambiarlo manualmente si necesitás.',
  },
  {
    step: 10, route: '/cases/new', emoji: '🩺', target: 'procedures-selector',
    title: '③ Procedimientos',
    description: 'Seleccioná los procedimientos realizados — tus favoritos aparecen primero. Podés agregar varios. El sistema suma los RVU y calcula el honorario total.',
    hint: 'Tenés que agregar al menos un procedimiento para poder guardar la cirugía.',
  },
  {
    step: 11, route: '/cases/new', emoji: '💾', target: 'save-case-btn',
    title: '④ Guardar la cirugía',
    description: 'Revisá el resumen: paciente, hospital, procedimientos y honorario calculado. Si operaste con un colega podés asignarlo como ayudante — recibirá una notificación.',
    hint: 'Tocá "Crear Caso" para guardar. La cirugía queda guardada en estado Operado.',
  },
  {
    step: 12, route: '/cases', emoji: '👁️', target: 'case-status',
    title: 'Ver y editar una cirugía',
    description: 'Tocá "Ver" en cualquier cirugía para abrir el detalle completo. Desde ahí podés: editar todos los datos, cambiar el estado, exportar un PDF y subir fotos de la cirugía.',
    hint: 'Tocá "Editar" para modificar cualquier dato. Tocá "PDF" para exportar el resumen.',
  },
  {
    step: 13, route: '/cases', emoji: '🔄', target: 'case-status',
    title: 'Los 3 estados de una cirugía',
    description: '① Operado: cirugía realizada. ② Facturado: ingresás el número de factura cuando la enviás. ③ Cobrado: honorario recibido — el caso se archiva en la pestaña "Cobrados".',
    hint: 'Cada estado se cambia desde el detalle del caso. Los casos cobrados van al historial.',
  },
  {
    step: 14, route: '/stats', emoji: '📊', target: 'stats-chart',
    title: 'Estadísticas',
    description: 'Cada cirugía que pasás a "Cobrado" suma acá. Ves tus ingresos por mes, los hospitales donde más operás y los procedimientos más frecuentes.',
    hint: 'Usá los filtros de fecha para ver por semana, mes o rango personalizado.',
  },
  {
    step: 15, route: '/calculator', emoji: '🧮', target: 'calculator-form',
    title: 'Calculadora rápida',
    description: 'Calculá el honorario de cualquier procedimiento sin crear una cirugía. Ideal para dar una cotización rápida al paciente o al seguro.',
    hint: 'Seleccioná un procedimiento y tu hospital — el valor en Q aparece de inmediato.',
  },
  {
    step: 16, route: '/settings', emoji: '⚙️', target: 'settings-plan-tab',
    title: '¡Listo! Configuración final',
    description: 'Último paso: revisá tu perfil en Configuración. Asegurate de tener tu especialidad médica guardada — afecta las estadísticas, novedades y contenido personalizado.',
    hint: 'Tu especialidad se configura en la pestaña "Perfil" dentro de Configuración.',
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
