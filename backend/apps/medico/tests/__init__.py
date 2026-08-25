from datetime import date, datetime, time, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from apps.medico.models import AnesthesiaCase, FCMToken, Hospital, SurgicalCase
from apps.medico.models.stats import UserStatsTotals
from apps.medico.services.firebase import notify_team, notify_user

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
        # "Hoy"/"ahora" anclados a un instante fijo, no al reloj real — este mismo
        # test, tal como estaba antes con date.today() de por medio, falló en CI
        # el 2026-08-22 porque corrió justo en la ventana de ~10-14 min por día
        # donde "medianoche + buffer" todavía no había pasado según el reloj real.
        fixed_now = timezone.make_aware(datetime(2026, 6, 15, 12, 0, 0))
        with patch('django.utils.timezone.now', return_value=fixed_now):
            case = _make_case(
                surgery_date=fixed_now.date(),
                surgery_time=time(23, 31), surgery_end_time=time(0, 45),
            )
            call_command('send_operated_reminders')
        case.refresh_from_db()
        self.assertIsNone(case.operated_reminder_sent_at)

    def test_overnight_surgery_reminded_after_real_end_time(self):
        """Si ya pasaron los 10 min desde la hora de fin real (al día siguiente), sí debe avisar."""
        # Mismo motivo que arriba: instante fijo en vez de date.today()/timezone.now()
        # reales, para que el resultado no dependa de a qué hora exacta corre CI.
        fixed_now = timezone.make_aware(datetime(2026, 6, 15, 12, 0, 0))
        with patch('django.utils.timezone.now', return_value=fixed_now):
            yesterday = fixed_now.date() - timedelta(days=1)
            case = _make_case(
                surgery_date=yesterday,
                surgery_time=time(23, 31),
                surgery_end_time=time(0, 45),  # = yesterday + 1 day, bien antes del mediodía fijo
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


class NotifyUserOptOutTest(TestCase):
    """
    notify_user (y por lo tanto notify_team, que llama a notify_user por cada
    destinatario) es el único canal para cirugías/invitaciones/colegas —
    receives_reminders debe gatearlo, y receives_advertising (el toggle de
    publicidad, que vive en un sistema completamente aparte:
    apps.communication.services.promo_push) no debe tener ningún efecto acá.
    """

    def _user_with_token(self, username, **kwargs):
        user = User.objects.create(username=username, email=f'{username}@example.com', **kwargs)
        FCMToken.objects.create(user=user, token=f'token-{username}', platform='android')
        return user

    @patch('apps.medico.services.firebase.send_push_notification')
    def test_reaches_user_when_reminders_enabled(self, mock_send):
        mock_send.return_value = {'success': ['token-doc'], 'failed_tokens': []}
        doc = self._user_with_token('doc', receives_reminders=True)

        notify_user(doc, title='Recordatorio', body='Tenés una cirugía mañana')

        mock_send.assert_called_once()
        self.assertEqual(mock_send.call_args.args[0], ['token-doc'])

    @patch('apps.medico.services.firebase.send_push_notification')
    def test_does_not_reach_user_when_reminders_disabled(self, mock_send):
        doc = self._user_with_token('doc', receives_reminders=False)

        notify_user(doc, title='Recordatorio', body='Tenés una cirugía mañana')

        mock_send.assert_not_called()

    @patch('apps.medico.services.firebase.send_push_notification')
    def test_receives_advertising_has_no_effect_on_reminders(self, mock_send):
        """El toggle de publicidad es un canal aparte — apagarlo no debe tocar
        cirugías/invitaciones/colegas, que dependen solo de receives_reminders."""
        mock_send.return_value = {'success': ['token-doc'], 'failed_tokens': []}
        doc = self._user_with_token('doc', receives_reminders=True, receives_advertising=False)

        notify_user(doc, title='Recordatorio', body='Tenés una cirugía mañana')

        mock_send.assert_called_once()

    @patch('apps.medico.services.firebase.send_push_notification')
    def test_notify_team_skips_only_the_recipient_who_opted_out(self, mock_send):
        mock_send.return_value = {'success': [], 'failed_tokens': []}
        principal = self._user_with_token('principal', receives_reminders=True)
        assistant = self._user_with_token('assistant', receives_reminders=False)
        hospital, _ = Hospital.objects.get_or_create(name='Hospital Test')
        case = SurgicalCase.objects.create(
            patient_name='Miguel', hospital=hospital, created_by=principal,
            assistant_doctor=assistant, assistant_accepted=True,
            surgery_date=date.today(), status='scheduled',
        )
        actor = User.objects.create(username='actor', email='actor@example.com')

        notify_team(case, exclude_user=actor, title='t', body='b')

        # send_push_notification solo se llama para principal — assistant se
        # filtra adentro de notify_user antes de siquiera buscar sus tokens.
        self.assertEqual(mock_send.call_count, 1)
        self.assertEqual(mock_send.call_args.args[0], ['token-principal'])


class PurgeArchivedCasesTest(TestCase):
    """purge_archived_cases no debe contar el mismo caso dos veces en las
    estadísticas históricas cuando el cirujano es también su propio
    anestesiólogo (un flujo real y soportado)."""

    def test_self_anesthesiologist_case_counted_once(self):
        hospital, _ = Hospital.objects.get_or_create(name='Hospital Test')
        doctor = User.objects.create(username='solo_doc', email='solo_doc@example.com')
        old_date = timezone.now() - timedelta(days=200)
        case = SurgicalCase.objects.create(
            patient_name='Paciente', hospital=hospital, created_by=doctor,
            surgery_date=date.today(), status='paid', is_operated=True,
            archived_at=old_date,
        )
        AnesthesiaCase.objects.create(
            case=case, anesthesiologist=doctor, anesthesiologist_accepted=True,
        )

        call_command('purge_archived_cases')

        totals = UserStatsTotals.objects.get(user=doctor)
        self.assertEqual(totals.total_cases, 1)
        self.assertFalse(SurgicalCase.objects.filter(pk=case.pk).exists())


class ProcedureOrderTest(TestCase):
    """add-procedure debe seguir asignando order correlativos incluso después
    de borrar uno del medio — Count() repetía el último order usado."""

    def test_order_continues_after_deleting_middle_procedure(self):
        from rest_framework.test import APIClient
        from apps.medico.models.surgical_case import CaseProcedure

        hospital, _ = Hospital.objects.get_or_create(name='Hospital Test')
        doctor = User.objects.create(username='proc_doc', email='proc_doc@example.com', is_email_verified=True)
        case = SurgicalCase.objects.create(
            patient_name='Paciente', hospital=hospital, created_by=doctor,
            surgery_date=date.today(), status='scheduled',
        )
        procs = [
            CaseProcedure.objects.create(
                case=case, surgery_code=f'C{i}', surgery_name=f'Cirugia {i}',
                specialty='General', rvu=1, hospital_factor=1, order=i,
            )
            for i in range(3)
        ]
        procs[1].delete()  # queda order=[0, 2]

        client = APIClient()
        client.force_authenticate(user=doctor)
        response = client.post(f'/api/v1/medico/cases/{case.pk}/add-procedure/', {
            'surgery_code': 'C3', 'surgery_name': 'Cirugia 3',
            'specialty': 'General', 'rvu': '1', 'hospital_factor': '1',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['order'], 3)
        self.assertEqual(
            sorted(case.procedures.values_list('order', flat=True)), [0, 2, 3],
        )

    def test_anesthesia_item_order_continues_after_deleting_middle_item(self):
        from rest_framework.test import APIClient
        from apps.medico.models.anesthesia import AnesthesiaItem

        hospital, _ = Hospital.objects.get_or_create(name='Hospital Test')
        surgeon = User.objects.create(username='an_surgeon', email='an_surgeon@example.com')
        anesthesiologist = User.objects.create(
            username='an_doc', email='an_doc@example.com', is_email_verified=True,
        )
        case = SurgicalCase.objects.create(
            patient_name='Paciente', hospital=hospital, created_by=surgeon,
            surgery_date=date.today(), status='scheduled',
        )
        anesthesia = AnesthesiaCase.objects.create(
            case=case, anesthesiologist=anesthesiologist, anesthesiologist_accepted=True,
        )
        items = [
            AnesthesiaItem.objects.create(
                anesthesia_case=anesthesia, surgery_code=f'A{i}', surgery_name=f'Anestesia {i}',
                base_units=1, order=i,
            )
            for i in range(3)
        ]
        items[1].delete()  # queda order=[0, 2]

        client = APIClient()
        client.force_authenticate(user=anesthesiologist)
        response = client.post(f'/api/v1/medico/cases/{case.pk}/anesthesia/items/', {
            'surgery_code': 'A3', 'surgery_name': 'Anestesia 3', 'base_units': '1',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(
            sorted(anesthesia.items.values_list('order', flat=True)), [0, 2, 3],
        )


class GlobalExceptionHandlerTest(TestCase):
    """Un ValidationError de full_clean() (llamado incondicionalmente desde
    SurgicalCase.save()) debía llegar como un 500 crudo sin manejar — el
    endpoint de assistant-status setea campos con setattr() directo desde
    request.data, sin pasar por un serializer que valide antes."""

    def test_invalid_field_value_returns_clean_400_not_500(self):
        from rest_framework.test import APIClient

        hospital, _ = Hospital.objects.get_or_create(name='Hospital Test')
        surgeon = User.objects.create(username='exc_surgeon', email='exc_surgeon@example.com')
        assistant = User.objects.create(
            username='exc_assistant', email='exc_assistant@example.com', is_email_verified=True,
        )
        case = SurgicalCase.objects.create(
            patient_name='Paciente', hospital=hospital, created_by=surgeon,
            surgery_date=date.today(), status='scheduled',
            assistant_doctor=assistant, assistant_accepted=True,
        )

        client = APIClient()
        client.force_authenticate(user=assistant)
        response = client.patch(f'/api/v1/medico/cases/{case.pk}/assistant-status/', {
            'assistant_invoice_number': 'X' * 200,  # max_length=100 en el modelo
        }, format='json')

        self.assertEqual(response.status_code, 400, response.data)


class AnesthesiaEndpointNoSessionResponseTest(TestCase):
    """GET .../anesthesia/ para un caso SIN sesión de anestesia debía devolver
    un body completamente vacío (Response(None) en DRF renderiza a b'', no al
    literal JSON `null`) — el frontend siempre tronaba con "Unexpected end of
    JSON input" al intentar parsearlo, para CUALQUIER caso regular sin
    anestesia (la mayoría de los casos quirúrgicos comunes)."""

    def test_returns_parseable_null_body_not_empty(self):
        from rest_framework.test import APIClient
        hospital, _ = Hospital.objects.get_or_create(name='Hospital Test')
        user = User.objects.create_user(
            username='no_anest_doc', email='no_anest_doc@example.com',
            password='x', is_email_verified=True,
        )
        case = SurgicalCase.objects.create(
            patient_name='Sin Anestesia', hospital=hospital, created_by=user,
            surgery_date=date.today(), status='scheduled',
        )

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(f'/api/v1/medico/cases/{case.pk}/anesthesia/')

        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.content, b'', 'el body no debe venir vacío')
        # Debe ser JSON válido y parsear a None — exactamente como espera el frontend.
        import json as _json
        self.assertIsNone(_json.loads(response.content))
