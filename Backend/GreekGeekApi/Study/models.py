from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager

# Organization Model
class Org(models.Model):
    name = models.CharField(max_length=255)
    reg_code = models.CharField(max_length=255)
    school = models.CharField(max_length=255)
    study_req = models.FloatField()
    study_goal = models.FloatField()

    def __str__(self):
        return self.name

# Period Model
class Period(models.Model):
    org = models.ForeignKey(Org, on_delete=models.CASCADE, related_name="periods")
    start = models.DateField()
    end = models.DateField()

    def __str__(self):
        return f"{self.start} - {self.end} for {self.org.name}"

class UserManager(BaseUserManager):
    def create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("No email provided")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user
    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)
        
# User Model
class User(AbstractBaseUser):
    org = models.ForeignKey(Org, on_delete=models.CASCADE, related_name="users", null=True, blank=True)
    first_name = models.CharField(max_length=255, default='Jon')
    last_name = models.CharField(max_length=255, default='Doe')
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)  # Store hashed password
    phone_number = models.CharField(max_length=20, blank=True, null=True)  # Optional phone number
    group_id = models.IntegerField(null=True, blank=True)  # Assuming this is a separate group identifier
    live = models.BooleanField(default=False)
    last_location = models.ForeignKey('Location', on_delete=models.SET_NULL, null=True, blank=True, related_name="users")

    USERNAME_FIELD = 'email'

    objects = UserManager()
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    def has_module_perms(self, app_label):
        return True
    
    def has_perm(self, perm, obj=None):
        return True
    

# Session Model
class Session(models.Model):
    start_time = models.DateTimeField()  # Timestamp (with second accuracy)
    hours = models.FloatField(null=True, blank=True)  # Optional float for session hours
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    org = models.ForeignKey(Org, on_delete=models.CASCADE, related_name="sessions")
    location = models.ForeignKey('Location', on_delete=models.SET_NULL, null=True, related_name="sessions")
    before_pic = models.CharField(max_length=255, blank=True, null=True)  # Optional picture URL
    after_pic = models.CharField(max_length=255, blank=True, null=True)  # Optional picture URL

    def __str__(self):
        return f"Session {self.id} by {self.user.first_name} {self.user.last_name}"

# Location Model
class Location(models.Model):
    name = models.CharField(max_length=255)
    org = models.ForeignKey(Org, on_delete=models.CASCADE, related_name="locations")
    gps_lat = models.FloatField()
    gps_long = models.FloatField()
    gps_radius = models.FloatField()  # Radius in meters

    def __str__(self):
        return f"{self.name} ({self.gps_lat}, {self.gps_long})"

# Group Model
class Group(models.Model):
    org = models.ForeignKey(Org, on_delete=models.CASCADE, related_name="groups")
    name = models.CharField(max_length=255)

    def __str__(self):
        return f"Group for {self.org.name}"

