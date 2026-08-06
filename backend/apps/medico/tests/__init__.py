from datetime import date, time, timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from apps.medico.models import Hospital, SurgicalCase

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
