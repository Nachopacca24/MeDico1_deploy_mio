from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.communication.models import Announcement
from apps.medico.models import FCMToken

User = get_user_model()

SEND_PUSH_PATH = 'apps.communication.views.send_push_notification'


class AdminAnnouncementPushTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', email='admin@example.com', password='x', is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    @patch(SEND_PUSH_PATH)
    def test_create_with_no_tokens_registered(self, mock_send):
        response = self.client.post('/api/admin/announcements/', {
            'title': 'Nueva versión', 'body': 'Actualizá la app para ver las novedades.',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['pushed_to'], 0)
        mock_send.assert_not_called()
        self.assertEqual(Announcement.objects.count(), 1)

    @patch(SEND_PUSH_PATH)
    def test_create_pushes_to_every_registered_token(self, mock_send):
        recipient = User.objects.create_user(username='doc', email='doc@example.com', password='x')
        FCMToken.objects.create(user=recipient, token='tok-1', platform='android')
        FCMToken.objects.create(user=recipient, token='tok-2', platform='ios')
        mock_send.return_value = {'success': ['tok-1', 'tok-2'], 'failed_tokens': []}

        response = self.client.post('/api/admin/announcements/', {
            'title': 'Nueva versión', 'body': 'Actualizá la app.',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['pushed_to'], 2)
        mock_send.assert_called_once()
        sent_tokens = set(mock_send.call_args.args[0])
        self.assertEqual(sent_tokens, {'tok-1', 'tok-2'})
        self.assertEqual(mock_send.call_args.kwargs['title'], 'Nueva versión')
        self.assertEqual(mock_send.call_args.kwargs['body'], 'Actualizá la app.')

    @patch(SEND_PUSH_PATH)
    def test_dead_tokens_get_cleaned_up(self, mock_send):
        recipient = User.objects.create_user(username='doc2', email='doc2@example.com', password='x')
        FCMToken.objects.create(user=recipient, token='good', platform='android')
        FCMToken.objects.create(user=recipient, token='dead', platform='android')
        mock_send.return_value = {'success': ['good'], 'failed_tokens': ['dead']}

        response = self.client.post('/api/admin/announcements/', {
            'title': 't', 'body': 'b',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['pushed_to'], 1)
        self.assertFalse(FCMToken.objects.filter(token='dead').exists())
        self.assertTrue(FCMToken.objects.filter(token='good').exists())

    def test_non_admin_cannot_create_announcements(self):
        regular = User.objects.create_user(username='regular', email='regular@example.com', password='x')
        client = APIClient()
        client.force_authenticate(regular)
        response = client.post('/api/admin/announcements/', {
            'title': 't', 'body': 'b',
        }, format='json')
        self.assertEqual(response.status_code, 403)
