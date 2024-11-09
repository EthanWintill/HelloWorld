from django.db import models

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

# User Model
class User(models.Model):
    org = models.ForeignKey(Org, on_delete=models.CASCADE, related_name="users")
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    admin = models.BooleanField(default=False)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)  # Store hashed password
    phone_number = models.CharField(max_length=20, blank=True, null=True)  # Optional phone number
    group_id = models.IntegerField()  # Assuming this is a separate group identifier
    live = models.BooleanField(default=True)
    last_location = models.ForeignKey('Location', on_delete=models.SET_NULL, null=True, related_name="users")
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"

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

