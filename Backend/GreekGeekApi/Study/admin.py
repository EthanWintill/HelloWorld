from django.contrib import admin
from .models import User, Org, Location, Session, PeriodInstance, PeriodSetting, Group

admin.site.register(User)
admin.site.register(Org)
admin.site.register(Location)
admin.site.register(Session)
admin.site.register(PeriodInstance)
admin.site.register(PeriodSetting)
admin.site.register(Group)
# Register your models here.
