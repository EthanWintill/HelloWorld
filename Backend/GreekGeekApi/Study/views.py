
from rest_framework import permissions, viewsets, status

from .serializers import UserSerializer, UpdateUserSerializer, OrgSerializer, UpdateOrgSerializer, LocationSerializer, UpdateLocationSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view

from rest_framework.views import APIView
from rest_framework.generics import CreateAPIView, ListCreateAPIView, ListAPIView, DestroyAPIView, UpdateAPIView, RetrieveUpdateDestroyAPIView, RetrieveAPIView

from rest_framework.authtoken.models import Token

from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission, IsAdminUser

from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, Org, Session, Location

from django.http import Http404 
from django.utils import timezone

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


class ClockIn(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, format=None):
        current_user = request.user
        org = current_user.org
        if not org:
            return Response({"detail": "Must be apart of an org to clock in"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        current_time = timezone.now()

        location_id = request.data.get("location_id")

        if not location_id:
            return Response({"detail": "Location ID is required."}, 
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            location = Location.objects.get(id=location_id)
            if location.org != org:  # Ensure the location belongs to the user's organization
                return Response({"detail": "Location does not belong to your organization."}, 
                                status=status.HTTP_400_BAD_REQUEST)
        except Location.DoesNotExist:
            return Response({"detail": "Invalid Location ID."}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        last_session = Session.objects.filter(user=current_user).last()
        if last_session and not last_session.hours:
            return Response({"detail": "Already clocked in.",
                            "start_time": last_session.start_time}, 
                            status=status.HTTP_208_ALREADY_REPORTED)
        
        session = Session.objects.create(
            start_time = current_time,
            user = current_user,
            org = org,
            location = location,
            #BEFORE PIC, AFTER PIC LATER
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
            return Response({"detail": "Can only get your user info."}, 
                          status=status.HTTP_403_FORBIDDEN)
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    def put(self, request, pk, format=None):
        user = self.get_object(pk)
        current_user = request.user
        if not self.staff_or_same_user(current_user, user):
            return Response({"detail": "Can only update your user info."}, 
                          status=status.HTTP_403_FORBIDDEN)
        serializer = UpdateUserSerializer(user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, format=None):
        current_user = request.user
        user = self.get_object(pk)
        same_org = user.org is not None and user.org == current_user.org
        if current_user.is_staff and same_org:
            user.delete()
            return Response({"detail": f"Deleted user #{pk}"}, 
                        status=status.HTTP_202_ACCEPTED)
        return Response({"detail": "Only admins can delete users of their org."}, 
                          status=status.HTTP_403_FORBIDDEN)
        





    

