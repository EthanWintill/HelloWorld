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
    path('api/signup/', views.Signup.as_view(), name='signup')
    
]