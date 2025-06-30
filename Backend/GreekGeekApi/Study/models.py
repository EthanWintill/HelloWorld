from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils.timezone import now
from datetime import timedelta
import uuid

# Organization Model
class Org(models.Model):
    name = models.CharField(max_length=255)
    reg_code = models.CharField(max_length=255, unique=True)
    school = models.CharField(max_length=255)
    study_req = models.FloatField(default=2)
    study_goal = models.FloatField(default=4)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.name

# Period Model
class Period(models.Model):
    org = models.ForeignKey(Org, on_delete=models.CASCADE, related_name="periods")
    start = models.DateField()
    end = models.DateField()

    def __str__(self):
        return f"{self.start} - {self.end} for {self.org.name}"
    
from django.db import models
from django.utils.timezone import now
from datetime import timedelta
import uuid

class PeriodSetting(models.Model):
    PERIOD_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('custom', 'Custom')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey('Org', on_delete=models.CASCADE, related_name="period_settings")  # Organization-specific settings
    period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    custom_days = models.PositiveIntegerField(null=True, blank=True, help_text="Days for custom period")
    required_hours = models.FloatField(help_text="Required action hours per period")  # Matches org's study_req
    start_date = models.DateTimeField(default=now)
    due_day_of_week = models.IntegerField(null=True, blank=True, help_text="0=Monday, 6=Sunday for weekly cycles")
    is_active = models.BooleanField(default=True)  # New field

    def get_next_due_date(self, from_date=None):
        """Calculate the next due date based on the period type."""
        from_date = from_date or self.start_date
        if self.period_type == "weekly":
            # Calculate days until next due date
            days_until_due = (self.due_day_of_week - from_date.weekday()) % 7
            # If we're on the due day, add 7 days to get next week
            if days_until_due == 0:
                days_until_due = 7
            return from_date + timedelta(days=days_until_due)
        elif self.period_type == "monthly":
            if from_date.month == 12:
                return from_date.replace(year=from_date.year + 1, month=1)
            else:
                return from_date.replace(month=from_date.month + 1)
        elif self.period_type == "custom" and self.custom_days:
            return from_date + timedelta(days=self.custom_days)
        return None

    def __str__(self):
        return f"{self.org.name} - {self.period_type} period"

class PeriodInstance(models.Model):
    """Each individual period cycle (e.g., 'Week 1 of Jan 2025')"""
    period_setting = models.ForeignKey(PeriodSetting, on_delete=models.CASCADE, related_name="instances")
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.period_setting.period_type} ({self.start_date.date()} - {self.end_date.date()})"


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
    group = models.ForeignKey('Group', on_delete=models.SET_NULL, null=True, blank=True, related_name="users")
    live = models.BooleanField(default=False)
    last_location = models.ForeignKey('Location', on_delete=models.SET_NULL, null=True, blank=True, related_name="users")

    # Notification settings
    notify_org_starts_studying = models.BooleanField(default=True, help_text="Notify when someone in the same org starts studying.")
    notify_user_leaves_zone = models.BooleanField(default=True, help_text="Notify when a user leaves the study zone.")
    notify_study_deadline_approaching = models.BooleanField(default=True, help_text="Notify when a study period deadline is approaching.")

    USERNAME_FIELD = 'email'

    objects = UserManager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                models.functions.Lower("email"),
                name="user_email_ci_uniqueness"
            )
        ]
    
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

    period_instance = models.ForeignKey(PeriodInstance, on_delete=models.CASCADE, related_name="sessions", null=True, blank=True)

    class Meta:
        ordering = ['id']
        
    def __str__(self):
        return f"Session {self.id} by {self.user.first_name} {self.user.last_name}"

# Location Model
class Location(models.Model):
    name = models.CharField(max_length=255)
    org = models.ForeignKey(Org, on_delete=models.CASCADE, related_name="locations")
    gps_lat = models.FloatField()
    gps_long = models.FloatField()
    gps_radius = models.FloatField()  # Radius in meters
    gps_address = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ['org']

    def __str__(self):
        return f"{self.name} ({self.gps_lat}, {self.gps_long})"

# Group Model
class Group(models.Model):
    org = models.ForeignKey(Org, on_delete=models.CASCADE, related_name="groups")
    name = models.CharField(max_length=255)

    class Meta:
        unique_together = ('org', 'name')

    def __str__(self):
        return f"{self.name} of {self.org.name}"

class NotificationToken(models.Model):
    """
    Stores Expo push notification tokens for users
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_tokens')
    token = models.CharField(max_length=255, unique=True)
    device_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'device_id')

    def __str__(self):
        return f"{self.user.username} - {self.token[:10]}..."

class PasswordResetToken(models.Model):
    """
    Stores password reset tokens for users
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        return now() > self.expires_at

    def __str__(self):
        return f"Password reset for {self.user.email} - {self.token[:10]}..."

