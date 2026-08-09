from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.medico.models import FCMToken
from .models import Advertisement, Client

User = get_user_model()


def _make_client():
    return Client.objects.create(
        company_name='Anunciante Test',
        email='anunciante@example.com',
        amount_paid=100,
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
    El signal post_save de Advertisement solo debe notificar a usuarios dentro
    del targeting por especialidad (target_specialties) del anuncio — igual
    que get_active_ads/get_feed en views.py. Antes notificaba a *todos* los
    FCMToken de la base sin importar la especialidad.
    """

    def setUp(self):
        self.client_obj = _make_client()
        self.cardio = _make_user_with_token('cardio_doc', specialty='Cardiología')
        self.ortho = _make_user_with_token('ortho_doc', specialty='Ortopedia')
        self.no_specialty = _make_user_with_token('no_specialty_doc', specialty=None)

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

    @patch('apps.medico.services.firebase.send_push_notification')
    def test_targeted_ad_notifies_only_matching_specialty(self, mock_send):
        ad = self._make_ad(status='draft', target_specialties=['Cardiología'])
        ad.status = 'active'
        ad.save()

        self.assertEqual(mock_send.call_count, 1)
        tokens = mock_send.call_args.args[0]
        self.assertEqual(tokens, ['token-cardio_doc'])

    @patch('apps.medico.services.firebase.send_push_notification')
    def test_untargeted_ad_notifies_everyone(self, mock_send):
        ad = self._make_ad(status='draft', target_specialties=[])
        ad.status = 'active'
        ad.save()

        tokens = set(mock_send.call_args.args[0])
        self.assertEqual(tokens, {'token-cardio_doc', 'token-ortho_doc', 'token-no_specialty_doc'})

    @patch('apps.medico.services.firebase.send_push_notification')
    def test_created_directly_as_active_respects_targeting(self, mock_send):
        self._make_ad(status='active', target_specialties=['Ortopedia'])

        self.assertEqual(mock_send.call_count, 1)
        tokens = mock_send.call_args.args[0]
        self.assertEqual(tokens, ['token-ortho_doc'])

    @patch('apps.medico.services.firebase.send_push_notification')
    def test_staying_active_does_not_renotify(self, mock_send):
        ad = self._make_ad(status='active', target_specialties=[])
        mock_send.reset_mock()

        ad.campaign_name = 'Campaña Test (editada)'
        ad.save()

        mock_send.assert_not_called()

    @patch('apps.medico.services.firebase.send_push_notification')
    def test_no_matching_specialty_sends_nothing(self, mock_send):
        self._make_ad(status='active', target_specialties=['Dermatología'])
        mock_send.assert_not_called()
