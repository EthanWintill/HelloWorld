from django.core.management.base import BaseCommand
from django.utils import timezone
from Study.models import PeriodInstance, User
from Study.utils import send_notification_to_users
from datetime import timedelta

class Command(BaseCommand):
    help = 'Sends notifications to users whose study period is ending in 3 days'

    def handle(self, *args, **kwargs):
        # Get current datetime and datetime in 3 days
        today = timezone.now().replace(microsecond=0)
        tomorrow = (today + timedelta(days=1)).replace(microsecond=0)
        
        self.stdout.write(f"Checking for periods ending on {tomorrow}")
        
        # Find all periods ending in 3 days
        ending_periods = PeriodInstance.objects.filter(
            end_date__contains=tomorrow.date()
        )
        
        self.stdout.write(f"Found {ending_periods.count()} periods ending in 3 days")

        # Group by organization to send notifications efficiently
        for period in ending_periods:
            org = period.period_setting.org
            period = period.period_setting
            self.stdout.write(f"\nProcessing period for organization: {org.name}")
            
            # Get all users in this organization
            users = User.objects.filter(
                org=org
            )
            
            if not users.exists():
                self.stdout.write(self.style.WARNING(f"No active users found for {org.name}"))
                continue
                
            self.stdout.write(f"Found {users.count()} active users in {org.name}")

            user_ids = list(users.values_list('id', flat=True))
            
            # Send notification to all users in this org
            self.stdout.write(f"Attempting to send notifications to {len(user_ids)} users...")
            
            notification_result = send_notification_to_users(
                user_ids=user_ids,
                title="Study Period Ending Soon",
                body=f"Your current study period ends in 3 days on {tomorrow.strftime('%B %d, %Y')}. Make sure to complete your study requirements!",
                data={
                    "type": "period_ending",
                    "end_date": tomorrow.isoformat()
                }
            )
            
            self.stdout.write(f"Notification result: {notification_result}")

            self.stdout.write(
                self.style.SUCCESS(f'Successfully sent notifications to {len(user_ids)} users in {period.org.name}')
                if "error" not in notification_result
                else self.style.ERROR(f'Failed to send notifications to users in {period.org.name}: {notification_result["error"]}')
            )