// src/core/contexts/TutorialContext.tsx

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/shared/services/authService';
import { useAuth } from '@/shared/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

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
    description: 'Acá están los +4,000 procedimientos de la tabla de códigos quirúrgicos. Antes de crear tu primera cirugía, guardá los que más usás como favoritos.',
    hint: 'Escribí el nombre de un procedimiento → tocá ⭐ para guardarlo como favorito. Se cargarán automáticamente en cada cirugía.',
  },
  {
    step: 2, route: '/hospitals', emoji: '🏥', target: 'hospitals-list',
    title: 'Configurá tu hospital',
    description: 'Registrá los hospitales donde operás. Tenerlos guardados te permite llevar estadísticas por lugar y agiliza la carga al crear cada cirugía — se completa automáticamente.',
    hint: 'Encontrá tu hospital → tocá ⭐ para guardarlo como favorito. Aparecerá primero al crear tus cirugías.',
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
    description: 'Tu código de colega es único. Compartilo con otros médicos para colaborar. Si alguien te invita a una cirugía como ayudante, la verás en la sección "Cirugías".\n\nSi invitás a un colega y no responde, le llegan recordatorios automáticos y a vos te avisamos si no confirmó a tiempo. Si el ayudante o el anestesiólogo te rechaza la invitación, desde "Editar" podés cambiarlo por otro colega, escribir el nombre manualmente, o dejar el caso sin anestesiólogo/ayudante.',
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
    description: 'Acá vas a ver todas tus cirugías. Ahora vamos a crear una de práctica juntos. Cuando termines el tutorial podés eliminarla desde el detalle del caso (tocá "Ver" → botón Eliminar).',
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
    hint: 'Tus hospitales favoritos aparecen primero. El multiplicador se carga solo — podés ajustarlo manualmente si necesitás.',
  },
  {
    step: 10, route: '/cases/new', emoji: '🩺', target: 'procedures-selector',
    title: '③ Tabla de Códigos',
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
    description: '① Operado: cirugía realizada. ② Facturado: ingresás el número de factura cuando la enviás. ③ Cobrado: honorario recibido — el caso se mueve a la pestaña "Cobrados" y se suma a tus estadísticas.\n\n🗑️ Eliminar es diferente a Cobrado: si querés borrar un caso sin que cuente en estadísticas, entrá al detalle ("Ver") y usá el botón Eliminar. Cobrado archiva y suma; Eliminar borra sin registrar.',
    hint: 'Cobrado → suma a estadísticas. Eliminar (desde "Ver") → borra sin afectar estadísticas.',
  },
  {
    step: 14, route: '/stats', emoji: '📊', target: 'stats-chart',
    title: 'Estadísticas',
    description: 'Solo las cirugías que pasás a "Cobrado" suman acá. Ves tu rendimiento por mes, los hospitales donde más operás y los procedimientos más frecuentes.',
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
    description: 'Último paso: revisá Configuración. En "Perfil" guardás tu especialidad. En "Preferencias" elegís modo oscuro o claro y configurás el recordatorio de notificaciones para tus cirugías. Si te queda alguna duda — sobre suscripción, referidos o privacidad — encontrás las Preguntas frecuentes en esta misma pestaña "Tutorial".',
    hint: 'El recordatorio de cirugía te avisa con anticipación — podés elegir cuántas horas antes querés recibirlo.',
  },
];

// Tutorial para anestesiólogos — igual hasta "Mis Cirugías" (pasos 1-6),
// después el flujo cambia: crean su propio caso de anestesia en vez de una cirugía,
// con su propio formulario de códigos y honorarios.
export const ANESTHESIA_TUTORIAL_STEPS: TutorialStep[] = [
  {
    step: 1, route: '/operations', emoji: '🩺', target: 'procedures-search',
    title: 'Buscá tus procedimientos',
    description: 'Acá están los +4,000 procedimientos de la tabla de códigos quirúrgicos. Antes de crear tu primera cirugía, guardá los que más usás como favoritos.',
    hint: 'Escribí el nombre de un procedimiento → tocá ⭐ para guardarlo como favorito. Se cargarán automáticamente en cada cirugía.',
  },
  {
    step: 2, route: '/hospitals', emoji: '🏥', target: 'hospitals-list',
    title: 'Configurá tu hospital',
    description: 'Registrá los hospitales donde operás. Tenerlos guardados te permite llevar estadísticas por lugar y agiliza la carga al crear cada cirugía — se completa automáticamente.',
    hint: 'Encontrá tu hospital → tocá ⭐ para guardarlo como favorito. Aparecerá primero al crear tus cirugías.',
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
    step: 7, route: '/cases', emoji: '📨', target: 'anesthesia-invitations',
    title: 'Cuando te invitan a una cirugía',
    description: 'Un cirujano puede invitarte a un caso como anestesiólogo. La invitación aparece acá arriba, en "Mis Cirugías", con los datos del paciente y el hospital — tocás Aceptar o Rechazar. Al aceptar: el caso pasa a tu lista, se agrega solo a tu Google Calendar, y ya podés entrar a completar tu formulario de anestesia (códigos, equipo y, si ya operaron, el tiempo) igual que en un caso propio.\n\nSi te olvidás de responder, te vamos a recordar — más seguido cuanto más cerca esté la fecha de la cirugía.',
    hint: 'Si ahora no tenés ninguna invitación pendiente, no hay problema — esta sección solo aparece cuando alguien te invita.',
  },
  {
    step: 8, route: '/cases', emoji: '📋', target: 'new-anesthesia-btn',
    title: 'Crear tu propio caso de anestesia',
    description: 'Además de aceptar invitaciones, como anestesiólogo también podés registrar vos mismo tus propios casos — sin depender de que un cirujano te invite. Vamos a crear uno de práctica juntos. Cuando termines el tutorial podés eliminarlo desde el detalle del caso (tocá "Ver" → botón Eliminar).',
    hint: 'Tocá el botón "Nueva Anestesia" para empezar — no "Nueva Cirugía", ese botón es para cirujanos.',
  },
  {
    step: 9, route: '/cases/new/anesthesia', emoji: '👤', target: 'patient-data',
    title: '① Datos del paciente',
    description: 'Completá el nombre, ID de expediente, edad, género y diagnóstico del paciente. Para practicar usá: Nombre → Juan Pérez · ID → 123 · Edad → 45.',
    hint: 'Los datos del paciente están cifrados — solo vos podés verlos.',
  },
  {
    step: 10, route: '/cases/new/anesthesia', emoji: '🏥', target: 'hospital-selector',
    title: '② Hospital, seguro y equipo médico',
    description: 'Seleccioná el hospital (tus favoritos aparecen primero) y el seguro — si no tiene, dejalo en "Sin seguro". Si conocés al médico principal y al ayudante, escribí sus nombres: no hace falta que tengan cuenta en MeDico App.',
    hint: 'Médico Principal y Médico Ayudante son campos de texto libre, solo para referencia.',
  },
  {
    step: 11, route: '/cases/new/anesthesia', emoji: '🩺', target: 'anesthesia-codes-picker',
    title: '③ Códigos de anestesia',
    description: 'Buscá y agregá los códigos de anestesia que usaste. Tocá la ⭐ junto a un resultado para guardarlo como favorito — la próxima vez aparece arriba en "Procedimientos Frecuentes" para agregarlo con un solo toque.',
    hint: 'Acá también configurás el valor por unidad y, si usaste equipo propio, activás el interruptor de "Uso de Equipo Personal".',
  },
  {
    step: 12, route: '/cases/new/anesthesia', emoji: '💾', target: 'save-case-btn',
    title: '④ Guardar el caso',
    description: 'Revisá los datos: paciente, hospital, códigos y honorario calculado. Guardalo para que aparezca en "Mis Cirugías".',
    hint: 'Tocá "Crear Caso de Anestesia" para guardar.',
  },
  {
    step: 13, route: '/cases', emoji: '👁️', target: 'case-status',
    title: 'Ver y editar tu caso',
    description: 'Tocá "Ver" en cualquier caso para abrir el detalle completo. Desde ahí podés seguir agregando códigos, exportar el PDF de anestesia y subir fotos.',
    hint: 'El botón "Anestesia" en la tarjeta te lleva directo al formulario de anestesia de ese caso.',
  },
  {
    step: 14, route: '/cases', emoji: '🔄', target: 'case-status',
    title: 'Los 3 estados de tu anestesia',
    description: 'Cada caso tiene sus propios estados independientes del cirujano: ① Operado: habilitá el campo de Tiempo en tu formulario (1 unidad cada 15 minutos — necesario para calcular bien el honorario). ② Facturado: ingresás tu número de factura de anestesia. ③ Cobrado: honorario recibido — el caso pasa a "Cobrados" y suma a tus estadísticas.\n\n🗑️ Eliminar es diferente: si querés borrar un caso sin que cuente en estadísticas, entrá al detalle ("Ver") y usá el botón Eliminar. Cobrado archiva y suma; Eliminar borra sin registrar.',
    hint: 'Cobrado → suma a tus estadísticas. Eliminar (desde "Ver") → borra sin afectar estadísticas.',
  },
  {
    step: 15, route: '/stats', emoji: '📊', target: 'stats-chart',
    title: 'Estadísticas',
    description: 'Solo los casos que pasás a "Cobrado" suman acá — tanto tus casos propios como los que aceptaste como anestesiólogo invitado. Incluye RVU, procedimientos y hospitales más frecuentes.',
    hint: 'Usá los filtros de fecha para ver por semana, mes o rango personalizado.',
  },
  {
    step: 16, route: '/calculator', emoji: '🧮', target: 'calculator-form',
    title: 'Calculadora rápida',
    description: 'Calculá el honorario de cualquier procedimiento sin crear una cirugía. Ideal para dar una cotización rápida al paciente o al seguro.',
    hint: 'Seleccioná un procedimiento y tu hospital — el valor en Q aparece de inmediato.',
  },
  {
    step: 17, route: '/settings', emoji: '⚙️', target: 'settings-plan-tab',
    title: '¡Listo! Configuración final',
    description: 'Último paso: revisá Configuración. En "Perfil" guardás tu especialidad. En "Preferencias" elegís modo oscuro o claro y configurás el recordatorio de notificaciones para tus cirugías. Si te queda alguna duda — sobre suscripción, referidos o privacidad — encontrás las Preguntas frecuentes en esta misma pestaña "Tutorial".',
    hint: 'El recordatorio de cirugía te avisa con anticipación — podés elegir cuántas horas antes querés recibirlo.',
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
  steps: TutorialStep[];
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
  const { user } = useAuth();

  const steps = useMemo(
    () => (user?.specialty === 'Anestesiología' ? ANESTHESIA_TUTORIAL_STEPS : TUTORIAL_STEPS),
    [user?.specialty]
  );

  const update = useCallback((patch: Partial<TutorialState>) => {
    setTutorialState(prev => {
      const next = { ...prev, ...patch };
      saveState(next);
      return next;
    });
  }, []);

  const startTutorial = useCallback(() => {
    update({ seen: true, active: true, step: 1, completed: false });
    navigate(steps[0].route);
  }, [update, navigate, steps]);

  const nextStep = useCallback(() => {
    const nextStepNum = tutorialState.step + 1;
    if (nextStepNum > steps.length) {
      update({ active: false, completed: true });
      // Notify backend — fire and forget
      authService.authenticatedFetch(`${API_URL}/api/auth/tutorial-complete/`, { method: 'POST' }).catch(() => {});
    } else {
      update({ step: nextStepNum });
      navigate(steps[nextStepNum - 1].route);
    }
  }, [tutorialState.step, update, navigate, steps]);

  const skipTutorial = useCallback(() => {
    update({ active: false, seen: true });
  }, [update]);

  const dismissWelcome = useCallback(() => {
    update({ seen: true });
  }, [update]);

  const restartTutorial = useCallback(() => {
    update({ seen: true, active: true, step: 1, completed: false });
    navigate(steps[0].route);
  }, [update, navigate, steps]);

  const currentStepData = tutorialState.active
    ? (steps[tutorialState.step - 1] ?? null)
    : null;

  return (
    <TutorialContext.Provider value={{
      tutorialState,
      steps,
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
