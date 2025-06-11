from django.contrib import admin
from .models import User, Org, Location, Session, PeriodInstance, PeriodSetting, Group

# Override the default admin site to only allow superusers
def superuser_only_has_permission(request):
    """Only allow superusers to access the admin site."""
    return request.user.is_active and request.user.is_superuser

# Monkey patch the admin site
admin.site.has_permission = superuser_only_has_permission

admin.site.register(User)
admin.site.register(Org)
admin.site.register(Location)
admin.site.register(Session)
admin.site.register(PeriodInstance)
admin.site.register(PeriodSetting)
admin.site.register(Group)
