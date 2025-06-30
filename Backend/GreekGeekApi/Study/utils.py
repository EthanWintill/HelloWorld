from .models import PeriodSetting, PeriodInstance, Session
from datetime import datetime, timedelta
from django.db import transaction, models
import math
from django.utils import timezone
import json
import requests

def calculate_period_start_date(period_setting, session_time):
    """Calculate the correct period start date for a given session time"""
    start_date = period_setting.start_date
    
    if session_time < start_date:
        return start_date
        
    if period_setting.period_type == "weekly":
        due_day = period_setting.due_day_of_week  # 0-6 (Monday-Sunday)
        current_day = session_time.weekday()  # 0-6 (Monday-Sunday)
        period_start = start_date.weekday()

        first_due_date = period_setting.get_next_due_date()
        if first_due_date > session_time:
            return start_date
        
        current_start = first_due_date
        current_end = period_setting.get_next_due_date(from_date=current_start)

        while current_end < session_time:
            current_start = current_end
            current_end = period_setting.get_next_due_date(from_date=current_start) 
        
        return current_start

        
        
        
        
        
        
    elif period_setting.period_type == "monthly":
        months_passed = (session_time.year - start_date.year) * 12 + (session_time.month - start_date.month)
        new_month = start_date.month + months_passed
        new_year = start_date.year + (new_month - 1) // 12
        new_month = ((new_month - 1) % 12) + 1
        
        return start_date.replace(year=new_year, month=new_month)
        
    elif period_setting.period_type == "custom" and period_setting.custom_days:
        days_since_start = (session_time - start_date).days
        periods_passed = math.floor(days_since_start / period_setting.custom_days)
        return start_date + timedelta(days=periods_passed * period_setting.custom_days)
        
    return start_date

def get_or_create_period_instance(user, session_time):
    """Helper function to get or create appropriate period instance"""
    try:
        period_setting = PeriodSetting.objects.get(org=user.org, is_active=True)
        
        # Try to find an active period instance
        active_instance = PeriodInstance.objects.filter(
            period_setting=period_setting,
            is_active=True
        ).first()
        
        # Check if we need a new instance (no active instance or active instance is outdated)
        needs_new_instance = (
            not active_instance or 
            active_instance.end_date < session_time or 
            active_instance.start_date > session_time
        )
        
        if needs_new_instance:
            with transaction.atomic():
                # Lock only periods for this org's active period setting
                PeriodInstance.objects.select_for_update().filter(
                    period_setting__org=user.org,
                    period_setting__is_active=True
                ).exists()  # Execute the query to acquire the lock
                
                # Double-check if appropriate instance was created while we were processing
                instance = PeriodInstance.objects.filter(
                    period_setting=period_setting,
                    start_date__lte=session_time,
                    end_date__gte=session_time,
                    is_active=True
                ).first()
                
                if not instance:
                    # Calculate the correct start date for this session time
                    start_date = calculate_period_start_date(period_setting, session_time)
                    end_date = period_setting.get_next_due_date(from_date=start_date)
                    
                    if not end_date:
                        raise ValueError("Could not calculate end date for period")
                    
                    # Deactivate only this org's active periods
                    PeriodInstance.objects.filter(
                        period_setting__org=user.org,
                        period_setting__is_active=True,
                        is_active=True
                    ).update(is_active=False)
                    
                    instance = PeriodInstance.objects.create(
                        period_setting=period_setting,
                        start_date=start_date,
                        end_date=end_date,
                        is_active=True
                    )
        else:
            instance = active_instance
        
        return instance
        
    except PeriodSetting.DoesNotExist:
        return None 

def calculate_user_hours(user, period_instance=None):
    """
    Calculate the total hours a user has completed in a given period instance.
    If period_instance is None, calculates total hours across all completed sessions.
    
    Args:
        user: The User object
        period_instance: Optional PeriodInstance object to filter sessions
        
    Returns:
        float: Total hours completed
    """
    # Start with sessions that have hours recorded (completed sessions)
    query = Session.objects.filter(user=user, hours__isnull=False)
    
    # If period instance is provided, filter by it
    if period_instance:
        query = query.filter(period_instance=period_instance)
    
    # Sum the hours
    total_hours = query.aggregate(total=models.Sum('hours'))['total'] or 0.0
    
    return total_hours 

def send_push_notification(token_list, title, body, data=None):
    """
    Utility function to send push notifications to a list of Expo push tokens
    
    Args:
        token_list (list): List of Expo push tokens
        title (str): Notification title
        body (str): Notification body
        data (dict, optional): Additional data to send with the notification
    
    Returns:
        dict: Response from Expo push service
    """
    if not token_list:
        return {"error": "No tokens provided"}
    
    if not isinstance(token_list, list):
        token_list = [token_list]
    
    # Prepare notification payload
    message = {
        'to': token_list,
        'title': title,
        'body': body,
        'sound': 'default',
    }
    
    if data:
        message['data'] = data
    
    try:
        response = requests.post(
            'https://exp.host/--/api/v2/push/send',
            data=json.dumps(message),
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate'
            }
        )
        
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def should_notify_user(user, notification_type):
    """
    Checks if a user should receive a notification of the given type based on their settings.
    notification_type: str, one of 'org_starts_studying', 'user_leaves_zone', 'study_deadline_approaching'
    """
    if notification_type == 'org_starts_studying':
        return getattr(user, 'notify_org_starts_studying', True)
    elif notification_type == 'user_leaves_zone':
        return getattr(user, 'notify_user_leaves_zone', True)
    elif notification_type == 'study_deadline_approaching':
        return getattr(user, 'notify_study_deadline_approaching', True)
    return True

def send_notification_to_users(user_ids, title, body, data=None, notification_type=None):
    """
    Sends notifications to specified users, respecting their notification settings if notification_type is provided.
    """
    from .models import NotificationToken, User
    
    if notification_type:
        users = User.objects.filter(id__in=user_ids)
        filtered_ids = [u.id for u in users if should_notify_user(u, notification_type)]
    else:
        filtered_ids = user_ids
    if not filtered_ids:
        return {"warning": "No valid user IDs provided or no users found with the specified IDs, this could be from notification settings"}
    tokens = NotificationToken.objects.filter(
        user__id__in=filtered_ids,
        is_active=True
    ).values_list('token', flat=True)
    token_list = list(tokens)
    if not token_list:
        return {"error": "No active tokens found for the specified users"}
    return send_push_notification(token_list, title, body, data)


def send_notification_to_org(org_id, title, body, data=None, notification_type=None):
    """
    Sends notifications to all active users in an organization, respecting their notification settings if notification_type is provided.
    """
    from .models import NotificationToken, User
    
    if notification_type:
        users = User.objects.filter(org_id=org_id)
        filtered_ids = [u.id for u in users if should_notify_user(u, notification_type)]
    else:
        filtered_ids = list(User.objects.filter(org_id=org_id).values_list('id', flat=True))

    tokens = NotificationToken.objects.filter(
        user__id__in=filtered_ids,
        is_active=True
    ).values_list('token', flat=True)
    token_list = list(tokens)
    if not token_list:
        return {"error": "No active tokens found for the specified organization"}
    return send_push_notification(token_list, title, body, data)