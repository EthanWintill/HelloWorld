
from rest_framework import permissions, viewsets, status

from .serializers import UserSerializer

from rest_framework.response import Response
from rest_framework.decorators import api_view

from rest_framework.views import APIView
from rest_framework.generics import CreateAPIView, RetrieveUpdateDestroyAPIView

from rest_framework.authtoken.models import Token

from rest_framework.permissions import AllowAny, IsAuthenticated, DjangoModelPermissions, BasePermission

from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User

from django.http import Http404

class Signup(CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer

class IsAdminOrSelf(BasePermission):
    """
    Custom permission to only allow users to edit their own profile or admin to edit any
    """
    def has_object_permission(self, request, view, obj):
        # Admin permissions
        if request.user.is_staff:
            return True
            
        # Instance must be the user themselves
        return obj == request.user

class UserDetail(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrSelf]

    def get_object(self,pk):
        print(pk)
        
        print(User.objects.all().first().id)
        try:
            return User.objects.get(id=pk)
        except:
            raise Http404
        
    def get(self, request, pk, format=None):
        user = self.get_object(pk)
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    def put(self, request, pk, format=None):
        user = self.get_object(pk)
        serializer = UserSerializer(user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, format=None):
        user = self.get_object(pk)
        if not user.is_staff:
            return Response({"detail": "Only admins can delete users."}, 
                          status=status.HTTP_403_FORBIDDEN)
        





    



"""
@api_view(['GET'])
def get_words(request):
    words = Word.objects.all()
    serializer = WordSerializer(words, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def create_word(request):
    word = request.data
    serializer = WordSerializer(data=word)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)
    

class UserViewSet(viewsets.ModelViewSet):
   
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class GroupViewSet(viewsets.ModelViewSet):
  
    queryset = Group.objects.all().order_by('name')
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    """