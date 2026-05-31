from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APIClient

from .models import Org, User


class BillingCheckoutSessionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Org.objects.create(
            name='Test Chapter',
            reg_code='TEST123',
            school='Test University',
        )
        self.user = User.objects.create_user(
            email='admin@example.com',
            password='password123',
            first_name='Admin',
            last_name='User',
            org=self.org,
            is_staff=True,
        )
        self.client.force_authenticate(user=self.user)

    @override_settings(
        STRIPE_API_KEY='rk_test_123',
        STRIPE_ORG_PRICE_ID='price_123',
        STRIPE_BILLING_SUCCESS_URL='https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
        STRIPE_BILLING_CANCEL_URL='https://example.com/cancel',
    )
    @patch('Study.views.stripe.checkout.Session.create')
    def test_admin_can_create_subscription_checkout_session(self, mock_create):
        mock_create.return_value.id = 'cs_test_123'
        mock_create.return_value.url = 'https://checkout.stripe.com/c/pay/cs_test_123'

        response = self.client.post(reverse('billing-checkout-session'), {})

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['session_id'], 'cs_test_123')
        self.assertEqual(response.data['checkout_url'], 'https://checkout.stripe.com/c/pay/cs_test_123')
        session_args = mock_create.call_args.kwargs
        self.assertEqual(session_args['mode'], 'subscription')
        self.assertEqual(session_args['payment_method_collection'], 'always')
        self.assertEqual(session_args['line_items'], [{'price': 'price_123', 'quantity': 1}])
        self.assertEqual(session_args['subscription_data']['trial_period_days'], 30)
        self.assertEqual(session_args['client_reference_id'], str(self.org.id))
        self.assertEqual(session_args['metadata']['org_id'], str(self.org.id))
        self.assertNotIn('payment_method_types', session_args)

    @override_settings(STRIPE_API_KEY='rk_test_123')
    @patch('Study.views.stripe.checkout.Session.retrieve')
    def test_admin_can_sync_completed_checkout_session(self, mock_retrieve):
        trial_start = 1780189000
        trial_end = 1782781000
        mock_retrieve.return_value = {
            'id': 'cs_test_123',
            'client_reference_id': str(self.org.id),
            'customer': 'cus_123',
            'metadata': {'org_id': str(self.org.id)},
            'subscription': {
                'id': 'sub_123',
                'customer': 'cus_123',
                'status': 'trialing',
                'trial_start': trial_start,
                'trial_end': trial_end,
            },
        }

        response = self.client.post(reverse('billing-sync-checkout-session'), {
            'session_id': 'cs_test_123',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.org.refresh_from_db()
        self.assertTrue(self.org.is_premium)
        self.assertEqual(self.org.stripe_customer_id, 'cus_123')
        self.assertEqual(self.org.stripe_subscription_id, 'sub_123')
        self.assertEqual(self.org.stripe_subscription_status, 'trialing')
        mock_retrieve.assert_called_once_with('cs_test_123', expand=['subscription'])

    @override_settings(STRIPE_API_KEY='rk_test_123')
    @patch('Study.views.stripe.Subscription.retrieve')
    def test_admin_can_refresh_subscription_status_from_stored_subscription_id(self, mock_retrieve):
        self.org.stripe_customer_id = 'cus_123'
        self.org.stripe_subscription_id = 'sub_123'
        self.org.stripe_subscription_status = 'trialing'
        self.org.is_premium = True
        self.org.save(update_fields=[
            'stripe_customer_id',
            'stripe_subscription_id',
            'stripe_subscription_status',
            'is_premium',
        ])
        mock_retrieve.return_value = {
            'id': 'sub_123',
            'customer': 'cus_123',
            'status': 'canceled',
            'trial_start': None,
            'trial_end': None,
        }

        response = self.client.post(reverse('billing-sync-subscription'), {}, format='json')

        self.assertEqual(response.status_code, 200)
        self.org.refresh_from_db()
        self.assertFalse(self.org.is_premium)
        self.assertEqual(self.org.stripe_subscription_status, 'canceled')
        self.assertEqual(response.data['billing']['stripe_subscription_status'], 'canceled')
        mock_retrieve.assert_called_once_with('sub_123')

    @override_settings(STRIPE_API_KEY='rk_test_123')
    @patch('Study.views.stripe.Subscription.list')
    def test_admin_can_refresh_subscription_status_from_stored_customer_id(self, mock_list):
        self.org.stripe_customer_id = 'cus_123'
        self.org.save(update_fields=['stripe_customer_id'])
        mock_list.return_value = {
            'data': [
                {
                    'id': 'sub_123',
                    'customer': 'cus_123',
                    'status': 'trialing',
                    'trial_start': 1780189000,
                    'trial_end': 1782781000,
                }
            ]
        }

        response = self.client.post(reverse('billing-sync-subscription'), {}, format='json')

        self.assertEqual(response.status_code, 200)
        self.org.refresh_from_db()
        self.assertTrue(self.org.is_premium)
        self.assertEqual(self.org.stripe_subscription_id, 'sub_123')
        self.assertEqual(self.org.stripe_subscription_status, 'trialing')
        mock_list.assert_called_once_with(customer='cus_123', status='all', limit=1)

    def test_admin_subscription_sync_without_billing_ids_returns_current_state(self):
        response = self.client.post(reverse('billing-sync-subscription'), {}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['billing']['is_premium'])
        self.assertIsNone(response.data['billing']['stripe_customer_id'])


class StripeWebhookTests(TestCase):
    @override_settings(
        STRIPE_API_KEY='rk_test_123',
        STRIPE_WEBHOOK_SECRET='whsec_123',
    )
    @patch('Study.views.stripe.Webhook.construct_event')
    def test_checkout_completed_marks_org_premium(self, mock_construct_event):
        org = Org.objects.create(
            name='Paid Chapter',
            reg_code='PAID123',
            school='Test University',
        )
        mock_construct_event.return_value = {
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'client_reference_id': str(org.id),
                    'customer': 'cus_123',
                    'subscription': 'sub_123',
                    'metadata': {'org_id': str(org.id)},
                }
            },
        }

        response = APIClient().post(
            reverse('stripe-webhook'),
            data=b'{}',
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test-signature',
        )

        self.assertEqual(response.status_code, 200)
        org.refresh_from_db()
        self.assertTrue(org.is_premium)
        self.assertEqual(org.stripe_customer_id, 'cus_123')
        self.assertEqual(org.stripe_subscription_id, 'sub_123')
        self.assertEqual(org.stripe_subscription_status, 'trialing')

    @override_settings(
        STRIPE_API_KEY='rk_test_123',
        STRIPE_WEBHOOK_SECRET='whsec_123',
    )
    @patch('Study.views.stripe.Webhook.construct_event')
    def test_subscription_created_records_trial_window(self, mock_construct_event):
        org = Org.objects.create(
            name='Trial Chapter',
            reg_code='TRIAL123',
            school='Test University',
        )
        trial_start = 1780189000
        trial_end = 1782781000
        mock_construct_event.return_value = {
            'type': 'customer.subscription.created',
            'data': {
                'object': {
                    'id': 'sub_123',
                    'customer': 'cus_123',
                    'status': 'trialing',
                    'trial_start': trial_start,
                    'trial_end': trial_end,
                    'metadata': {'org_id': str(org.id)},
                }
            },
        }

        response = APIClient().post(
            reverse('stripe-webhook'),
            data=b'{}',
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test-signature',
        )

        self.assertEqual(response.status_code, 200)
        org.refresh_from_db()
        self.assertTrue(org.is_premium)
        self.assertEqual(org.stripe_subscription_status, 'trialing')
        self.assertEqual(org.trial_started_at, timezone.datetime.fromtimestamp(trial_start, tz=timezone.get_current_timezone()))
        self.assertEqual(org.trial_ends_at, timezone.datetime.fromtimestamp(trial_end, tz=timezone.get_current_timezone()))

    @override_settings(
        STRIPE_API_KEY='rk_test_123',
        STRIPE_WEBHOOK_SECRET='whsec_123',
    )
    @patch('Study.views.stripe.Webhook.construct_event')
    def test_subscription_deleted_removes_premium_access(self, mock_construct_event):
        org = Org.objects.create(
            name='Canceled Chapter',
            reg_code='CANCEL123',
            school='Test University',
            is_premium=True,
            stripe_customer_id='cus_123',
            stripe_subscription_id='sub_123',
            stripe_subscription_status='active',
        )
        mock_construct_event.return_value = {
            'type': 'customer.subscription.deleted',
            'data': {
                'object': {
                    'id': 'sub_123',
                    'customer': 'cus_123',
                    'status': 'canceled',
                }
            },
        }

        response = APIClient().post(
            reverse('stripe-webhook'),
            data=b'{}',
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test-signature',
        )

        self.assertEqual(response.status_code, 200)
        org.refresh_from_db()
        self.assertFalse(org.is_premium)
        self.assertEqual(org.stripe_subscription_status, 'canceled')
