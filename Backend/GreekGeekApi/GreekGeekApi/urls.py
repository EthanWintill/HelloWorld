from django.urls import include, path
from rest_framework import routers

from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView


from Study import views, admin, web_views


router = routers.DefaultRouter()
#router.register(r'users', views.UserViewSet)
#router.register(r'groups', views.GroupViewSet)

# Wire up our API using automatic URL routing.
# Additionally, we include login URLs for the browsable API.
urlpatterns = [
    # Web routes
    path('', web_views.landing_page, name='landing-page'),
    path('login/', web_views.login_page, name='login-page'),
    path('register/', web_views.register_page, name='register-page'),
    path('success/', web_views.success_page, name='success-page'),
    path('forgot-password/', web_views.forgot_password_page, name='forgot-password-page'),
    path('reset-password/<str:token>/', web_views.reset_password_page, name='reset-password-page'),
    
    # API routes
    path('admin/', admin.admin.site.urls),
    path('api/signup/', views.Signup.as_view(), name='signup'),
    path('api/org-owner-signup/', views.OrgOwnerSignupView.as_view(), name='org-owner-signup'),
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
    path('api/user/<int:pk>/', views.UserDetail.as_view(), name='user-detail'),
    path('api/orgs/', views.ListOrgs.as_view(), name='list-orgs'),
    path('api/org/<int:pk>/', views.OrgDetail.as_view(), name='org-detail'),
    path('api/org-by-code/', views.GetOrgByCode.as_view(), name='get-org-by-code'),
    path('api/my-org/', views.ModifyOrgDetails.as_view(), name='modify-my-org'),
    path('api/clockin/', views.ClockIn.as_view(), name='clock-in'),
    path('api/clockout/', views.ClockOut.as_view(), name='clock-out'),
    path('api/locations/', views.ListLocations.as_view(), name='location-list'), 
    path('api/locations/create/', views.CreateLocation.as_view(), name='location-create'),
    path('api/location/<int:pk>/modify', views.ModifyLocation.as_view(), name='location-modify'),
    path('api/location/<int:pk>/', views.GetLocation.as_view(), name='location-detail'),
    path('api/dashboard/', views.UserDashboard.as_view(), name='dashboard'),
    path('api/users/<int:pk>/staff-status/', views.ManageStaffStatus.as_view(), name='manage-staff-status'),
    
    # Password reset API routes
    path('api/password-reset/request/', views.PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('api/password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('api/password-reset/validate/<str:token>/', views.PasswordResetTokenValidationView.as_view(), name='password-reset-validate'),
    
    # Period-related URLs
    path('api/period-settings/', views.PeriodSettingViewSet.as_view({'get': 'list', 'post': 'create'}), name='period-settings'),
    path('api/period-settings/<int:pk>/', views.PeriodSettingViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='period-setting-detail'),
    path('api/latest-period/', views.GetLatestPeriodInstance.as_view(), name='latest-period'),
    path('api/deactivate-periods/', views.DeactivateOrgPeriods.as_view(), name='deactivate-periods'),
    path('api/users/<int:user_id>/sessions/', views.UserSessionsView.as_view(), name='user-sessions'),
    
    # Admin session management
    path('api/sessions/<int:pk>/', views.AdminSessionView.as_view(), name='admin-session-detail'),
    
    # Notification endpoints
    path('api/notifications/token/', views.NotificationTokenView.as_view(), name='notification-token'),
    path('api/notifications/send/', views.SendNotificationView.as_view(), name='send-notification'),
    
    # Reports endpoint
    path('api/org-report/', views.OrgReportView.as_view(), name='org-report'),

    # Group management endpoints
    path('api/groups/', views.GroupManagementView.as_view(), name='groups-list-create'),
    path('api/groups/<int:group_id>/', views.GroupManagementView.as_view(), name='group-detail'),

    # Debug endpoint
    path('api/debug/', views.debug, name='debug'),
]