from rest_framework import permissions, viewsets, status, exceptions

from .serializers import UserSerializer, UpdateUserSerializer, OrgSerializer, UpdateOrgSerializer, LocationSerializer, UpdateLocationSerializer, UserDashboardSerializer, StaffStatusSerializer, PeriodSettingSerializer, PeriodInstanceSerializer, SessionSerializer, NotificationTokenSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view, action

from rest_framework.views import APIView
from rest_framework.generics import CreateAPIView, ListCreateAPIView, ListAPIView, DestroyAPIView, UpdateAPIView, RetrieveUpdateDestroyAPIView, RetrieveAPIView

from rest_framework.authtoken.models import Token

from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission, IsAdminUser

from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, Org, Session, Location, PeriodSetting, PeriodInstance, NotificationToken

from django.http import Http404 
from django.utils import timezone

from datetime import timedelta
import json
import requests

from .utils import get_or_create_period_instance, send_notification_to_users

class PeriodSettingViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    serializer_class = PeriodSettingSerializer
    
    def get_queryset(self):
        return PeriodSetting.objects.filter(org=self.request.user.org)

    def perform_create(self, serializer):
        # Deactivate existing period settings for this org
        PeriodSetting.objects.filter(org=self.request.user.org, is_active=True).update(is_active=False)
        
        # Deactivate existing active period instances
        PeriodInstance.objects.filter(
            period_setting__org=self.request.user.org,
            is_active=True
        ).update(is_active=False)
        
        # Create new period setting
        period_setting = serializer.save(org=self.request.user.org, is_active=True)
        
        # Create first period instance
        start_date = period_setting.start_date
        end_date = period_setting.get_next_due_date()
        if end_date:
            PeriodInstance.objects.create(
                period_setting=period_setting,
                start_date=start_date,
                end_date=end_date,
                is_active=True
            )

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
            'org__period_settings'
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
        current_time = timezone.now()

        last_session = Session.objects.filter(user=current_user).last()
        start_time = last_session.start_time
        if last_session and not last_session.hours:
            # Clock out logic
            hours = (current_time - start_time).total_seconds() / 3600
            last_session.hours = hours
            last_session.save()
            current_user.live = False
            current_user.save()

            #Send Notification to user
            send_notification_to_users([current_user.id], "Clocked Out", f"Your study session at {last_session.location.name} has been ended")

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
        current_time = timezone.now()

        location_id = request.data.get("location_id")

        if not location_id:
            raise exceptions.ValidationError(detail="Location ID is required")
        try:
            location = Location.objects.get(id=location_id)
            if location.org != org:  # Ensure the location belongs to the user's organization
                raise exceptions.ValidationError(detail="Location does not belong to your organization")
        except Location.DoesNotExist:
            raise exceptions.ValidationError(detail="Invalid Location ID")
        
        last_session = Session.objects.filter(user=current_user).last()
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

        return Response({
            "detail": "Successfully clocked in.",
            "start_time": current_time,
        }, status=status.HTTP_200_OK)
        



class IsSuperUser(BasePermission):

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)

class Signup(CreateAPIView):
    permission_classes = (AllowAny,)
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

class GetOrgByCode(RetrieveAPIView):
    permission_classes = (AllowAny,)
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

        # Deactivate all period settings for this org
        PeriodSetting.objects.filter(org=org).update(is_active=False)
        
        # Deactivate all period instances associated with this org
        PeriodInstance.objects.filter(
            period_setting__org=org
        ).update(is_active=False)

        return Response({
            "detail": "Successfully deactivated all periods for organization."
        }, status=status.HTTP_200_OK)

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
        
        return super().update(request, *args, **kwargs)
    
    def perform_update(self, serializer):
        serializer.save()
        
        # Optional: Send notification to the user about the session modification
        session = serializer.instance
        try:
            send_notification_to_users(
                [session.user.id], 
                "Session Updated", 
                f"Your study session at {session.location.name} has been updated by an admin"
            )
        except Exception as e:
            # Log error but don't block the update
            print(f"Error sending notification: {str(e)}")








