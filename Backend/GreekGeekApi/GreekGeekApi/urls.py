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
    path('api/orgs/', views.ListOrgs.as_view(), name='list-orgs'),
    path('api/org/<int:pk>/', views.OrgDetail.as_view(), name='org-detail'),
    path('api/clockin/', views.ClockIn.as_view(), name='clock-in'),
    path('api/clockout/', views.ClockOut.as_view(), name='clock-out'),
    path('api/locations/', views.ListLocations.as_view(), name='location-list'), 
    path('api/locations/create/', views.CreateLocation.as_view(), name='location-create'),
    path('api/location/<int:pk>/modify', views.ModifyLocation.as_view(), name='location-modify'),
    path('api/location/<int:pk>/', views.GetLocation.as_view(), name='location-detail')

    
]