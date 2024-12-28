from django.contrib import admin
from .models import User, Org, Location, Session

admin.site.register(User)
admin.site.register(Org)
admin.site.register(Location)
admin.site.register(Session)

# Register your models here.
