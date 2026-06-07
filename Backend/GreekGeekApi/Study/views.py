from rest_framework import permissions, viewsets, status, exceptions

from .serializers import UserSerializer, UpdateUserSerializer, OrgSerializer, OrgSettingsSerializer, UpdateOrgSerializer, LocationSerializer, UpdateLocationSerializer, UserDashboardSerializer, StaffStatusSerializer, PeriodSettingSerializer, PeriodInstanceSerializer, SessionSerializer, NotificationTokenSerializer, GroupSerializer, CreateGroupSerializer, UpdateGroupSerializer, OrgOwnerSignupSerializer, VerifiedEmailTokenObtainPairSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view, action

from rest_framework.views import APIView
from rest_framework.generics import CreateAPIView, ListCreateAPIView, ListAPIView, DestroyAPIView, UpdateAPIView, RetrieveUpdateDestroyAPIView, RetrieveAPIView

from rest_framework.authtoken.models import Token

from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission, IsAdminUser

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import User, Org, OrgSettings, Session, Location, PeriodSetting, PeriodInstance, NotificationToken, Group, EmailVerificationToken

from django.http import Http404 
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from datetime import datetime, timedelta, timezone as datetime_timezone
import json
import requests
import uuid
import secrets
import stripe
from math import radians, sin, cos, sqrt, atan2
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from .utils import get_or_create_period_instance, send_notification_to_users, send_notification_to_org, backfill_sessions_for_instance, period_end_of_day


def create_email_verification_token(user):
    EmailVerificationToken.objects.filter(user=user, is_used=False).update(is_used=True)
    token = secrets.token_urlsafe(32)
    return EmailVerificationToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + timedelta(hours=24),
    )


def send_admin_verification_email(user):
    verification = create_email_verification_token(user)
    from .email_service import EmailService
    user_name = f"{user.first_name} {user.last_name}".strip() or None
    email_sent = EmailService().send_email_verification_email(
        user_email=user.email,
        verification_token=verification.token,
        user_name=user_name,
    )
    return verification, email_sent


def configure_stripe():
    if not settings.STRIPE_API_KEY:
        raise exceptions.APIException(detail="Stripe is not configured")
    stripe.api_key = settings.STRIPE_API_KEY
    stripe.api_version = "2026-05-27.dahlia"


def stripe_timestamp_to_datetime(value):
    if not value:
        return None
    return datetime.fromtimestamp(value, tz=datetime_timezone.utc)


def stripe_get(obj, key, default=None):
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def stripe_subscription_current_period_end(subscription):
    current_period_end = stripe_get(subscription, 'current_period_end')
    if current_period_end:
        return current_period_end

    item_data = stripe_get(stripe_get(subscription, 'items', {}), 'data', [])
    if item_data:
        return stripe_get(item_data[0], 'current_period_end')

    return None


def stripe_id(value):
    if not value:
        return None
    if isinstance(value, str):
        return value
    return stripe_get(value, 'id')


def stripe_invoice_subscription_id(invoice):
    subscription_id = stripe_id(stripe_get(invoice, 'subscription'))
    if subscription_id:
        return subscription_id

    parent = stripe_get(invoice, 'parent', {})
    subscription_details = stripe_get(parent, 'subscription_details', {})
    subscription_id = stripe_id(stripe_get(subscription_details, 'subscription'))
    if subscription_id:
        return subscription_id

    line_data = stripe_get(stripe_get(invoice, 'lines', {}), 'data', [])
    for line in line_data:
        line_parent = stripe_get(line, 'parent', {})
        for detail_key in ('subscription_item_details', 'invoice_item_details'):
            detail = stripe_get(line_parent, detail_key, {})
            subscription_id = stripe_id(stripe_get(detail, 'subscription'))
            if subscription_id:
                return subscription_id

    return None


def stripe_invoice_metadata(invoice):
    metadata = stripe_get(invoice, 'metadata', {})
    if stripe_get(metadata, 'org_id'):
        return metadata

    parent = stripe_get(invoice, 'parent', {})
    subscription_details = stripe_get(parent, 'subscription_details', {})
    return stripe_get(subscription_details, 'metadata', {}) or {}


def revenuecat_millis_to_datetime(value):
    if not value:
        return None
    return datetime.fromtimestamp(value / 1000, tz=datetime_timezone.utc)


REVENUECAT_SUPPORTED_EVENT_TYPES = {
    'INITIAL_PURCHASE',
    'RENEWAL',
    'PRODUCT_CHANGE',
    'CANCELLATION',
    'BILLING_ISSUE',
    'UNCANCELLATION',
    'TRANSFER',
    'SUBSCRIPTION_PAUSED',
    'EXPIRATION',
    'SUBSCRIPTION_EXTENDED',
    'TEMPORARY_ENTITLEMENT_GRANT',
    'REFUND_REVERSED',
}

REVENUECAT_ACCESS_STATUSES = {
    'active',
    'canceled',
    'billing_issue',
    'paused',
}


def org_has_stripe_access(org):
    return org.stripe_subscription_status in {'active', 'trialing'}


def org_has_revenuecat_access(org):
    if org.revenuecat_subscription_status not in REVENUECAT_ACCESS_STATUSES:
        return False
    if org.revenuecat_entitlement_expires_at is None:
        return org.revenuecat_subscription_status == 'active'
    return org.revenuecat_entitlement_expires_at > timezone.now()


def update_org_premium_state(org, update_fields):
    has_paid_access = org_has_stripe_access(org) or org_has_revenuecat_access(org)
    if org.is_premium != has_paid_access:
        org.is_premium = has_paid_access
        update_fields.append('is_premium')


def sync_org_subscription(
    org,
    subscription_id=None,
    customer_id=None,
    status_value=None,
    trial_started_at=None,
    trial_ends_at=None,
    current_period_end=None,
    cancel_at_period_end=None,
):
    update_fields = []

    if subscription_id and org.stripe_subscription_id != subscription_id:
        org.stripe_subscription_id = subscription_id
        update_fields.append('stripe_subscription_id')

    if customer_id and org.stripe_customer_id != customer_id:
        org.stripe_customer_id = customer_id
        update_fields.append('stripe_customer_id')

    if status_value is not None and org.stripe_subscription_status != status_value:
        org.stripe_subscription_status = status_value
        update_fields.append('stripe_subscription_status')

    if trial_started_at and org.trial_started_at != trial_started_at:
        org.trial_started_at = trial_started_at
        update_fields.append('trial_started_at')

    if trial_ends_at and org.trial_ends_at != trial_ends_at:
        org.trial_ends_at = trial_ends_at
        update_fields.append('trial_ends_at')

    if current_period_end is not None and org.stripe_current_period_end != current_period_end:
        org.stripe_current_period_end = current_period_end
        update_fields.append('stripe_current_period_end')

    if cancel_at_period_end is not None and org.stripe_cancel_at_period_end != cancel_at_period_end:
        org.stripe_cancel_at_period_end = cancel_at_period_end
        update_fields.append('stripe_cancel_at_period_end')

    update_org_premium_state(org, update_fields)

    if update_fields:
        org.save(update_fields=update_fields)


def sync_org_from_stripe_subscription(org, subscription, customer_id=None):
    sync_org_subscription(
        org,
        subscription_id=stripe_get(subscription, 'id'),
        customer_id=customer_id or stripe_get(subscription, 'customer'),
        status_value=stripe_get(subscription, 'status', ''),
        trial_started_at=stripe_timestamp_to_datetime(stripe_get(subscription, 'trial_start')),
        trial_ends_at=stripe_timestamp_to_datetime(stripe_get(subscription, 'trial_end')),
        current_period_end=stripe_timestamp_to_datetime(stripe_subscription_current_period_end(subscription)),
        cancel_at_period_end=bool(stripe_get(subscription, 'cancel_at_period_end', False)),
    )


def org_for_stripe_billing_event(subscription_id=None, customer_id=None, metadata=None):
    org = None
    if subscription_id:
        org = Org.objects.filter(stripe_subscription_id=subscription_id).first()
    if org is None and customer_id:
        org = Org.objects.filter(stripe_customer_id=customer_id).first()
    if org is None:
        org_id = stripe_get(metadata, 'org_id')
        if org_id:
            org = Org.objects.filter(id=org_id).first()
    return org


def sync_org_from_stripe_invoice(invoice):
    subscription_id = stripe_invoice_subscription_id(invoice)
    customer_id = stripe_get(invoice, 'customer')
    org = org_for_stripe_billing_event(
        subscription_id=subscription_id,
        customer_id=customer_id,
        metadata=stripe_invoice_metadata(invoice),
    )
    if not org or not subscription_id:
        return

    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
    except stripe.error.StripeError:
        return

    sync_org_from_stripe_subscription(
        org,
        subscription,
        customer_id=customer_id,
    )


def revenuecat_uuid_values(values):
    identifiers = []
    for value in values:
        if not value:
            continue
        try:
            identifiers.append(uuid.UUID(str(value)))
        except (TypeError, ValueError):
            continue
    return identifiers


def revenuecat_event_identifiers(event):
    return revenuecat_uuid_values([
        event.get('app_user_id'),
        event.get('original_app_user_id'),
        *(event.get('aliases') or []),
    ])


def revenuecat_event_matches_org_subscription(event):
    entitlement_ids = event.get('entitlement_ids') or []
    if settings.REVENUECAT_ENTITLEMENT_ID in entitlement_ids or event.get('entitlement_id') == settings.REVENUECAT_ENTITLEMENT_ID:
        return True

    product_ids = [
        event.get('product_id'),
        event.get('new_product_id'),
    ]
    return any(
        product_id == settings.REVENUECAT_PRODUCT_ID
        or str(product_id).startswith(f'{settings.REVENUECAT_PRODUCT_ID}:')
        for product_id in product_ids
        if product_id
    )


def revenuecat_event_expiration(event):
    timestamp = event.get('grace_period_expiration_at_ms') or event.get('expiration_at_ms')
    return revenuecat_millis_to_datetime(timestamp), timestamp is not None


def revenuecat_event_status(event):
    event_type = event.get('type')
    cancel_reason = event.get('cancel_reason')

    if event_type == 'EXPIRATION':
        return 'expired'
    if event_type == 'CANCELLATION':
        if cancel_reason == 'CUSTOMER_SUPPORT':
            return 'refunded'
        if cancel_reason == 'BILLING_ERROR':
            return 'billing_issue'
        return 'canceled'
    if event_type == 'BILLING_ISSUE':
        return 'billing_issue'
    if event_type == 'SUBSCRIPTION_PAUSED':
        return 'paused'

    return 'active'


def sync_org_from_revenuecat_event(org, event):
    update_fields = []
    status_value = revenuecat_event_status(event)
    expires_at, has_expires_at = revenuecat_event_expiration(event)

    if status_value == 'refunded':
        expires_at = timezone.now()
        has_expires_at = True

    if org.revenuecat_subscription_status != status_value:
        org.revenuecat_subscription_status = status_value
        update_fields.append('revenuecat_subscription_status')

    product_id = event.get('new_product_id') or event.get('product_id')
    if product_id and org.revenuecat_product_id != product_id:
        org.revenuecat_product_id = product_id
        update_fields.append('revenuecat_product_id')

    store = event.get('store')
    if store and org.revenuecat_store != store:
        org.revenuecat_store = store
        update_fields.append('revenuecat_store')

    transaction_id = event.get('original_transaction_id') or event.get('transaction_id')
    if transaction_id and org.revenuecat_original_transaction_id != transaction_id:
        org.revenuecat_original_transaction_id = transaction_id
        update_fields.append('revenuecat_original_transaction_id')

    if has_expires_at and org.revenuecat_entitlement_expires_at != expires_at:
        org.revenuecat_entitlement_expires_at = expires_at
        update_fields.append('revenuecat_entitlement_expires_at')

    update_org_premium_state(org, update_fields)

    if update_fields:
        org.save(update_fields=update_fields)


def sync_revenuecat_transfer_event(event):
    transferred_from = revenuecat_uuid_values(event.get('transferred_from') or [])
    transferred_to = revenuecat_uuid_values(event.get('transferred_to') or [])

    if not transferred_from and not transferred_to:
        return {'updated_org_ids': []}

    updated_org_ids = []
    now = timezone.now()

    for org in Org.objects.filter(revenuecat_app_user_id__in=transferred_from):
        update_fields = []
        if org.revenuecat_subscription_status != 'transferred':
            org.revenuecat_subscription_status = 'transferred'
            update_fields.append('revenuecat_subscription_status')
        if org.revenuecat_entitlement_expires_at != now:
            org.revenuecat_entitlement_expires_at = now
            update_fields.append('revenuecat_entitlement_expires_at')
        update_org_premium_state(org, update_fields)
        if update_fields:
            org.save(update_fields=update_fields)
            updated_org_ids.append(org.id)

    for org in Org.objects.filter(revenuecat_app_user_id__in=transferred_to):
        update_fields = []
        if org.revenuecat_subscription_status != 'active':
            org.revenuecat_subscription_status = 'active'
            update_fields.append('revenuecat_subscription_status')
        update_org_premium_state(org, update_fields)
        if update_fields:
            org.save(update_fields=update_fields)
            updated_org_ids.append(org.id)

    return {'updated_org_ids': updated_org_ids}


def billing_response(org, sync_error=None):
    response = {
        'organization': OrgSerializer(org).data,
        'billing': {
            'is_premium': org.is_premium,
            'stripe_customer_id': org.stripe_customer_id,
            'stripe_subscription_id': org.stripe_subscription_id,
            'stripe_subscription_status': org.stripe_subscription_status,
            'stripe_current_period_end': org.stripe_current_period_end,
            'stripe_cancel_at_period_end': org.stripe_cancel_at_period_end,
            'trial_started_at': org.trial_started_at,
            'trial_ends_at': org.trial_ends_at,
            'revenuecat_subscription_status': org.revenuecat_subscription_status,
            'revenuecat_product_id': org.revenuecat_product_id,
            'revenuecat_store': org.revenuecat_store,
            'revenuecat_entitlement_expires_at': org.revenuecat_entitlement_expires_at,
        },
    }
    if sync_error:
        response['billing']['sync_error'] = sync_error
    return response


class PublicEndpointMixin:
    authentication_classes = ()
    permission_classes = (AllowAny,)


class VerifiedEmailTokenObtainPairView(PublicEndpointMixin, TokenObtainPairView):
    serializer_class = VerifiedEmailTokenObtainPairSerializer


class PublicTokenRefreshView(PublicEndpointMixin, TokenRefreshView):
    pass

def distance_meters(lat1, lon1, lat2, lon2):
    earth_radius_meters = 6371000
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = (
        sin(d_lat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    )
    return earth_radius_meters * 2 * atan2(sqrt(a), sqrt(1 - a))

def s3_client():
    if not settings.AWS_STORAGE_BUCKET_NAME or not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        raise exceptions.APIException(detail="S3 storage is not configured")
    return boto3.client(
        's3',
        region_name=settings.AWS_S3_REGION_NAME,
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=Config(signature_version=settings.AWS_S3_SIGNATURE_VERSION),
    )

@api_view(['GET'])
def debug(request):
    return Response(dict(request.headers))

class OrgReportView(APIView):
    """
    View for admin users to retrieve comprehensive organization report data.
    Provides data for the organization as a whole and individual users' study progress.
    """
    permission_classes = (IsAdminUser,)
    
    def get(self, request, format=None):
        admin_user = request.user
        org = admin_user.org
        
        if not org:
            return Response(
                {"detail": "Admin user must belong to an organization"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 1. Get all users in the admin's organization
        users = User.objects.filter(org=org)
        user_data = []
        
        # 2. Get the current period setting and instances
        try:
            active_period_setting = PeriodSetting.objects.get(org=org, is_active=True)
            period_setting_data = PeriodSettingSerializer(active_period_setting).data
        except PeriodSetting.DoesNotExist:
            active_period_setting = None
            period_setting_data = None
        
        # 3. Get all period instances for the organization
        period_instances = []
        if active_period_setting:
            # Ensure current period instance exists
            current_time = timezone.now()
            get_or_create_period_instance(admin_user, current_time)
            
            # Get all period instances
            period_instances = PeriodInstance.objects.filter(
                period_setting__org=org
            ).order_by('-start_date')
            period_instances_data = PeriodInstanceSerializer(period_instances, many=True).data
        else:
            period_instances_data = []
        
        # 4. Get data for each user, including their sessions
        for user in users:
            user_info = UserSerializer(user).data
            
            # Add group information
            if user.group:
                user_info['group'] = {
                    'id': user.group.id,
                    'name': user.group.name
                }
            else:
                user_info['group'] = None
            
            # Get all sessions for this user
            sessions = Session.objects.filter(user=user).select_related(
                'location', 'period_instance'
            ).order_by('-start_time')
            sessions_data = SessionSerializer(sessions, many=True).data
            
            # Calculate total hours for current period (if exists)
            current_period_hours = 0
            if period_instances and period_instances.filter(is_active=True).exists():
                active_period = period_instances.get(is_active=True)
                current_period_sessions = sessions.filter(period_instance=active_period)
                for session in current_period_sessions:
                    if session.hours is not None:
                        current_period_hours += session.hours
            
            # Add user sessions and calculated data
            user_info['sessions'] = sessions_data
            user_info['current_period_hours'] = current_period_hours
            
            user_data.append(user_info)
        
        # 5. Get all locations for this organization
        locations = Location.objects.filter(org=org)
        locations_data = LocationSerializer(locations, many=True).data
        
        # Assemble the final response
        return Response({
            'org_id': org.id,
            'org_name': org.name,
            'active_period_setting': period_setting_data,
            'period_instances': period_instances_data,
            'users': user_data,
            'locations': locations_data
        })

class PeriodSettingViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    serializer_class = PeriodSettingSerializer
    
    def get_queryset(self):
        return PeriodSetting.objects.filter(org=self.request.user.org)

    def perform_create(self, serializer):
        # Delete all old period settings for this org (cascades to their instances).
        # Session.period_instance is SET_NULL so study sessions are preserved.
        PeriodSetting.objects.filter(org=self.request.user.org).delete()

        period_setting = serializer.save(org=self.request.user.org, is_active=True)

        current_time = timezone.now()
        org_tz = getattr(period_setting.org, 'timezone', 'UTC')
        # Normalize to midnight UTC — strips local-time offset from the frontend ISO string
        inst_start = period_setting.start_date.replace(hour=0, minute=0, second=0, microsecond=0)

        if inst_start > current_time:
            # Future start date: create just the first period as active
            due = period_setting.get_next_due_date(from_date=inst_start)
            if due:
                instance = PeriodInstance.objects.create(
                    period_setting=period_setting,
                    start_date=inst_start,
                    end_date=period_end_of_day(due, org_tz),
                    is_active=True,
                )
                backfill_sessions_for_instance(instance)
        else:
            # Past/current start date: backfill all historical periods (inactive) + current (active)
            while True:
                due = period_setting.get_next_due_date(from_date=inst_start)
                if not due:
                    break
                inst_end = period_end_of_day(due, org_tz)
                is_current = inst_end >= current_time
                instance = PeriodInstance.objects.create(
                    period_setting=period_setting,
                    start_date=inst_start,
                    end_date=inst_end,
                    is_active=is_current,
                )
                backfill_sessions_for_instance(instance)
                if is_current:
                    break
                inst_start = due + timedelta(days=1)

class PeriodInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    serializer_class = PeriodInstanceSerializer
    queryset = PeriodInstance.objects.all()

class UserDashboard(RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserDashboardSerializer

    def get_object(self):
        return User.objects.select_related(
            'org',
            'last_location'
        ).prefetch_related(
            'sessions',
            'org__locations',
            'org__users',
            'org__users__last_location',
            'org__period_settings',
            'org__settings'
        ).get(id=self.request.user.id)

class GetLocation(RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UpdateLocationSerializer
    queryset = Location.objects.all()

    def get_queryset(self):
        current_user = self.request.user
        return Location.objects.filter(org=current_user.org)
class ModifyLocation(UpdateAPIView, DestroyAPIView):
    permission_classes = (IsAdminUser,)
    serializer_class = UpdateLocationSerializer
    queryset = Location.objects.all()

    def get_queryset(self):
        return Location.objects.filter(org=self.request.user.org)
class CreateLocation(CreateAPIView):
    permission_classes = (IsAdminUser,)
    serializer_class = LocationSerializer
    queryset = Location.objects.all()
class ListLocations(ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = LocationSerializer
    queryset = Location.objects.all()

    def get_queryset(self):
        current_user = self.request.user
        return Location.objects.filter(org=current_user.org)

class ClockOut(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, format=None):
        current_user = request.user
        org = current_user.org
        if not org:
            raise exceptions.ValidationError(detail="Must be apart of an org to clock out")
        org_settings, _ = OrgSettings.objects.get_or_create(org=org)
        if org_settings.maintenance_mode and not current_user.is_staff:
            raise exceptions.PermissionDenied(detail="Your organization is temporarily in maintenance mode")
        current_time = timezone.now()

        raw_end_time = request.data.get('end_time')
        if raw_end_time:
            from django.utils.dateparse import parse_datetime
            parsed = parse_datetime(raw_end_time)
            if parsed and parsed < current_time:
                current_time = parsed

        last_session = Session.objects.filter(user=current_user, hours__isnull=True).last()
        if last_session and not last_session.hours:
            start_time = last_session.start_time
            # Clock out logic
            hours = (current_time - start_time).total_seconds() / 3600
            last_session.hours = hours
            last_session.save()
            current_user.live = False
            current_user.save()

            #Send Notification to user
            location_name = last_session.location.name if last_session.location else "your study location"
            send_notification_to_users([current_user.id], "Clocked Out", f"Your study session at {location_name} has been ended", notification_type='user_leaves_zone')

            return Response({
                "detail": "Successfully clocked out.",
                "start_time": last_session.start_time,
                "hours": hours
            }, status=status.HTTP_200_OK)
        else:
            raise exceptions.ValidationError(detail="You are not clocked in")

class ClockIn(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, format=None):
        current_user = request.user
        org = current_user.org
        if not org:
            raise exceptions.ValidationError(detail="Must be apart of an org to clock in")
        org_settings, _ = OrgSettings.objects.get_or_create(org=org)
        if org_settings.maintenance_mode and not current_user.is_staff:
            raise exceptions.PermissionDenied(detail="Your organization is temporarily in maintenance mode")
        current_time = timezone.now()

        location_id = request.data.get("location_id")
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        location = None

        if org_settings.require_location_verification and not location_id:
            raise exceptions.ValidationError(detail="Location ID is required")
        if org_settings.require_location_verification and (latitude is None or longitude is None):
            raise exceptions.ValidationError(detail="Current latitude and longitude are required")
        if location_id:
            try:
                location = Location.objects.get(id=location_id)
                if location.org != org:
                    raise exceptions.ValidationError(detail="Location does not belong to your organization")
            except Location.DoesNotExist:
                raise exceptions.ValidationError(detail="Invalid Location ID")
        if org_settings.require_location_verification:
            try:
                latitude = float(latitude)
                longitude = float(longitude)
            except (TypeError, ValueError):
                raise exceptions.ValidationError(detail="Current latitude and longitude must be valid numbers")

            distance = distance_meters(latitude, longitude, location.gps_lat, location.gps_long)
            if distance > location.gps_radius:
                raise exceptions.ValidationError(
                    detail=f"You must be inside {location.name} to clock in"
                )
        
        last_session = Session.objects.filter(user=current_user, hours__isnull=True).last()
        if last_session and not last_session.hours:
            raise exceptions.ValidationError(detail="Already clocked in")
        
        # Get or create period instance
        period_instance = get_or_create_period_instance(current_user, current_time)
        
        session = Session.objects.create(
            start_time = current_time,
            user = current_user,
            org = org,
            location = location,
            period_instance = period_instance,
            #BEFORE PIC, AFTER PIC LATER
        )

        current_user.live = True
        current_user.last_location = location
        current_user.save()

        # Notify all users in the org except the one who just clocked in
        location_name = location.name if location else "an unverified location"
        user_name = f"{current_user.first_name} {current_user.last_name}".strip()
        send_notification_to_org(
            org_id=org.id,
            title="Someone Started Studying!",
            body=f"{user_name} is now studying at {location_name}.",
            data={
                "type": "user_studying",
                "user_id": current_user.id,
                "user_name": user_name,
                "location": location_name
            },
            notification_type='org_starts_studying'
        )

        return Response({
            "detail": "Successfully clocked in.",
            "start_time": current_time,
        }, status=status.HTTP_200_OK)

class ManualSessionView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, format=None):
        current_user = request.user
        org = current_user.org
        if not org:
            raise exceptions.ValidationError(detail="Must be apart of an org to add manual study time")
        org_settings, _ = OrgSettings.objects.get_or_create(org=org)
        if org_settings.maintenance_mode and not current_user.is_staff:
            raise exceptions.PermissionDenied(detail="Your organization is temporarily in maintenance mode")
        if not org_settings.allow_manual_entry:
            raise exceptions.PermissionDenied(detail="Manual study entry is disabled for your organization")

        hours = request.data.get("hours")
        try:
            hours = float(hours)
        except (TypeError, ValueError):
            raise exceptions.ValidationError(detail="Hours must be a valid number")
        if hours <= 0 or hours > 24:
            raise exceptions.ValidationError(detail="Hours must be greater than 0 and no more than 24")

        start_time = request.data.get("start_time")
        if start_time:
            try:
                parsed_start = timezone.datetime.fromisoformat(str(start_time).replace("Z", "+00:00"))
            except ValueError:
                raise exceptions.ValidationError(detail="Start time must be a valid ISO timestamp")
            if timezone.is_naive(parsed_start):
                parsed_start = timezone.make_aware(parsed_start)
        else:
            parsed_start = timezone.now()
        if parsed_start > timezone.now() + timedelta(minutes=1):
            raise exceptions.ValidationError(detail="Manual study time cannot be in the future")

        period_instance = get_or_create_period_instance(current_user, parsed_start)
        session = Session.objects.create(
            start_time=parsed_start,
            hours=hours,
            user=current_user,
            org=org,
            location=None,
            period_instance=period_instance,
        )
        return Response(SessionSerializer(session).data, status=status.HTTP_201_CREATED)
        



class IsSuperUser(BasePermission):

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)

class Signup(PublicEndpointMixin, CreateAPIView):
    serializer_class = UserSerializer
    queryset = User.objects.all()

class ListOrgs(ListCreateAPIView):
    permission_classes = (IsSuperUser,)
    serializer_class = OrgSerializer
    queryset = Org.objects.all()

class OrgDetail(RetrieveUpdateDestroyAPIView):
    permission_classes = (IsSuperUser,)
    serializer_class = UpdateOrgSerializer
    queryset = Org.objects.all()

class GetOrgByCode(PublicEndpointMixin, RetrieveAPIView):
    serializer_class = OrgSerializer
    queryset = Org.objects.all()

    def get(self, request, *args, **kwargs):
        reg_code = request.query_params.get('reg_code')
        if not reg_code:
            raise Http404
        try:
            org = Org.objects.get(reg_code=reg_code)
        except Org.DoesNotExist:
            raise Http404
        serializer = self.get_serializer(org)
        data = serializer.data
        data['testnum'] = 2
        return Response(data)

class OrgSettingsView(APIView):
    permission_classes = (IsAdminUser,)

    def get_org_settings(self, request):
        if not request.user.org:
            raise exceptions.ValidationError(detail="Admin user must belong to an organization")
        org_settings, _ = OrgSettings.objects.get_or_create(org=request.user.org)
        return org_settings

    def get(self, request, format=None):
        serializer = OrgSettingsSerializer(self.get_org_settings(request))
        return Response(serializer.data)

    def put(self, request, format=None):
        org_settings = self.get_org_settings(request)
        serializer = OrgSettingsSerializer(org_settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(org=request.user.org)
        return Response(serializer.data)

    def patch(self, request, format=None):
        return self.put(request, format=format)

    def delete(self, request, format=None):
        org = request.user.org
        if not org:
            raise exceptions.ValidationError(detail="Admin user must belong to an organization")
        OrgSettings.objects.filter(org=org).delete()
        org_settings = OrgSettings.objects.create(org=org)
        serializer = OrgSettingsSerializer(org_settings)
        return Response(serializer.data)
            


class UserDetail(APIView):
    permission_classes = (IsAuthenticated,)

    def staff_or_same_user(self, user_operator, user_object):
        same_org = user_object.org is not None and user_object.org == user_operator.org
        return same_org and (user_operator.is_staff or user_object.id == user_operator.id)

    def get_object(self,pk):
        try:
            return User.objects.get(id=pk)
        except:
            raise Http404
        
    def get(self, request, pk, format=None):
        user = self.get_object(pk)
        current_user = request.user
        if not self.staff_or_same_user(current_user, user):
            raise exceptions.PermissionDenied(detail="Must be staff to view other users")
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    def put(self, request, pk, format=None):
        user = self.get_object(pk)
        current_user = request.user
        if not self.staff_or_same_user(current_user, user):
            raise exceptions.PermissionDenied(detail="Must be staff to modify other users")
        serializer = UpdateUserSerializer(user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            # Add notification fields to update
            notify_org_starts_studying = request.data.get('notify_org_starts_studying')
            notify_user_leaves_zone = request.data.get('notify_user_leaves_zone')
            notify_study_deadline_approaching = request.data.get('notify_study_deadline_approaching')
            if notify_org_starts_studying is not None:
                user.notify_org_starts_studying = notify_org_starts_studying
            if notify_user_leaves_zone is not None:
                user.notify_user_leaves_zone = notify_user_leaves_zone
            if notify_study_deadline_approaching is not None:
                user.notify_study_deadline_approaching = notify_study_deadline_approaching
            user.save()
            return Response(serializer.data)
        raise exceptions.ParseError(detail="Invalid data")

    def delete(self, request, pk, format=None):
        current_user = request.user
        user = self.get_object(pk)
        same_org = user.org is not None and user.org == current_user.org
        same_user = current_user.id == user.id
        if same_user:
            raise exceptions.PermissionDenied(detail="You can not delete yourself")
        if current_user.is_staff and same_org:
            user.delete()
            return Response({"detail": f"Deleted user #{pk}"}, 
                        status=status.HTTP_202_ACCEPTED)
        raise exceptions.PermissionDenied(detail="Only admins can delete users of their org")

class CurrentUserAccount(APIView):
    permission_classes = (IsAuthenticated,)

    def delete(self, request, format=None):
        user = request.user
        user_id = user.id
        user.delete()
        return Response({"detail": f"Deleted account #{user_id}"}, status=status.HTTP_200_OK)

class ProfilePictureUploadView(APIView):
    permission_classes = (IsAuthenticated,)

    allowed_content_types = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/heic': 'heic',
        'image/heif': 'heif',
    }

    def post(self, request, format=None):
        action = request.data.get('action')
        print(f"[ProfilePictureUpload] user={request.user.id} action={action}")
        if action == 'presign':
            return self.presign_upload(request)
        if action == 'complete':
            return self.complete_upload(request)
        raise exceptions.ValidationError(detail="Action must be presign or complete")

    def presign_upload(self, request):
        content_type = request.data.get('content_type')
        file_size = request.data.get('file_size')
        print(f"[ProfilePictureUpload] presign content_type={content_type} file_size={file_size}")
        if content_type not in self.allowed_content_types:
            raise exceptions.ValidationError(detail="Profile picture must be a JPEG, PNG, WEBP, HEIC, or HEIF image")

        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        extension = self.allowed_content_types[content_type]
        object_key = f"profile-pictures/user-{request.user.id}/{uuid.uuid4()}.{extension}"
        upload_url = s3_client().generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': object_key,
                'ContentType': content_type,
            },
            ExpiresIn=300,
        )
        print(f"[ProfilePictureUpload] presign ok key={object_key}")
        return Response({
            'upload_url': upload_url,
            'object_key': object_key,
            'content_type': content_type,
            'expires_in': 300,
        })

    def complete_upload(self, request):
        object_key = request.data.get('object_key')
        print(f"[ProfilePictureUpload] complete key={object_key}")
        expected_prefix = f"profile-pictures/user-{request.user.id}/"
        if not object_key or not object_key.startswith(expected_prefix):
            raise exceptions.PermissionDenied(detail="Invalid profile picture key")

        client = s3_client()
        try:
            client.head_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=object_key,
            )
        except ClientError:
            print(f"[ProfilePictureUpload] complete failed missing key={object_key}")
            raise exceptions.ValidationError(detail="Uploaded profile picture was not found")

        previous_key = request.user.profile_picture_key
        request.user.profile_picture_key = object_key
        request.user.save(update_fields=['profile_picture_key'])
        if previous_key and previous_key != object_key and previous_key.startswith(expected_prefix):
            try:
                client.delete_object(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=previous_key,
                )
                print(f"[ProfilePictureUpload] deleted previous key={previous_key}")
            except ClientError as error:
                print(f"[ProfilePictureUpload] previous delete failed key={previous_key} error={error}")
        print(f"[ProfilePictureUpload] complete ok user={request.user.id} key={object_key}")
        serializer = UserDashboardSerializer(request.user)
        return Response(serializer.data)

class AdminPasswordResetView(APIView):
    permission_classes = (IsAdminUser,)

    def post(self, request, user_id, format=None):
        try:
            user = User.objects.get(id=user_id, org=request.user.org)
        except User.DoesNotExist:
            raise Http404

        from .models import PasswordResetToken
        import secrets

        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
        reset_token = secrets.token_urlsafe(32)
        PasswordResetToken.objects.create(
            user=user,
            token=reset_token,
            expires_at=timezone.now() + timedelta(hours=1)
        )

        from .email_service import EmailService
        email_service = EmailService()
        user_name = f"{user.first_name} {user.last_name}".strip() or None
        email_sent = email_service.send_password_reset_email(
            user_email=user.email,
            reset_token=reset_token,
            user_name=user_name
        )

        if email_sent:
            return Response({
                "detail": "Password reset email has been sent to the user."
            }, status=status.HTTP_200_OK)

        if settings.DEBUG:
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{reset_token}/"
            return Response({
                "detail": "Password reset link was created, but email was not sent in this local environment.",
                "reset_url": reset_url,
            }, status=status.HTTP_200_OK)

        return Response(
            {"detail": "Failed to send password reset email. Please try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class ManageStaffStatus(UpdateAPIView):
    permission_classes = (IsAdminUser,)
    serializer_class = StaffStatusSerializer
    queryset = User.objects.all()

    def get_queryset(self):
        return User.objects.filter(org=self.request.user.org)

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            raise exceptions.ValidationError(detail="You cannot modify your own staff status")
        if user.org != request.user.org:
            raise exceptions.PermissionDenied(detail="You can only modify users in your organization")
        
        return super().update(request, *args, **kwargs)

class GetLatestPeriodInstance(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, format=None):
        current_user = request.user
        current_time = timezone.now()
        
        # Use the helper function to get or create period instance
        period_instance = get_or_create_period_instance(current_user, current_time)
        
        if period_instance:
            serializer = PeriodInstanceSerializer(period_instance)
            return Response(serializer.data)
        else:
            return Response({
                "detail": "No period settings found for your organization"
            }, status=status.HTTP_404_NOT_FOUND)

class DeactivateOrgPeriods(APIView):
    permission_classes = (IsAdminUser,)

    def post(self, request, format=None):
        current_user = request.user
        org = current_user.org
        
        if not org:
            raise exceptions.ValidationError(detail="Must be apart of an org to manage periods")

        PeriodSetting.objects.filter(org=org).delete()

        return Response({
            "detail": "Successfully deactivated all periods for organization."
        }, status=status.HTTP_200_OK)

class ContactFormView(PublicEndpointMixin, APIView):

    def post(self, request, format=None):
        name = (request.data.get('name') or '').strip()
        email = (request.data.get('email') or '').strip()
        topic = (request.data.get('topic') or '').strip()
        message = (request.data.get('message') or '').strip()
        organization = (request.data.get('organization') or '').strip()

        if not name:
            raise exceptions.ValidationError(detail="Name is required.")
        if not email:
            raise exceptions.ValidationError(detail="Email is required.")
        if not topic:
            raise exceptions.ValidationError(detail="Topic is required.")
        if not message or len(message) < 12:
            raise exceptions.ValidationError(detail="Please add more detail to your message.")

        from .email_service import EmailService
        sent = EmailService().send_contact_email(
            name=name,
            reply_to_email=email,
            topic=topic,
            message=message,
            organization=organization,
        )
        if not sent:
            raise exceptions.APIException(detail="Could not send your message. Please email support@greekgeek.app directly.")
        return Response({"detail": "Message sent."}, status=status.HTTP_200_OK)


class ModifyOrgDetails(UpdateAPIView):
    """
    View for admin users to modify their organization's details.
    Only allows modification of the organization the admin user belongs to.
    """
    permission_classes = (IsAdminUser,)
    serializer_class = UpdateOrgSerializer
    
    def get_object(self):
        user = self.request.user
        if not user.org:
            raise exceptions.ValidationError(detail="You are not associated with any organization")
        return user.org
    
    def get(self, request, *args, **kwargs):
        org = self.get_object()
        serializer = self.get_serializer(org)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        org = self.get_object()
        serializer = self.get_serializer(org, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserSessionsView(ListAPIView):
    """
    View for admin users to retrieve all sessions for a specific user.
    Only allows access to sessions of users in the same organization as the admin.
    """
    permission_classes = (IsAdminUser,)
    serializer_class = SessionSerializer
    
    def get_queryset(self):
        admin_user = self.request.user
        user_id = self.kwargs.get('user_id')
        
        # Verify the admin user has an organization
        if not admin_user.org:
            return Session.objects.none()
        
        try:
            # Get the target user and verify they belong to the same org
            target_user = User.objects.get(id=user_id)
            if target_user.org != admin_user.org:
                return Session.objects.none()
                
            # Return all sessions for the target user
            return Session.objects.filter(user=target_user).select_related(
                'user', 'org', 'location', 'period_instance'
            ).order_by('-start_time')
            
        except User.DoesNotExist:
            return Session.objects.none()
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # If queryset is empty due to permission issues
        if not queryset.exists() and User.objects.filter(id=self.kwargs.get('user_id')).exists():
            user = User.objects.get(id=self.kwargs.get('user_id'))
            if user.org != request.user.org:
                return Response(
                    {"detail": "You can only view sessions for users in your organization"},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # If user doesn't exist
        if not User.objects.filter(id=self.kwargs.get('user_id')).exists():
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Normal flow
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class NotificationTokenView(APIView):
    """
    API view to register or update a user's Expo push notification token
    """
    permission_classes = (IsAuthenticated,)
    
    def post(self, request, format=None):
        serializer = NotificationTokenSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, format=None):
        device_id = request.data.get('device_id')
        if device_id:
            tokens = NotificationToken.objects.filter(user=request.user, device_id=device_id)
        else:
            token_str = request.data.get('token')
            if not token_str:
                return Response(
                    {"detail": "Either device_id or token must be provided"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            tokens = NotificationToken.objects.filter(user=request.user, token=token_str)
        
        if tokens.exists():
            tokens.update(is_active=False)
            return Response({"detail": "Notification token deactivated"}, status=status.HTTP_200_OK)
        
        return Response(
            {"detail": "No matching notification token found"}, 
            status=status.HTTP_404_NOT_FOUND
        )

class SendNotificationView(APIView):
    """
    API view to send push notifications to specific users
    Requires staff privileges
    """
    permission_classes = (IsAdminUser,)
    
    def post(self, request, format=None):
        # Validate required fields
        user_ids = request.data.get('user_ids', [])
        title = request.data.get('title')
        body = request.data.get('body')
        data = request.data.get('data', {})
        
        if not title or not body:
            return Response(
                {"detail": "Title and body are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not user_ids:
            return Response(
                {"detail": "At least one user_id is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure we can only send notifications to users in our org
        admin_org = request.user.org
        if not admin_org:
            return Response(
                {"detail": "Admin must belong to an organization"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get tokens for specified users that belong to admin's org
        tokens = NotificationToken.objects.filter(
            user__id__in=user_ids,
            user__org=admin_org,
            is_active=True
        )
        
        token_strings = [token.token for token in tokens]
        
        if not token_strings:
            return Response(
                {"detail": "No active notification tokens found for the specified users"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Prepare notification data
        notification_data = {
            'to': token_strings,
            'title': title,
            'body': body,
            'data': data,
            'sound': 'default',
        }
        
        # Send to Expo Push API
        try:
            response = requests.post(
                'https://exp.host/--/api/v2/push/send',
                data=json.dumps(notification_data),
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate'
                }
            )
            
            expo_response = response.json()
            
            return Response({
                "detail": f"Notification sent to {len(token_strings)} devices",
                "expo_response": expo_response
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "detail": "Failed to send notification",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminSessionView(RetrieveUpdateDestroyAPIView):
    """
    View for admin users to retrieve, modify, or delete a specific session by its ID.
    Only allows access to sessions of users in the same organization as the admin.
    """
    permission_classes = (IsAdminUser,)
    serializer_class = SessionSerializer
    
    def get_queryset(self):
        admin_user = self.request.user
        
        # Verify the admin user has an organization
        if not admin_user.org:
            return Session.objects.none()
        
        # Return all sessions for users in the admin's organization
        return Session.objects.filter(
            org=admin_user.org
        ).select_related(
            'user', 'org', 'location', 'period_instance'
        )
    
    def get_object(self):
        obj = super().get_object()
        # Double-check the session belongs to the admin's organization
        if obj.org != self.request.user.org:
            raise exceptions.PermissionDenied(
                detail="You can only modify sessions for users in your organization"
            )
        return obj
    
    def update(self, request, *args, **kwargs):
        # For update operations, we only want to allow hours field to be modified
        if 'hours' not in request.data or len(request.data) > 1:
            return Response(
                {"detail": "Only the hours field can be modified"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session = self.get_object()
        
        # Check if trying to change hours from a value to None
        hours_value = request.data.get('hours')
        if session.hours is not None and (hours_value is None or hours_value == ''):
            return Response(
                {"detail": "Cannot change hours from a value to empty"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        response = super().update(request, *args, **kwargs)
        
        # If we're setting hours for an in-progress session, update user's live status
        if session.hours is None and hours_value is not None:
            user = session.user
            user.live = False
            user.save()
            
            # Optional: Send notification to user about admin ending their session
            try:
                send_notification_to_users(
                    [user.id], 
                    "Session Ended", 
                    f"Your study session at {session.location.name} has been ended by an admin"
                )
            except Exception as e:
                # Log error but don't block the update
                print(f"Error sending notification: {str(e)}")
                
        return response
    
    def perform_destroy(self, instance):
        # If we're deleting an in-progress session, update user's live status
        if instance.hours is None:
            user = instance.user
            user.live = False
            user.save()
            
            # Optional: Send notification to user about admin deleting their session
            try:
                send_notification_to_users(
                    [user.id], 
                    "Session Deleted", 
                    f"Your study session at {instance.location.name} has been deleted by an admin"
                )
            except Exception as e:
                # Log error but don't block the deletion
                print(f"Error sending notification: {str(e)}")
                
        instance.delete()
    
    def perform_update(self, serializer):
        serializer.save()
        
        # Send notification for regular updates (already handled for in-progress sessions in update method)
        session = serializer.instance
        if session.hours is not None:
            try:
                send_notification_to_users(
                    [session.user.id], 
                    "Session Updated", 
                    f"Your study session at {session.location.name} has been updated by an admin"
                )
            except Exception as e:
                # Log error but don't block the update
                print(f"Error sending notification: {str(e)}")

class GroupManagementView(APIView):
    """
    View for admin users to manage groups in their organization.
    Supports creating, updating, and deleting groups with user assignments.
    """
    permission_classes = (IsAdminUser,)
    
    def get_group_queryset(self):
        """Get groups that belong to the admin's organization"""
        admin_user = self.request.user
        if not admin_user.org:
            return Group.objects.none()
        return Group.objects.filter(org=admin_user.org)
    
    def get(self, request, group_id=None, format=None):
        """List all groups or get a specific group"""
        if group_id:
            try:
                group = self.get_group_queryset().get(id=group_id)
                # Include users in this group
                users_in_group = User.objects.filter(group=group)
                group_data = GroupSerializer(group).data
                group_data['users'] = UserSerializer(users_in_group, many=True).data
                return Response(group_data)
            except Group.DoesNotExist:
                return Response(
                    {"detail": "Group not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # List all groups
            groups = self.get_group_queryset()
            groups_data = []
            for group in groups:
                users_in_group = User.objects.filter(group=group)
                group_data = GroupSerializer(group).data
                group_data['users'] = UserSerializer(users_in_group, many=True).data
                groups_data.append(group_data)
            return Response(groups_data)
    
    def post(self, request, format=None):
        """Create a new group"""
        serializer = CreateGroupSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            group = serializer.save()
            # Return the created group with its users
            users_in_group = User.objects.filter(group=group)
            group_data = GroupSerializer(group).data
            group_data['users'] = UserSerializer(users_in_group, many=True).data
            return Response(group_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def put(self, request, group_id, format=None):
        """Update a group"""
        try:
            group = self.get_group_queryset().get(id=group_id)
        except Group.DoesNotExist:
            return Response(
                {"detail": "Group not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = UpdateGroupSerializer(group, data=request.data, context={'request': request})
        if serializer.is_valid():
            group = serializer.save()
            # Return the updated group with its users
            users_in_group = User.objects.filter(group=group)
            group_data = GroupSerializer(group).data
            group_data['users'] = UserSerializer(users_in_group, many=True).data
            return Response(group_data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, group_id, format=None):
        """Delete a group"""
        try:
            group = self.get_group_queryset().get(id=group_id)
        except Group.DoesNotExist:
            return Response(
                {"detail": "Group not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Remove users from this group before deleting
        User.objects.filter(group=group).update(group=None)
        
        group_name = group.name
        group.delete()
        
        return Response(
            {"detail": f"Group '{group_name}' has been deleted"}, 
            status=status.HTTP_200_OK
        )

class OrgOwnerSignupView(PublicEndpointMixin, CreateAPIView):
    """
    View for creating a new organization and its owner user account.
    This is intended for website signup where someone wants to create a new organization.
    """
    serializer_class = OrgOwnerSignupSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                result = serializer.save()
                verification, email_sent = send_admin_verification_email(result['user'])
            
            # Prepare response data
            user_data = UserSerializer(result['user']).data
            org_data = OrgSerializer(result['org']).data
            
            response_data = {
                'detail': 'Organization and owner account created successfully. Please verify your email before signing in.',
                'email_verification_required': True,
                'verification_email_sent': email_sent,
                'user': user_data,
                'organization': org_data
            }
            if settings.DEBUG and not email_sent:
                response_data['verification_url'] = f"{settings.FRONTEND_URL}/verify-email/{verification.token}/"

            return Response(response_data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FastTestOrgSignupView(PublicEndpointMixin, APIView):
    """
    Temporary test-only shortcut for creating a verified org admin.
    """
    def post(self, request, format=None):
        if not settings.FAST_TEST_REGISTRATION_ENABLED:
            raise Http404

        suffix = uuid.uuid4().hex[:8]
        with transaction.atomic():
            org = Org.objects.create(
                name=f'Test Chapter {suffix}',
                school='Test University',
                reg_code=f'TEST{suffix.upper()}',
                study_req=2.0,
                study_goal=4.0,
                is_premium=False,
            )
            user = User.objects.create_user(
                email=f'test-admin-{suffix}@example.com',
                password=secrets.token_urlsafe(18),
                first_name='Test',
                last_name='Admin',
                org=org,
                is_staff=True,
                phone_number='',
            )
            user.email_verified = True
            user.save(update_fields=['email_verified'])

        refresh = RefreshToken.for_user(user)
        return Response({
            'detail': 'Test organization and verified admin created.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'organization': OrgSerializer(org).data,
        }, status=status.HTTP_201_CREATED)


class EmailVerificationConfirmView(PublicEndpointMixin, APIView):
    """
    API view to confirm a newly registered admin email address.
    """
    def post(self, request, format=None):
        token = request.data.get('token')
        if not token:
            return Response(
                {"detail": "Verification token is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            verification = EmailVerificationToken.objects.select_related('user', 'user__org').get(
                token=token,
                is_used=False,
            )
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {"detail": "Invalid or expired verification token"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if verification.is_expired():
            return Response(
                {"detail": "Verification token has expired. Please request a new verification email."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = verification.user
        user.email_verified = True
        user.save(update_fields=['email_verified'])
        verification.is_used = True
        verification.save(update_fields=['is_used'])

        return Response({
            "detail": "Email verified successfully. You can now sign in.",
            "email": user.email,
        }, status=status.HTTP_200_OK)


class BillingCheckoutSessionView(APIView):
    """
    Creates a Stripe-hosted Checkout Session for the org annual subscription.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request, format=None):
        user = request.user
        if not user.is_staff or not user.org:
            raise exceptions.PermissionDenied(detail="Only organization admins can manage billing")

        if not settings.STRIPE_ORG_PRICE_ID:
            raise exceptions.APIException(detail="Stripe organization price is not configured")

        if user.org.stripe_subscription_status in {'active', 'trialing'}:
            raise exceptions.ValidationError(detail="Your organization already has an active subscription or trial")

        configure_stripe()

        session_params = {
            'mode': 'subscription',
            'payment_method_collection': 'always',
            'line_items': [
                {
                    'price': settings.STRIPE_ORG_PRICE_ID,
                    'quantity': 1,
                }
            ],
            'success_url': settings.STRIPE_BILLING_SUCCESS_URL,
            'cancel_url': settings.STRIPE_BILLING_CANCEL_URL,
            'client_reference_id': str(user.org.id),
            'metadata': {
                'org_id': str(user.org.id),
                'user_id': str(user.id),
            },
            'subscription_data': {
                'trial_period_days': 30,
                'metadata': {
                    'org_id': str(user.org.id),
                    'user_id': str(user.id),
                },
            },
        }

        if user.org.stripe_customer_id:
            session_params['customer'] = user.org.stripe_customer_id
        else:
            session_params['customer_email'] = user.email

        checkout_session = stripe.checkout.Session.create(**session_params)

        return Response({
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id,
        }, status=status.HTTP_201_CREATED)


class BillingCheckoutSessionSyncView(APIView):
    """
    Syncs the org subscription from a completed Stripe Checkout Session.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request, format=None):
        user = request.user
        if not user.is_staff or not user.org:
            raise exceptions.PermissionDenied(detail="Only organization admins can manage billing")

        session_id = request.data.get('session_id')
        if not session_id:
            raise exceptions.ValidationError(detail="Checkout session ID is required")

        configure_stripe()
        checkout_session = stripe.checkout.Session.retrieve(
            session_id,
            expand=['subscription'],
        )

        org_id = (
            stripe_get(stripe_get(checkout_session, 'metadata', {}), 'org_id')
            or stripe_get(checkout_session, 'client_reference_id')
        )
        if str(user.org.id) != str(org_id):
            raise exceptions.PermissionDenied(detail="Checkout session does not belong to your organization")

        subscription = stripe_get(checkout_session, 'subscription')
        if not subscription or isinstance(subscription, str):
            raise exceptions.ValidationError(detail="Checkout session does not include a subscription yet")

        sync_org_from_stripe_subscription(
            user.org,
            subscription,
            customer_id=stripe_get(checkout_session, 'customer'),
        )
        return Response(billing_response(user.org), status=status.HTTP_200_OK)


class BillingSubscriptionSyncView(APIView):
    """
    Refreshes the org billing state from Stripe using stored billing IDs.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request, format=None):
        user = request.user
        if not user.is_staff or not user.org:
            raise exceptions.PermissionDenied(detail="Only organization admins can manage billing")

        org = user.org
        if not org.stripe_subscription_id and not org.stripe_customer_id:
            return Response(billing_response(org), status=status.HTTP_200_OK)

        try:
            configure_stripe()
            subscription = None

            if org.stripe_subscription_id:
                subscription = stripe.Subscription.retrieve(org.stripe_subscription_id)
            elif org.stripe_customer_id:
                subscriptions = stripe.Subscription.list(
                    customer=org.stripe_customer_id,
                    status='all',
                    limit=1,
                )
                subscription_data = stripe_get(subscriptions, 'data', [])
                if subscription_data:
                    subscription = subscription_data[0]
        except stripe.error.StripeError:
            return Response(
                billing_response(
                    org,
                    sync_error="Billing refresh failed. Check backend billing API permissions or webhook delivery.",
                ),
                status=status.HTTP_200_OK,
            )

        if subscription:
            sync_org_from_stripe_subscription(org, subscription)

        return Response(billing_response(org), status=status.HTTP_200_OK)


class BillingSubscriptionCancelView(APIView):
    """
    Cancels the org Stripe subscription at period end.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request, format=None):
        user = request.user
        if not user.is_staff or not user.org:
            raise exceptions.PermissionDenied(detail="Only organization admins can manage billing")

        org = user.org
        if not org.stripe_subscription_id:
            raise exceptions.ValidationError(detail="Your organization does not have a Stripe subscription to cancel")

        configure_stripe()
        subscription = stripe.Subscription.modify(
            org.stripe_subscription_id,
            cancel_at_period_end=True,
        )
        sync_org_from_stripe_subscription(org, subscription)

        return Response(billing_response(org), status=status.HTTP_200_OK)


class StripeWebhookView(APIView):
    """
    Receives Stripe billing events and keeps organization premium state in sync.
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request, format=None):
        if not settings.STRIPE_WEBHOOK_SECRET:
            raise exceptions.APIException(detail="Stripe webhook secret is not configured")

        configure_stripe()

        payload = request.body
        signature = request.META.get('HTTP_STRIPE_SIGNATURE')

        try:
            event = stripe.Webhook.construct_event(
                payload=payload,
                sig_header=signature,
                secret=settings.STRIPE_WEBHOOK_SECRET,
            )
        except ValueError:
            return Response({"detail": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.SignatureVerificationError:
            return Response({"detail": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event.get('type')
        event_object = event.get('data', {}).get('object', {})

        if event_type in {'checkout.session.completed', 'checkout.session.async_payment_succeeded'}:
            org_id = event_object.get('metadata', {}).get('org_id') or event_object.get('client_reference_id')
            if org_id:
                try:
                    org = Org.objects.get(id=org_id)
                except Org.DoesNotExist:
                    org = None

                if org:
                    subscription_id = event_object.get('subscription')
                    subscription = None
                    if subscription_id:
                        try:
                            subscription = stripe.Subscription.retrieve(subscription_id)
                        except stripe.error.StripeError:
                            subscription = None

                    if subscription:
                        sync_org_from_stripe_subscription(
                            org,
                            subscription,
                            customer_id=event_object.get('customer'),
                        )
                    else:
                        sync_org_subscription(
                            org,
                            subscription_id=subscription_id,
                            customer_id=event_object.get('customer'),
                            status_value='trialing',
                        )

        elif event_type in {
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'customer.subscription.paused',
            'customer.subscription.pending_update_applied',
            'customer.subscription.pending_update_expired',
            'customer.subscription.resumed',
            'customer.subscription.trial_will_end',
        }:
            subscription_id = event_object.get('id')
            customer_id = event_object.get('customer')
            org = org_for_stripe_billing_event(
                subscription_id=subscription_id,
                customer_id=customer_id,
                metadata=event_object.get('metadata', {}),
            )

            if org:
                sync_org_from_stripe_subscription(
                    org,
                    customer_id=customer_id,
                    subscription=event_object,
                )

        elif event_type in {
            'invoice.paid',
            'invoice.payment_succeeded',
            'invoice.payment_failed',
            'invoice.marked_uncollectible',
            'invoice.voided',
        }:
            sync_org_from_stripe_invoice(event_object)

        return Response({"received": True}, status=status.HTTP_200_OK)


class RevenueCatWebhookView(APIView):
    """
    Receives RevenueCat subscription events and keeps organization premium state in sync.
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request, format=None):
        expected_authorization = settings.REVENUECAT_WEBHOOK_AUTHORIZATION
        if expected_authorization:
            received_authorization = request.META.get('HTTP_AUTHORIZATION', '')
            if received_authorization != expected_authorization:
                return Response({"detail": "Invalid authorization"}, status=status.HTTP_401_UNAUTHORIZED)

        event = request.data.get('event') if isinstance(request.data, dict) else None
        if not isinstance(event, dict):
            return Response({"detail": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event.get('type')
        if event_type not in REVENUECAT_SUPPORTED_EVENT_TYPES:
            return Response({"received": True, "ignored": True}, status=status.HTTP_200_OK)

        if event_type == 'TRANSFER':
            return Response(
                {"received": True, "transfer": sync_revenuecat_transfer_event(event)},
                status=status.HTTP_200_OK,
            )

        if not revenuecat_event_matches_org_subscription(event):
            return Response({"received": True, "ignored": True}, status=status.HTTP_200_OK)

        identifiers = revenuecat_event_identifiers(event)
        if not identifiers:
            return Response({"detail": "Missing RevenueCat app user id"}, status=status.HTTP_400_BAD_REQUEST)

        org = Org.objects.filter(revenuecat_app_user_id__in=identifiers).first()
        if org is None:
            return Response({"detail": "Organization not found"}, status=status.HTTP_404_NOT_FOUND)

        sync_org_from_revenuecat_event(org, event)

        return Response(billing_response(org), status=status.HTTP_200_OK)


class EmailVerificationResendView(PublicEndpointMixin, APIView):
    """
    API view to resend verification for admins blocked at login.
    """
    def post(self, request, format=None):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response(
                {"detail": "Email and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email__iexact=email, is_staff=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "If this admin account exists and needs verification, a new email has been sent."},
                status=status.HTTP_200_OK
            )

        if not user.check_password(password):
            return Response(
                {"detail": "If this admin account exists and needs verification, a new email has been sent."},
                status=status.HTTP_200_OK
            )

        if user.email_verified:
            return Response(
                {"detail": "This email is already verified. You can sign in."},
                status=status.HTTP_200_OK
            )

        verification, email_sent = send_admin_verification_email(user)
        response_data = {
            "detail": "Verification email sent. Please check your inbox.",
            "verification_email_sent": email_sent,
        }
        if settings.DEBUG and not email_sent:
            response_data['verification_url'] = f"{settings.FRONTEND_URL}/verify-email/{verification.token}/"
        return Response(response_data, status=status.HTTP_200_OK)

class PasswordResetRequestView(PublicEndpointMixin, APIView):
    """
    API view to request a password reset via email
    """
    def post(self, request, format=None):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {"detail": "Email is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            
            # Deactivate any existing password reset tokens for this user
            from .models import PasswordResetToken
            PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
            
            # Generate a new reset token
            import secrets
            reset_token = secrets.token_urlsafe(32)
            
            # Set expiration time (1 hour from now)
            expires_at = timezone.now() + timedelta(hours=1)
            
            # Create password reset token record
            password_reset = PasswordResetToken.objects.create(
                user=user,
                token=reset_token,
                expires_at=expires_at
            )
            
            # Send email
            from .email_service import EmailService
            email_service = EmailService()
            
            user_name = f"{user.first_name} {user.last_name}".strip()
            if user_name == "":
                user_name = None
                
            email_sent = email_service.send_password_reset_email(
                user_email=user.email,
                reset_token=reset_token,
                user_name=user_name
            )
            
            if email_sent:
                return Response({
                    "detail": "Password reset email sent successfully. Please check your email for instructions."
                }, status=status.HTTP_200_OK)
            else:
                # Clean up the token if email failed
                password_reset.delete()
                return Response(
                    {"detail": "Failed to send email. Please try again later."}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except User.DoesNotExist:
            # For security, we don't reveal whether an email exists or not
            return Response({
                "detail": "If an account with this email exists, a password reset email has been sent."
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response(
                {"detail": "An error occurred. Please try again later."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetConfirmView(PublicEndpointMixin, APIView):
    """
    API view to confirm password reset with token and set new password
    """
    def post(self, request, format=None):
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        if not all([token, new_password, confirm_password]):
            return Response(
                {"detail": "Token, new password, and confirm password are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_password != confirm_password:
            return Response(
                {"detail": "Passwords do not match"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters long"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .models import PasswordResetToken
            
            # Find the password reset token
            password_reset = PasswordResetToken.objects.get(
                token=token,
                is_used=False
            )
            
            # Check if token is expired
            if password_reset.is_expired():
                return Response(
                    {"detail": "Password reset token has expired. Please request a new one."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Reset the password
            user = password_reset.user
            user.set_password(new_password)
            user.save()
            
            # Mark token as used
            password_reset.is_used = True
            password_reset.save()
            
            # Send confirmation email
            from .email_service import EmailService
            email_service = EmailService()
            
            user_name = f"{user.first_name} {user.last_name}".strip()
            if user_name == "":
                user_name = None
                
            email_service.send_password_reset_confirmation_email(
                user_email=user.email,
                user_name=user_name
            )
            
            return Response({
                "detail": "Password has been reset successfully. You can now log in with your new password."
            }, status=status.HTTP_200_OK)
            
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"detail": "Invalid or expired password reset token"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        except Exception as e:
            return Response(
                {"detail": "An error occurred. Please try again later."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetTokenValidationView(PublicEndpointMixin, APIView):
    """
    API view to validate a password reset token (for frontend to check if token is valid)
    """
    def get(self, request, token, format=None):
        try:
            from .models import PasswordResetToken
            
            password_reset = PasswordResetToken.objects.get(
                token=token,
                is_used=False
            )
            
            if password_reset.is_expired():
                return Response(
                    {"valid": False, "detail": "Token has expired"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response({
                "valid": True,
                "user_email": password_reset.user.email,
                "expires_at": password_reset.expires_at
            }, status=status.HTTP_200_OK)
            
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"valid": False, "detail": "Invalid token"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
