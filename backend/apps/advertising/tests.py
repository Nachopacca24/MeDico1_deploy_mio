import datetime as dt
from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.medico.models import FCMToken
from .models import Advertisement, Client

User = get_user_model()

SEND_PUSH_PATH = 'apps.medico.services.firebase.send_push_notification'
NOW_PATH = 'apps.communication.services.promo_push.timezone.now'


def _utc_for_local(hour, minute=0, day=15):
    """Guatemala no tiene DST (siempre UTC-6) — cae dentro del primer turno
    de push promocionales (10am-5pm) para que el signal se mande de una."""
    base = dt.datetime(2026, 1, day, 0, 0, tzinfo=dt.timezone.utc)
    return base + dt.timedelta(hours=hour + 6, minutes=minute)


def _make_client(plan='gold'):
    return Client.objects.create(
        company_name='Anunciante Test',
        email='anunciante@example.com',
        amount_paid=100,
        plan=plan,
        start_date=date.today() - timedelta(days=1),
        end_date=date.today() + timedelta(days=30),
        status='active',
    )


def _make_user_with_token(username, specialty=None):
    user = User.objects.create(username=username, email=f'{username}@example.com', specialty=specialty)
    FCMToken.objects.create(user=user, token=f'token-{username}', platform='android')
    return user


class NotifyOnAdvertisementActivatedTest(TestCase):
    """
    El signal post_save de Advertisement encola un push promocional (ver
    apps/communication/services/promo_push.py) solo para anuncios de clientes
    plan oro, respetando targeting por especialidad (target_specialties) —
    igual que get_active_ads/get_feed en views.py. Plata/bronce no generan
    push (siguen visibles en la app igual que siempre, solo sin notificación).
    """

    def setUp(self):
        self.client_obj = _make_client()
        self.cardio = _make_user_with_token('cardio_doc', specialty='Cardiología')
        self.ortho = _make_user_with_token('ortho_doc', specialty='Ortopedia')
        self.no_specialty = _make_user_with_token('no_specialty_doc', specialty=None)
        self.now_patcher = patch(NOW_PATH)
        mock_now = self.now_patcher.start()
        mock_now.return_value = _utc_for_local(11)  # dentro del primer turno (10am-5pm)
        self.addCleanup(self.now_patcher.stop)

    def _make_ad(self, **kwargs):
        defaults = dict(
            client=self.client_obj,
            campaign_name='Campaña Test',
            image='test/image',
            redirect_url='https://example.com',
            placement='sidebar',
            start_date=date.today() - timedelta(days=1),
            end_date=date.today() + timedelta(days=30),
            status='draft',
        )
        defaults.update(kwargs)
        return Advertisement.objects.create(**defaults)

    @patch(SEND_PUSH_PATH)
    def test_targeted_ad_notifies_only_matching_specialty(self, mock_send):
        mock_send.return_value = {'success': ['token-cardio_doc'], 'failed_tokens': []}
        ad = self._make_ad(status='draft', target_specialties=['Cardiología'])
        ad.status = 'active'
        ad.save()

        self.assertEqual(mock_send.call_count, 1)
        tokens = mock_send.call_args.args[0]
        self.assertEqual(tokens, ['token-cardio_doc'])

    @patch(SEND_PUSH_PATH)
    def test_untargeted_ad_notifies_everyone(self, mock_send):
        mock_send.return_value = {'success': [], 'failed_tokens': []}
        ad = self._make_ad(status='draft', target_specialties=[])
        ad.status = 'active'
        ad.save()

        tokens = set(mock_send.call_args.args[0])
        self.assertEqual(tokens, {'token-cardio_doc', 'token-ortho_doc', 'token-no_specialty_doc'})

    @patch(SEND_PUSH_PATH)
    def test_created_directly_as_active_respects_targeting(self, mock_send):
        mock_send.return_value = {'success': ['token-ortho_doc'], 'failed_tokens': []}
        self._make_ad(status='active', target_specialties=['Ortopedia'])

        self.assertEqual(mock_send.call_count, 1)
        tokens = mock_send.call_args.args[0]
        self.assertEqual(tokens, ['token-ortho_doc'])

    @patch(SEND_PUSH_PATH)
    def test_staying_active_does_not_renotify(self, mock_send):
        mock_send.return_value = {'success': [], 'failed_tokens': []}
        ad = self._make_ad(status='active', target_specialties=[])
        mock_send.reset_mock()

        ad.campaign_name = 'Campaña Test (editada)'
        ad.save()

        mock_send.assert_not_called()

    @patch(SEND_PUSH_PATH)
    def test_no_matching_specialty_sends_nothing(self, mock_send):
        self._make_ad(status='active', target_specialties=['Dermatología'])
        mock_send.assert_not_called()

    @patch(SEND_PUSH_PATH)
    def test_silver_plan_client_does_not_trigger_push(self, mock_send):
        silver_client = _make_client(plan='silver')
        self._make_ad(client=silver_client, status='active', target_specialties=[])
        mock_send.assert_not_called()

    @patch(SEND_PUSH_PATH)
    def test_bronze_plan_client_does_not_trigger_push(self, mock_send):
        bronze_client = _make_client(plan='bronze')
        self._make_ad(client=bronze_client, status='active', target_specialties=[])
        mock_send.assert_not_called()
