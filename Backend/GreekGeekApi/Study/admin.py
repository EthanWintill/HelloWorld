from django.contrib import admin
from .models import User, Org, Location, Session, PeriodInstance, PeriodSetting

admin.site.register(User)
admin.site.register(Org)
admin.site.register(Location)
admin.site.register(Session)
admin.site.register(PeriodInstance)
admin.site.register(PeriodSetting)
# Register your models here.
