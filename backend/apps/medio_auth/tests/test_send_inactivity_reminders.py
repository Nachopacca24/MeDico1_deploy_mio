from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

User = get_user_model()

NOTIFY_PATH = 'apps.medio_auth.management.commands.send_inactivity_reminders.notify_user'


class SendInactivityRemindersTest(TestCase):
    def _user(self, **kwargs):
        defaults = dict(username='u', email='u@example.com', is_active=True)
        defaults.update(kwargs)
        username = defaults.pop('username')
        email = defaults.pop('email')
        return User.objects.create(username=username, email=email, **defaults)

    @patch(NOTIFY_PATH)
    def test_first_reminder_fires_after_20h(self, mock_notify):
        user = self._user(
            username='inactive', email='inactive@example.com',
            last_active_at=timezone.now() - timedelta(hours=21),
        )
        call_command('send_inactivity_reminders')
        mock_notify.assert_called_once()
        self.assertEqual(mock_notify.call_args.args[0], user)
        user.refresh_from_db()
        self.assertEqual(user.inactivity_reminder_count, 1)
        self.assertIsNotNone(user.inactivity_reminder_sent_at)

    @patch(NOTIFY_PATH)
    def test_does_not_remind_a_recently_active_user(self, mock_notify):
        self._user(
            username='active', email='active@example.com',
            last_active_at=timezone.now() - timedelta(hours=2),
        )
        call_command('send_inactivity_reminders')
        mock_notify.assert_not_called()

    @patch(NOTIFY_PATH)
    def test_second_reminder_waits_3_days_after_the_first(self, mock_notify):
        now = timezone.now()
        # Primer recordatorio ya se mandó hace poco — todavía no toca el segundo (3 días).
        self._user(
            username='too_soon', email='too_soon@example.com',
            last_active_at=now - timedelta(days=1),
            inactivity_reminder_sent_at=now - timedelta(hours=22),
            inactivity_reminder_count=1,
        )
        call_command('send_inactivity_reminders')
        mock_notify.assert_not_called()

    @patch(NOTIFY_PATH)
    def test_second_reminder_fires_3_days_after_the_first(self, mock_notify):
        now = timezone.now()
        user = self._user(
            username='due_second', email='due_second@example.com',
            last_active_at=now - timedelta(days=5),
            inactivity_reminder_sent_at=now - timedelta(days=3, minutes=1),
            inactivity_reminder_count=1,
        )
        call_command('send_inactivity_reminders')
        mock_notify.assert_called_once()
        self.assertEqual(mock_notify.call_args.args[0], user)
        user.refresh_from_db()
        self.assertEqual(user.inactivity_reminder_count, 2)

    @patch(NOTIFY_PATH)
    def test_third_reminder_onward_repeats_every_5_days(self, mock_notify):
        now = timezone.now()
        user = self._user(
            username='long_dormant', email='long_dormant@example.com',
            last_active_at=now - timedelta(days=20),
            inactivity_reminder_sent_at=now - timedelta(days=5, minutes=1),
            inactivity_reminder_count=4,  # ya pasó el escalonado inicial, va en el régimen de 5 días
        )
        call_command('send_inactivity_reminders')
        mock_notify.assert_called_once()
        self.assertEqual(mock_notify.call_args.args[0], user)
        user.refresh_from_db()
        self.assertEqual(user.inactivity_reminder_count, 5)

    @patch(NOTIFY_PATH)
    def test_does_not_repeat_before_the_5_day_mark(self, mock_notify):
        now = timezone.now()
        self._user(
            username='long_dormant_too_soon', email='long_dormant_too_soon@example.com',
            last_active_at=now - timedelta(days=20),
            inactivity_reminder_sent_at=now - timedelta(days=2),
            inactivity_reminder_count=4,
        )
        call_command('send_inactivity_reminders')
        mock_notify.assert_not_called()

    @patch(NOTIFY_PATH)
    def test_reopening_the_app_resets_the_streak_to_the_first_stage(self, mock_notify):
        now = timezone.now()
        # Venía de una racha larga (count=5, cada 5 días), pero volvió a abrir la
        # app después del último recordatorio — la nueva inactividad debe tratarse
        # como una racha nueva: recién a las 20h, no en régimen de "cada 5 días".
        user = self._user(
            username='came_back', email='came_back@example.com',
            last_active_at=now - timedelta(hours=21),
            inactivity_reminder_sent_at=now - timedelta(days=10),
            inactivity_reminder_count=5,
        )
        call_command('send_inactivity_reminders')
        mock_notify.assert_called_once()
        self.assertEqual(mock_notify.call_args.args[0], user)
        user.refresh_from_db()
        self.assertEqual(user.inactivity_reminder_count, 1)  # arrancó de cero, no en 6

    @patch(NOTIFY_PATH)
    def test_skips_inactive_accounts(self, mock_notify):
        self._user(
            username='deactivated', email='deactivated@example.com',
            is_active=False,
            last_active_at=timezone.now() - timedelta(hours=48),
        )
        call_command('send_inactivity_reminders')
        mock_notify.assert_not_called()

    @patch(NOTIFY_PATH)
    def test_skips_users_who_never_opened_the_app(self, mock_notify):
        self._user(username='never_active', email='never@example.com', last_active_at=None)
        call_command('send_inactivity_reminders')
        mock_notify.assert_not_called()
