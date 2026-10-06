import os

from django.db import transaction

from Study.models import Org, User


mode = os.environ['GG_MODE']
if mode not in {'inspect', 'grant'}:
    raise ValueError('Invalid test organization operation')

with transaction.atomic():
    user = User.objects.select_related('org').get(email='admin@apple2.com')
    if not user.is_staff or not user.org_id:
        raise ValueError('Expected test organization admin account not found')
    org = Org.objects.select_for_update().get(pk=user.org_id)
    if org.name != 'Apple Paid':
        raise ValueError('Admin is not in the expected test organization')

    print('test_org_id:', org.pk)
    print('premium_before:', org.is_premium)
    print('stripe_status_before:', org.stripe_subscription_status or '(empty)')
    print('has_stripe_billing_ids:', bool(org.stripe_subscription_id or org.stripe_customer_id))
    print('revenuecat_status_before:', org.revenuecat_subscription_status or '(empty)')

    if mode == 'grant':
        # This is a scoped test access flag. Preserve the existing Stripe and
        # RevenueCat records; this is not a purchase or billing status change.
        org.is_premium = True
        org.save(update_fields=['is_premium'])
        print('premium_after:', org.is_premium)
