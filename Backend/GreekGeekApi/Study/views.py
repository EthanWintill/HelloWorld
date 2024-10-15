from django.contrib.auth.models import Group, User
from rest_framework import permissions, viewsets

from tutorial.quickstart.serializers import GroupSerializer, UserSerializer

from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import Word
from .serializers import WordSerializer

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
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class GroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows groups to be viewed or edited.
    """
    queryset = Group.objects.all().order_by('name')
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]