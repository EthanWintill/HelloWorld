
from rest_framework import permissions, viewsets, status

from .serializers import UserSerializer, UpdateUserSerializer, OrgSerializer, UpdateOrgSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view

from rest_framework.views import APIView
from rest_framework.generics import CreateAPIView, ListCreateAPIView, ListAPIView, DestroyAPIView, UpdateAPIView, RetrieveUpdateDestroyAPIView

from rest_framework.authtoken.models import Token

from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission

from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, Org

from django.http import Http404

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
        





    

