from rest_framework import permissions, viewsets, status, exceptions

from .serializers import UserSerializer, UpdateUserSerializer, OrgSerializer, UpdateOrgSerializer, LocationSerializer, UpdateLocationSerializer, UserDashboardSerializer, StaffStatusSerializer, PeriodSettingSerializer, PeriodInstanceSerializer, SessionSerializer, NotificationTokenSerializer, GroupSerializer, CreateGroupSerializer, UpdateGroupSerializer, OrgOwnerSignupSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view, action

from rest_framework.views import APIView
from rest_framework.generics import CreateAPIView, ListCreateAPIView, ListAPIView, DestroyAPIView, UpdateAPIView, RetrieveUpdateDestroyAPIView, RetrieveAPIView

from rest_framework.authtoken.models import Token

from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission, IsAdminUser

from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, Org, Session, Location, PeriodSetting, PeriodInstance, NotificationToken, Group

from django.http import Http404 
from django.utils import timezone

from datetime import timedelta
import json
import requests

from .utils import get_or_create_period_instance, send_notification_to_users, send_notification_to_org

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
            send_notification_to_users([current_user.id], "Clocked Out", f"Your study session at {last_session.location.name} has been ended", notification_type='user_leaves_zone')

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

        # Notify all users in the org except the one who just clocked in
        location_name = location.name if location else "Unknown location"
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
        data = serializer.data
        data['read'] = 'likeabook'
        return Response(data)
            


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

class OrgOwnerSignupView(CreateAPIView):
    """
    View for creating a new organization and its owner user account.
    This is intended for website signup where someone wants to create a new organization.
    """
    permission_classes = (AllowAny,)
    serializer_class = OrgOwnerSignupSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            result = serializer.save()
            
            # Prepare response data
            user_data = UserSerializer(result['user']).data
            org_data = OrgSerializer(result['org']).data
            
            return Response({
                'detail': 'Organization and owner account created successfully',
                'user': user_data,
                'organization': org_data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(APIView):
    """
    API view to request a password reset via email
    """
    permission_classes = (AllowAny,)
    
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


class PasswordResetConfirmView(APIView):
    """
    API view to confirm password reset with token and set new password
    """
    permission_classes = (AllowAny,)
    
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


class PasswordResetTokenValidationView(APIView):
    """
    API view to validate a password reset token (for frontend to check if token is valid)
    """
    permission_classes = (AllowAny,)
    
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








