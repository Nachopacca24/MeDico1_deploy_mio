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
    def test_reminds_a_user_inactive_over_20h(self, mock_notify):
        user = self._user(
            username='inactive', email='inactive@example.com',
            last_active_at=timezone.now() - timedelta(hours=21),
        )
        call_command('send_inactivity_reminders')
        mock_notify.assert_called_once()
        self.assertEqual(mock_notify.call_args.args[0], user)
        user.refresh_from_db()
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
    def test_does_not_remind_twice_for_the_same_inactivity_streak(self, mock_notify):
        now = timezone.now()
        last_active = now - timedelta(hours=25)
        self._user(
            username='already_reminded', email='already@example.com',
            last_active_at=last_active,
            inactivity_reminder_sent_at=last_active + timedelta(minutes=1),
        )
        call_command('send_inactivity_reminders')
        mock_notify.assert_not_called()

    @patch(NOTIFY_PATH)
    def test_reminds_again_after_a_fresh_inactivity_streak(self, mock_notify):
        now = timezone.now()
        user = self._user(
            username='second_streak', email='second@example.com',
            last_active_at=now - timedelta(hours=22),
            inactivity_reminder_sent_at=now - timedelta(hours=30),  # from a previous, older streak
        )
        call_command('send_inactivity_reminders')
        mock_notify.assert_called_once()
        self.assertEqual(mock_notify.call_args.args[0], user)

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
