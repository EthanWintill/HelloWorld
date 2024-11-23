from django.urls import include, path
from rest_framework import routers

from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView


from Study import views, admin


router = routers.DefaultRouter()
#router.register(r'users', views.UserViewSet)
#router.register(r'groups', views.GroupViewSet)

# Wire up our API using automatic URL routing.
# Additionally, we include login URLs for the browsable API.
urlpatterns = [
    path('admin/', admin.admin.site.urls),
    path('api/signup/', views.Signup.as_view(), name='signup'),
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
    path('api/user/<int:pk>/', views.UserDetail.as_view(), name='user-detail'),

    
]