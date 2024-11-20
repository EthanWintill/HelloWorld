from django.urls import include, path
from rest_framework import routers


from Study import views, admin

router = routers.DefaultRouter()
#router.register(r'users', views.UserViewSet)
#router.register(r'groups', views.GroupViewSet)

# Wire up our API using automatic URL routing.
# Additionally, we include login URLs for the browsable API.
urlpatterns = [
    path('admin/', admin.admin.site.urls),
    #path('words/', views.get_words),
    #path('words/add/', views.create_word),  # New path for adding a word
    #path('', include(router.urls)),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework'))
]