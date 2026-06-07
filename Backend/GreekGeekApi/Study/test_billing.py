from unittest.mock import patch
from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APIClient
import stripe

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
                'current_period_end': trial_end,
                'cancel_at_period_end': False,
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
        self.assertEqual(self.org.stripe_current_period_end, timezone.datetime.fromtimestamp(trial_end, tz=timezone.get_current_timezone()))
        self.assertFalse(self.org.stripe_cancel_at_period_end)
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
            'current_period_end': 1782781000,
            'cancel_at_period_end': True,
        }

        response = self.client.post(reverse('billing-sync-subscription'), {}, format='json')

        self.assertEqual(response.status_code, 200)
        self.org.refresh_from_db()
        self.assertFalse(self.org.is_premium)
        self.assertEqual(self.org.stripe_subscription_status, 'canceled')
        self.assertTrue(self.org.stripe_cancel_at_period_end)
        self.assertEqual(response.data['billing']['stripe_subscription_status'], 'canceled')
        self.assertTrue(response.data['billing']['stripe_cancel_at_period_end'])
        mock_retrieve.assert_called_once_with('sub_123')

    @override_settings(STRIPE_API_KEY='rk_test_123')
    @patch('Study.views.stripe.Subscription.retrieve')
    def test_subscription_sync_returns_stored_state_when_stripe_refresh_fails(self, mock_retrieve):
        self.org.stripe_customer_id = 'cus_123'
        self.org.stripe_subscription_id = 'sub_123'
        self.org.stripe_subscription_status = 'trialing'
        self.org.trial_ends_at = timezone.now() + timedelta(days=30)
        self.org.is_premium = True
        self.org.save(update_fields=[
            'stripe_customer_id',
            'stripe_subscription_id',
            'stripe_subscription_status',
            'trial_ends_at',
            'is_premium',
        ])
        mock_retrieve.side_effect = stripe.error.PermissionError('Permission denied')

        response = self.client.post(reverse('billing-sync-subscription'), {}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['billing']['is_premium'])
        self.assertEqual(response.data['billing']['stripe_subscription_status'], 'trialing')
        self.assertIn('sync_error', response.data['billing'])
        self.org.refresh_from_db()
        self.assertTrue(self.org.is_premium)
        self.assertEqual(self.org.stripe_subscription_status, 'trialing')
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
                    'current_period_end': 1782781000,
                    'cancel_at_period_end': False,
                }
            ]
        }

        response = self.client.post(reverse('billing-sync-subscription'), {}, format='json')

        self.assertEqual(response.status_code, 200)
        self.org.refresh_from_db()
        self.assertTrue(self.org.is_premium)
        self.assertEqual(self.org.stripe_subscription_id, 'sub_123')
        self.assertEqual(self.org.stripe_subscription_status, 'trialing')
        self.assertEqual(self.org.stripe_current_period_end, timezone.datetime.fromtimestamp(1782781000, tz=timezone.get_current_timezone()))
        mock_list.assert_called_once_with(customer='cus_123', status='all', limit=1)

    def test_admin_subscription_sync_without_billing_ids_returns_current_state(self):
        response = self.client.post(reverse('billing-sync-subscription'), {}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['billing']['is_premium'])
        self.assertIsNone(response.data['billing']['stripe_customer_id'])

    @override_settings(STRIPE_API_KEY='rk_test_123')
    @patch('Study.views.stripe.Subscription.modify')
    def test_admin_can_cancel_subscription_at_period_end(self, mock_modify):
        period_end = 1782781000
        self.org.stripe_customer_id = 'cus_123'
        self.org.stripe_subscription_id = 'sub_123'
        self.org.stripe_subscription_status = 'active'
        self.org.is_premium = True
        self.org.save(update_fields=[
            'stripe_customer_id',
            'stripe_subscription_id',
            'stripe_subscription_status',
            'is_premium',
        ])
        mock_modify.return_value = {
            'id': 'sub_123',
            'customer': 'cus_123',
            'status': 'active',
            'trial_start': None,
            'trial_end': None,
            'current_period_end': period_end,
            'cancel_at_period_end': True,
        }

        response = self.client.post(reverse('billing-cancel-subscription'), {}, format='json')

        self.assertEqual(response.status_code, 200)
        self.org.refresh_from_db()
        self.assertTrue(self.org.is_premium)
        self.assertEqual(self.org.stripe_subscription_status, 'active')
        self.assertTrue(self.org.stripe_cancel_at_period_end)
        self.assertEqual(self.org.stripe_current_period_end, timezone.datetime.fromtimestamp(period_end, tz=timezone.get_current_timezone()))
        self.assertTrue(response.data['billing']['stripe_cancel_at_period_end'])
        mock_modify.assert_called_once_with('sub_123', cancel_at_period_end=True)


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
        current_period_end = 1782781000
        mock_construct_event.return_value = {
            'type': 'customer.subscription.created',
            'data': {
                'object': {
                    'id': 'sub_123',
                    'customer': 'cus_123',
                    'status': 'trialing',
                    'trial_start': trial_start,
                    'trial_end': trial_end,
                    'current_period_end': current_period_end,
                    'cancel_at_period_end': False,
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
        self.assertEqual(org.stripe_current_period_end, timezone.datetime.fromtimestamp(current_period_end, tz=timezone.get_current_timezone()))
        self.assertFalse(org.stripe_cancel_at_period_end)

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


class RevenueCatWebhookTests(TestCase):
    def revenuecat_payload(self, org, event_type='INITIAL_PURCHASE', expires_at=None, **event_fields):
        expires_at = expires_at or timezone.now() + timedelta(days=365)
        return {
            'api_version': '1.0',
            'event': {
                'id': 'rc_event_123',
                'type': event_type,
                'app_user_id': str(org.revenuecat_app_user_id),
                'original_app_user_id': str(org.revenuecat_app_user_id),
                'aliases': [],
                'product_id': 'yearly',
                'entitlement_ids': ['GreekGeek Pro'],
                'store': 'APP_STORE',
                'transaction_id': 'tx_123',
                'original_transaction_id': 'otx_123',
                'expiration_at_ms': int(expires_at.timestamp() * 1000),
                **event_fields,
            },
        }

    @override_settings(REVENUECAT_WEBHOOK_AUTHORIZATION='Bearer rc_secret')
    def test_revenuecat_initial_purchase_marks_org_premium(self):
        org = Org.objects.create(
            name='App Store Chapter',
            reg_code='APP123',
            school='Test University',
        )

        response = APIClient().post(
            reverse('revenuecat-webhook'),
            data=self.revenuecat_payload(org),
            format='json',
            HTTP_AUTHORIZATION='Bearer rc_secret',
        )

        self.assertEqual(response.status_code, 200)
        org.refresh_from_db()
        self.assertTrue(org.is_premium)
        self.assertEqual(org.revenuecat_subscription_status, 'active')
        self.assertEqual(org.revenuecat_product_id, 'yearly')
        self.assertEqual(org.revenuecat_store, 'APP_STORE')
        self.assertEqual(org.revenuecat_original_transaction_id, 'otx_123')
        self.assertEqual(response.data['billing']['is_premium'], True)

    @override_settings(REVENUECAT_WEBHOOK_AUTHORIZATION='Bearer rc_secret')
    def test_revenuecat_expiration_removes_org_premium_without_stripe_access(self):
        org = Org.objects.create(
            name='Expired App Store Chapter',
            reg_code='EXP123',
            school='Test University',
            is_premium=True,
            revenuecat_subscription_status='active',
            revenuecat_product_id='yearly',
            revenuecat_entitlement_expires_at=timezone.now() + timedelta(days=1),
        )

        response = APIClient().post(
            reverse('revenuecat-webhook'),
            data=self.revenuecat_payload(org, event_type='EXPIRATION', expires_at=timezone.now() - timedelta(minutes=5)),
            format='json',
            HTTP_AUTHORIZATION='Bearer rc_secret',
        )

        self.assertEqual(response.status_code, 200)
        org.refresh_from_db()
        self.assertFalse(org.is_premium)
        self.assertEqual(org.revenuecat_subscription_status, 'expired')

    @override_settings(REVENUECAT_WEBHOOK_AUTHORIZATION='Bearer rc_secret')
    def test_revenuecat_expiration_keeps_org_premium_with_stripe_access(self):
        org = Org.objects.create(
            name='Stripe Chapter',
            reg_code='STRIPE123',
            school='Test University',
            is_premium=True,
            stripe_subscription_status='active',
            revenuecat_subscription_status='active',
            revenuecat_product_id='yearly',
            revenuecat_entitlement_expires_at=timezone.now() + timedelta(days=1),
        )

        response = APIClient().post(
            reverse('revenuecat-webhook'),
            data=self.revenuecat_payload(org, event_type='EXPIRATION', expires_at=timezone.now() - timedelta(minutes=5)),
            format='json',
            HTTP_AUTHORIZATION='Bearer rc_secret',
        )

        self.assertEqual(response.status_code, 200)
        org.refresh_from_db()
        self.assertTrue(org.is_premium)
        self.assertEqual(org.revenuecat_subscription_status, 'expired')

    @override_settings(REVENUECAT_WEBHOOK_AUTHORIZATION='Bearer rc_secret')
    def test_revenuecat_cancellation_keeps_org_premium_until_expiration(self):
        org = Org.objects.create(
            name='Cancelled App Store Chapter',
            reg_code='CANCEL123',
            school='Test University',
            is_premium=True,
            revenuecat_subscription_status='active',
            revenuecat_product_id='yearly',
            revenuecat_entitlement_expires_at=timezone.now() + timedelta(days=20),
        )

        response = APIClient().post(
            reverse('revenuecat-webhook'),
            data=self.revenuecat_payload(org, event_type='CANCELLATION', cancel_reason='UNSUBSCRIBE'),
            format='json',
            HTTP_AUTHORIZATION='Bearer rc_secret',
        )

        self.assertEqual(response.status_code, 200)
        org.refresh_from_db()
        self.assertTrue(org.is_premium)
        self.assertEqual(org.revenuecat_subscription_status, 'canceled')

    @override_settings(REVENUECAT_WEBHOOK_AUTHORIZATION='Bearer rc_secret')
    def test_revenuecat_billing_issue_keeps_org_premium_through_grace_period(self):
        org = Org.objects.create(
            name='Billing Issue Chapter',
            reg_code='BILL123',
            school='Test University',
            is_premium=True,
            revenuecat_subscription_status='active',
            revenuecat_product_id='yearly',
            revenuecat_entitlement_expires_at=timezone.now() + timedelta(days=1),
        )

        response = APIClient().post(
            reverse('revenuecat-webhook'),
            data=self.revenuecat_payload(
                org,
                event_type='BILLING_ISSUE',
                grace_period_expiration_at_ms=int((timezone.now() + timedelta(days=3)).timestamp() * 1000),
            ),
            format='json',
            HTTP_AUTHORIZATION='Bearer rc_secret',
        )

        self.assertEqual(response.status_code, 200)
        org.refresh_from_db()
        self.assertTrue(org.is_premium)
        self.assertEqual(org.revenuecat_subscription_status, 'billing_issue')
        self.assertGreater(org.revenuecat_entitlement_expires_at, timezone.now() + timedelta(days=2))

    @override_settings(REVENUECAT_WEBHOOK_AUTHORIZATION='Bearer rc_secret')
    def test_revenuecat_customer_support_cancellation_revokes_revenuecat_access(self):
        org = Org.objects.create(
            name='Refunded App Store Chapter',
            reg_code='REFUND123',
            school='Test University',
            is_premium=True,
            revenuecat_subscription_status='active',
            revenuecat_product_id='yearly',
            revenuecat_entitlement_expires_at=timezone.now() + timedelta(days=20),
        )

        response = APIClient().post(
            reverse('revenuecat-webhook'),
            data=self.revenuecat_payload(org, event_type='CANCELLATION', cancel_reason='CUSTOMER_SUPPORT'),
            format='json',
            HTTP_AUTHORIZATION='Bearer rc_secret',
        )

        self.assertEqual(response.status_code, 200)
        org.refresh_from_db()
        self.assertFalse(org.is_premium)
        self.assertEqual(org.revenuecat_subscription_status, 'refunded')

    @override_settings(REVENUECAT_WEBHOOK_AUTHORIZATION='Bearer rc_secret')
    def test_revenuecat_transfer_removes_access_from_source_org(self):
        source_org = Org.objects.create(
            name='Source Chapter',
            reg_code='SRC123',
            school='Test University',
            is_premium=True,
            revenuecat_subscription_status='active',
            revenuecat_product_id='yearly',
            revenuecat_entitlement_expires_at=timezone.now() + timedelta(days=20),
        )
        destination_org = Org.objects.create(
            name='Destination Chapter',
            reg_code='DST123',
            school='Test University',
        )

        response = APIClient().post(
            reverse('revenuecat-webhook'),
            data={
                'api_version': '1.0',
                'event': {
                    'id': 'rc_transfer_123',
                    'type': 'TRANSFER',
                    'transferred_from': [str(source_org.revenuecat_app_user_id)],
                    'transferred_to': [str(destination_org.revenuecat_app_user_id)],
                },
            },
            format='json',
            HTTP_AUTHORIZATION='Bearer rc_secret',
        )

        self.assertEqual(response.status_code, 200)
        source_org.refresh_from_db()
        destination_org.refresh_from_db()
        self.assertFalse(source_org.is_premium)
        self.assertEqual(source_org.revenuecat_subscription_status, 'transferred')
        self.assertTrue(destination_org.is_premium)
        self.assertEqual(destination_org.revenuecat_subscription_status, 'active')

    @override_settings(REVENUECAT_WEBHOOK_AUTHORIZATION='Bearer rc_secret')
    def test_revenuecat_ignored_event_does_not_change_org_premium(self):
        org = Org.objects.create(
            name='Ignored Event Chapter',
            reg_code='IGNORE123',
            school='Test University',
        )

        response = APIClient().post(
            reverse('revenuecat-webhook'),
            data=self.revenuecat_payload(org, event_type='INVOICE_ISSUANCE'),
            format='json',
            HTTP_AUTHORIZATION='Bearer rc_secret',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['ignored'], True)
        org.refresh_from_db()
        self.assertFalse(org.is_premium)

    @override_settings(REVENUECAT_WEBHOOK_AUTHORIZATION='Bearer rc_secret')
    def test_revenuecat_webhook_rejects_invalid_authorization(self):
        org = Org.objects.create(
            name='Protected Chapter',
            reg_code='AUTH123',
            school='Test University',
        )

        response = APIClient().post(
            reverse('revenuecat-webhook'),
            data=self.revenuecat_payload(org),
            format='json',
            HTTP_AUTHORIZATION='Bearer wrong',
        )

        self.assertEqual(response.status_code, 401)
        org.refresh_from_db()
        self.assertFalse(org.is_premium)
