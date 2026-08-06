from datetime import date, time, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from apps.medico.models import AnesthesiaCase, Hospital, SurgicalCase
from apps.medico.services.firebase import notify_team

User = get_user_model()


def _make_case(**kwargs):
    hospital, _ = Hospital.objects.get_or_create(name='Hospital Test')
    doctor = User.objects.create(username=f"doc_{User.objects.count()}", email=f"doc_{User.objects.count()}@example.com")
    defaults = dict(
        patient_name='Miguel',
        hospital=hospital,
        created_by=doctor,
        surgery_date=date.today(),
        status='scheduled',
        is_operated=False,
    )
    defaults.update(kwargs)
    return SurgicalCase.objects.create(**defaults)


class SendOperatedRemindersOvernightTest(TestCase):
    """
    send_operated_reminders debe usar la hora de fin *real* (posiblemente al día
    siguiente si la cirugía cruza la medianoche), no combinar surgery_end_time
    literalmente con la misma surgery_date siempre.
    """

    def test_overnight_surgery_not_reminded_before_it_ends(self):
        """Cirugía empieza 23:31 hoy, termina 00:45 (mañana). No debe avisar todavía."""
        case = _make_case(surgery_time=time(23, 31), surgery_end_time=time(0, 45))
        call_command('send_operated_reminders')
        case.refresh_from_db()
        self.assertIsNone(case.operated_reminder_sent_at)

    def test_overnight_surgery_reminded_after_real_end_time(self):
        """Si ya pasaron los 10 min desde la hora de fin real (al día siguiente), sí debe avisar."""
        yesterday = date.today() - timedelta(days=1)
        case = _make_case(
            surgery_date=yesterday,
            surgery_time=time(23, 31),
            surgery_end_time=time(0, 45),  # = yesterday + 1 day = today, ya pasó
        )
        call_command('send_operated_reminders')
        case.refresh_from_db()
        self.assertIsNotNone(case.operated_reminder_sent_at)

    def test_same_day_surgery_in_the_past_gets_reminded(self):
        case = _make_case(
            surgery_date=date.today() - timedelta(days=1),
            surgery_time=time(9, 0),
            surgery_end_time=time(10, 0),
        )
        call_command('send_operated_reminders')
        case.refresh_from_db()
        self.assertIsNotNone(case.operated_reminder_sent_at)

    def test_same_day_surgery_in_the_future_not_reminded(self):
        case = _make_case(
            surgery_date=date.today() + timedelta(days=1),
            surgery_time=time(9, 0),
            surgery_end_time=time(10, 0),
        )
        call_command('send_operated_reminders')
        case.refresh_from_db()
        self.assertIsNone(case.operated_reminder_sent_at)

    def test_missing_start_time_falls_back_to_same_day(self):
        """Sin surgery_time no se puede detectar el cruce de medianoche — se mantiene el
        comportamiento anterior (combinar con la misma fecha) en vez de fallar."""
        case = _make_case(
            surgery_date=date.today() - timedelta(days=1),
            surgery_time=None,
            surgery_end_time=time(10, 0),
        )
        call_command('send_operated_reminders')
        case.refresh_from_db()
        self.assertIsNotNone(case.operated_reminder_sent_at)


class NotifyTeamTest(TestCase):
    """
    notify_team debe llegar a todo el equipo aceptado del caso (principal, ayudante,
    anestesiólogo) salvo a quien disparó el evento — antes, la mayoría de estos
    eventos (aceptar/rechazar, salir del caso, agregar procedimientos) solo le
    llegaban al médico principal.
    """

    def _team_case(self, assistant_accepted=True, anesthesiologist_accepted=True):
        principal = User.objects.create(username='principal', email='principal@example.com')
        assistant = User.objects.create(username='assistant', email='assistant@example.com')
        anesthesiologist = User.objects.create(username='anesth', email='anesth@example.com')
        hospital, _ = Hospital.objects.get_or_create(name='Hospital Test')
        case = SurgicalCase.objects.create(
            patient_name='Miguel',
            hospital=hospital,
            created_by=principal,
            surgery_date=date.today(),
            status='scheduled',
            assistant_doctor=assistant,
            assistant_accepted=assistant_accepted,
        )
        AnesthesiaCase.objects.create(
            case=case,
            anesthesiologist=anesthesiologist,
            anesthesiologist_accepted=anesthesiologist_accepted,
        )
        return principal, assistant, anesthesiologist, case

    @patch('apps.medico.services.firebase.notify_user')
    def test_anesthesiologist_accepts_notifies_principal_and_assistant(self, mock_notify):
        principal, assistant, anesthesiologist, case = self._team_case()
        notify_team(case, exclude_user=anesthesiologist, title='t', body='b')
        notified = {call.args[0] for call in mock_notify.call_args_list}
        self.assertEqual(notified, {principal, assistant})

    @patch('apps.medico.services.firebase.notify_user')
    def test_assistant_leaves_notifies_principal_and_anesthesiologist(self, mock_notify):
        principal, assistant, anesthesiologist, case = self._team_case()
        notify_team(case, exclude_user=assistant, title='t', body='b')
        notified = {call.args[0] for call in mock_notify.call_args_list}
        self.assertEqual(notified, {principal, anesthesiologist})

    @patch('apps.medico.services.firebase.notify_user')
    def test_principal_action_notifies_assistant_and_anesthesiologist(self, mock_notify):
        principal, assistant, anesthesiologist, case = self._team_case()
        notify_team(case, exclude_user=principal, title='t', body='b')
        notified = {call.args[0] for call in mock_notify.call_args_list}
        self.assertEqual(notified, {assistant, anesthesiologist})

    @patch('apps.medico.services.firebase.notify_user')
    def test_pending_collaborators_not_notified(self, mock_notify):
        """Un ayudante/anestesiólogo que todavía no aceptó (accepted=None) no es 'equipo' todavía."""
        principal, assistant, anesthesiologist, case = self._team_case(
            assistant_accepted=None, anesthesiologist_accepted=None,
        )
        notify_team(case, exclude_user=principal, title='t', body='b')
        notified = {call.args[0] for call in mock_notify.call_args_list}
        self.assertEqual(notified, set())

    @patch('apps.medico.services.firebase.notify_user')
    def test_rejected_collaborator_not_notified(self, mock_notify):
        """Un ayudante que rechazó (accepted=False) tampoco debe recibir el aviso."""
        principal, assistant, anesthesiologist, case = self._team_case(assistant_accepted=False)
        notify_team(case, exclude_user=principal, title='t', body='b')
        notified = {call.args[0] for call in mock_notify.call_args_list}
        self.assertEqual(notified, {anesthesiologist})

    @patch('apps.medico.services.firebase.notify_user')
    def test_case_without_assistant_or_anesthesiologist(self, mock_notify):
        hospital, _ = Hospital.objects.get_or_create(name='Hospital Test')
        principal = User.objects.create(username='solo_principal', email='solo@example.com')
        case = SurgicalCase.objects.create(
            patient_name='Miguel', hospital=hospital, created_by=principal,
            surgery_date=date.today(), status='scheduled',
        )
        actor = User.objects.create(username='someone_else', email='someone@example.com')
        notify_team(case, exclude_user=actor, title='t', body='b')
        notified = {call.args[0] for call in mock_notify.call_args_list}
        self.assertEqual(notified, {principal})
