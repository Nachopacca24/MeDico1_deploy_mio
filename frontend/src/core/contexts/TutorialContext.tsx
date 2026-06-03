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
  {
    step: 1,
    route: '/operations',
    emoji: '🩺',
    title: 'Tabla de California',
    description: 'Acá encontrás más de 4,000 procedimientos quirúrgicos con su código CPT y valor en RVU. Esta es la base de todos tus cálculos de honorarios.',
    hint: 'Buscá un procedimiento que usés frecuentemente y tocá ⭐ para agregarlo a favoritos.',
  },
  {
    step: 2,
    route: '/hospitals',
    emoji: '🏥',
    title: 'Hospitales',
    description: 'Registrá los hospitales donde operás. A cada uno le podés configurar tu multiplicador RVU — así MeDico App calcula el honorario exacto por hospital.',
    hint: 'Buscá tu hospital y marcalo como favorito para tenerlo disponible al crear cirugías.',
  },
  {
    step: 3,
    route: '/insurances',
    emoji: '🛡️',
    title: 'Seguros médicos',
    description: 'Guardá los seguros médicos que manejás frecuentemente. Al registrar una cirugía, los podés seleccionar rápidamente sin tener que escribirlos cada vez.',
    hint: 'Agregá un seguro que usés seguido como favorito.',
  },
  {
    step: 4,
    route: '/favorites',
    emoji: '⭐',
    title: 'Tus favoritos',
    description: 'Acá aparecen todos tus favoritos: procedimientos, hospitales y seguros. Al crear una cirugía, estos se cargan primero para que puedas registrar más rápido.',
    hint: 'Revisá que tus favoritos estén aquí. Se pre-cargan cada vez que creés un caso nuevo.',
  },
  {
    step: 5,
    route: '/colleagues',
    emoji: '👥',
    title: 'Colegas y ayudantes',
    description: 'Tu código de colega es único y personal. Compartilo con otros médicos para que te envíen solicitudes de colaboración. También podés buscar el código de un colega y enviarle una solicitud vos.',
    hint: 'Copiá tu código (aparece arriba) y enviáselo a un colega para empezar a colaborar en casos.',
  },
  {
    step: 6,
    route: '/calendar',
    emoji: '📅',
    title: 'Google Calendar',
    description: 'Conectá tu Google Calendar y cada cirugía que registrés aparece automáticamente en tu agenda con fecha, hora, hospital y procedimientos. Se actualiza solo cada vez que editás un caso.',
    hint: 'Tocá "Conectar Google Calendar" para autorizar la sincronización.',
  },
  {
    step: 7,
    route: '/cases/new',
    emoji: '🔪',
    title: 'Tu primera cirugía',
    description: 'Completá los datos del paciente: nombre, edad, diagnóstico y procedimientos. En el campo de ayudante, si todavía no tenés colegas vinculados, podés escribir el nombre manualmente. También podés subir hasta 5 imágenes preoperatorias.',
    hint: 'Completá el formulario y guardá el caso. Te guiaremos al siguiente paso.',
  },
  {
    step: 8,
    route: '/cases',
    emoji: '📋',
    title: 'Los 3 estados de una cirugía',
    description: '① Operado — la cirugía fue realizada. Podés subir fotos postoperatorias (hasta 5). ② Facturado — ingresás el número de factura para mejor control (opcional). ③ Cobrado — el honorario fue cobrado, el caso se archiva. Las imágenes se eliminan automáticamente a los 3 meses.',
    hint: 'Desde el menú de cada caso (⋯) podés exportar el PDF para enviarlo a la aseguradora.',
  },
  {
    step: 9,
    route: '/stats',
    emoji: '📊',
    title: 'Estadísticas',
    description: 'Visualizá cuánto generaste por mes, por hospital y por procedimiento. Las estadísticas se actualizan cada vez que marcás un caso como cobrado. Son exclusivas tuyas — nadie más las ve.',
    hint: 'Explorá los filtros de fecha y hospital para ver tu práctica en detalle.',
  },
  {
    step: 10,
    route: '/calculator',
    emoji: '🧮',
    title: 'Calculadora de honorarios',
    description: 'Calculá el honorario de cualquier procedimiento al instante, sin crear un caso. Útil para cotizaciones o para responder la clásica pregunta: "¿Cuánto cobrás por esto?"',
    hint: 'Seleccioná un procedimiento y tu hospital favorito para ver el cálculo inmediato.',
  },
  {
    step: 11,
    route: '/settings',
    emoji: '⚙️',
    title: 'Tu perfil y plan',
    description: '¡Último paso! Desde Configuración podés actualizar tu especialidad y datos de perfil, ver tu plan actual (Free o Premium), gestionar tu suscripción y controlar la conexión con Google Calendar.',
    hint: 'Revisá que tu especialidad esté correctamente configurada — afecta los anuncios y las estadísticas.',
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
