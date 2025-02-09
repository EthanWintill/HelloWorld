from .models import PeriodSetting, PeriodInstance

def get_or_create_period_instance(user, session_time):
    """Helper function to get or create appropriate period instance"""
    try:
        period_setting = PeriodSetting.objects.get(org=user.org, is_active=True)  # Only get active setting
        
        # Try to find an active period instance that contains this time
        instance = PeriodInstance.objects.filter(
            period_setting=period_setting,
            start_date__lte=session_time,
            end_date__gte=session_time,
            is_active=True
        ).first()
        
        if not instance:
            # Create new instance if needed
            start_date = session_time
            end_date = period_setting.get_next_due_date(from_date=session_time)
            
            # Deactivate any existing active periods
            PeriodInstance.objects.filter(
                period_setting=period_setting,
                is_active=True
            ).update(is_active=False)
            
            instance = PeriodInstance.objects.create(
                period_setting=period_setting,
                start_date=start_date,
                end_date=end_date,
                is_active=True
            )
        return instance
    except PeriodSetting.DoesNotExist:
        return None 