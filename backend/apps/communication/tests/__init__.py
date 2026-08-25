import datetime as dt
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.communication.models import Announcement, QueuedPromoPush
from apps.communication.services import promo_push
from apps.medico.models import FCMToken

User = get_user_model()

SEND_PUSH_PATH = 'apps.medico.services.firebase.send_push_notification'


def _utc_for_local(hour, minute=0, day=15):
    """Guatemala no tiene DST (siempre UTC-6) — construye un datetime UTC que
    cae en esa hora local, para probar los turnos sin freezegun."""
    base = dt.datetime(2026, 1, day, 0, 0, tzinfo=dt.timezone.utc)
    return base + dt.timedelta(hours=hour + 6, minutes=minute)


class PromoPushServiceTest(TestCase):
    def setUp(self):
        self.recipient = User.objects.create_user(username='doc', email='doc@example.com', password='x')
        FCMToken.objects.create(user=self.recipient, token='tok-1', platform='android')

    @patch(SEND_PUSH_PATH)
    @patch('apps.communication.services.promo_push.timezone.now')
    def test_sends_in_first_slot_10am_to_5pm(self, mock_now, mock_send):
        mock_now.return_value = _utc_for_local(11)  # dentro del primer turno
        mock_send.return_value = {'success': ['tok-1'], 'failed_tokens': []}

        push = promo_push.enqueue(title='t', body='b')

        self.assertIsNotNone(push.sent_at)
        self.assertEqual(push.sent_to_count, 1)
        mock_send.assert_called_once()

    @patch(SEND_PUSH_PATH)
    @patch('apps.communication.services.promo_push.timezone.now')
    def test_queues_before_10am(self, mock_now, mock_send):
        mock_now.return_value = _utc_for_local(9, 30)
        push = promo_push.enqueue(title='t', body='b')
        self.assertIsNone(push.sent_at)
        mock_send.assert_not_called()

    @patch(SEND_PUSH_PATH)
    @patch('apps.communication.services.promo_push.timezone.now')
    def test_queues_at_9pm_and_after(self, mock_now, mock_send):
        mock_now.return_value = _utc_for_local(21, 0)
        push = promo_push.enqueue(title='t', body='b')
        self.assertIsNone(push.sent_at)
        mock_send.assert_not_called()

    @patch(SEND_PUSH_PATH)
    @patch('apps.communication.services.promo_push.timezone.now')
    def test_second_of_the_day_waits_for_the_5pm_slot(self, mock_now, mock_send):
        mock_now.return_value = _utc_for_local(11)
        QueuedPromoPush.objects.create(title='prev', body='b', sent_at=_utc_for_local(10, 5), sent_to_count=1)

        push = promo_push.enqueue(title='new', body='b')  # ya se mandó 1 hoy, todavía no son las 17:00

        self.assertIsNone(push.sent_at)
        mock_send.assert_not_called()

    @patch(SEND_PUSH_PATH)
    @patch('apps.communication.services.promo_push.timezone.now')
    def test_second_of_the_day_sends_once_5pm_slot_opens(self, mock_now, mock_send):
        mock_now.return_value = _utc_for_local(17, 5)
        QueuedPromoPush.objects.create(title='prev', body='b', sent_at=_utc_for_local(10, 5), sent_to_count=1)
        mock_send.return_value = {'success': ['tok-1'], 'failed_tokens': []}

        push = promo_push.enqueue(title='new', body='b')

        self.assertIsNotNone(push.sent_at)
        mock_send.assert_called_once()

    @patch(SEND_PUSH_PATH)
    @patch('apps.communication.services.promo_push.timezone.now')
    def test_respects_daily_cap_of_two(self, mock_now, mock_send):
        mock_now.return_value = _utc_for_local(18)
        QueuedPromoPush.objects.create(title='p1', body='b', sent_at=_utc_for_local(10), sent_to_count=1)
        QueuedPromoPush.objects.create(title='p2', body='b', sent_at=_utc_for_local(17), sent_to_count=1)

        push = promo_push.enqueue(title='p3', body='b')  # ya van 2 hoy, no importa la hora

        self.assertIsNone(push.sent_at)
        mock_send.assert_not_called()

    @patch(SEND_PUSH_PATH)
    @patch('apps.communication.services.promo_push.timezone.now')
    def test_oldest_queued_goes_out_first(self, mock_now, mock_send):
        mock_now.return_value = _utc_for_local(11)
        mock_send.return_value = {'success': ['tok-1'], 'failed_tokens': []}

        older = QueuedPromoPush.objects.create(title='older', body='b')
        newer = QueuedPromoPush.objects.create(title='newer', body='b')
        QueuedPromoPush.objects.filter(pk=older.pk).update(created_at=_utc_for_local(9))
        QueuedPromoPush.objects.filter(pk=newer.pk).update(created_at=_utc_for_local(9, 30))

        promo_push.try_send_next()

        older.refresh_from_db()
        newer.refresh_from_db()
        self.assertIsNotNone(older.sent_at)
        self.assertIsNone(newer.sent_at)

    @patch(SEND_PUSH_PATH)
    @patch('apps.communication.services.promo_push.timezone.now')
    def test_respects_specialty_targeting(self, mock_now, mock_send):
        mock_now.return_value = _utc_for_local(11)
        ortho = User.objects.create_user(username='ortho', email='ortho@example.com', password='x', specialty='Ortopedia')
        gyno = User.objects.create_user(username='gyno', email='gyno@example.com', password='x', specialty='Ginecología')
        FCMToken.objects.create(user=ortho, token='tok-ortho', platform='android')
        FCMToken.objects.create(user=gyno, token='tok-gyno', platform='android')
        mock_send.return_value = {'success': ['tok-ortho'], 'failed_tokens': []}

        promo_push.enqueue(title='t', body='b', target_specialties=['Ortopedia'])

        sent_tokens = set(mock_send.call_args.args[0])
        self.assertIn('tok-ortho', sent_tokens)
        self.assertNotIn('tok-gyno', sent_tokens)
        self.assertNotIn('tok-1', sent_tokens)  # el self.recipient del setUp, sin especialidad

    @patch(SEND_PUSH_PATH)
    @patch('apps.communication.services.promo_push.timezone.now')
    def test_advertisement_excludes_users_who_opted_out(self, mock_now, mock_send):
        mock_now.return_value = _utc_for_local(11)
        self.recipient.receives_advertising = False
        self.recipient.save(update_fields=['receives_advertising'])
        other = User.objects.create_user(username='other', email='other@example.com', password='x')
        FCMToken.objects.create(user=other, token='tok-other', platform='android')
        mock_send.return_value = {'success': ['tok-other'], 'failed_tokens': []}

        promo_push.enqueue(title='t', body='b', kind='advertisement')

        sent_tokens = set(mock_send.call_args.args[0])
        self.assertEqual(sent_tokens, {'tok-other'})

    @patch(SEND_PUSH_PATH)
    @patch('apps.communication.services.promo_push.timezone.now')
    def test_announcement_kind_reaches_users_who_opted_out_of_advertising(self, mock_now, mock_send):
        """kind='announcement' (Anuncios del sistema) ignora receives_advertising —
        siempre llega a todos, como un recordatorio de cirugía."""
        mock_now.return_value = _utc_for_local(11)
        self.recipient.receives_advertising = False
        self.recipient.save(update_fields=['receives_advertising'])
        mock_send.return_value = {'success': ['tok-1'], 'failed_tokens': []}

        promo_push.enqueue(title='t', body='b', kind='announcement')

        sent_tokens = set(mock_send.call_args.args[0])
        self.assertIn('tok-1', sent_tokens)


class AdminAnnouncementPushTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', email='admin@example.com', password='x', is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    @patch(SEND_PUSH_PATH)
    @patch('apps.communication.services.promo_push.timezone.now')
    def test_create_sends_immediately_within_first_slot(self, mock_now, mock_send):
        mock_now.return_value = _utc_for_local(11)
        recipient = User.objects.create_user(username='doc', email='doc@example.com', password='x')
        FCMToken.objects.create(user=recipient, token='tok-1', platform='android')
        mock_send.return_value = {'success': ['tok-1'], 'failed_tokens': []}

        response = self.client.post('/api/admin/announcements/', {
            'title': 'Nueva versión', 'body': 'Actualizá la app.',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['pushed_to'], 1)
        self.assertFalse(response.data['queued'])
        self.assertEqual(Announcement.objects.count(), 1)

    @patch(SEND_PUSH_PATH)
    @patch('apps.communication.services.promo_push.timezone.now')
    def test_create_outside_hours_gets_queued_not_lost(self, mock_now, mock_send):
        mock_now.return_value = _utc_for_local(23)  # 11pm, fuera de horario

        response = self.client.post('/api/admin/announcements/', {
            'title': 'Nueva versión', 'body': 'Actualizá la app.',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['pushed_to'], 0)
        self.assertTrue(response.data['queued'])
        mock_send.assert_not_called()
        self.assertEqual(QueuedPromoPush.objects.filter(sent_at__isnull=True).count(), 1)

    @patch(SEND_PUSH_PATH)
    @patch('apps.communication.services.promo_push.timezone.now')
    def test_create_reaches_users_who_opted_out_of_advertising(self, mock_now, mock_send):
        mock_now.return_value = _utc_for_local(11)
        recipient = User.objects.create_user(
            username='doc', email='doc@example.com', password='x', receives_advertising=False,
        )
        FCMToken.objects.create(user=recipient, token='tok-1', platform='android')
        mock_send.return_value = {'success': ['tok-1'], 'failed_tokens': []}

        response = self.client.post('/api/admin/announcements/', {
            'title': 'Nueva versión', 'body': 'Actualizá la app.',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['pushed_to'], 1)
        self.assertEqual(QueuedPromoPush.objects.get().kind, 'announcement')

    def test_non_admin_cannot_create_announcements(self):
        regular = User.objects.create_user(username='regular', email='regular@example.com', password='x')
        client = APIClient()
        client.force_authenticate(regular)
        response = client.post('/api/admin/announcements/', {
            'title': 't', 'body': 'b',
        }, format='json')
        self.assertEqual(response.status_code, 403)
