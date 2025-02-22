from .models import PeriodSetting, PeriodInstance
from datetime import datetime, timedelta
from django.db import transaction
import math

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