from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import User, Org, Location, Session, PeriodSetting, PeriodInstance, NotificationToken, Group
from django.utils import timezone
from .utils import get_or_create_period_instance


class PeriodSettingSerializer(serializers.ModelSerializer):
    org = serializers.PrimaryKeyRelatedField(queryset=Org.objects.all(), required=False)
    
    class Meta:
        model = PeriodSetting
        fields = '__all__'

class PeriodInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodInstance
        fields = '__all__'

class LocationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    org = serializers.PrimaryKeyRelatedField(queryset=Org.objects.all(), required=False)
    class Meta:
        model = Location
        fields = ('id','name','org','gps_lat','gps_long','gps_radius','gps_address')

    def create(self, validated_data):
        
        current_user = self.context['request'].user
        if not current_user.org:
            raise serializers.ValidationError("Not in any valid org.")
        validated_data['org'] = current_user.org
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        current_user = self.context['request'].user
        if not current_user.org:
            raise serializers.ValidationError("Not in any valid org.")
        validated_data['org'] = current_user.org
        return super().update(instance, validated_data)

class UpdateLocationSerializer(LocationSerializer):
    name = serializers.CharField(required=False)
    gps_lat = serializers.FloatField(required=False)
    gps_long = serializers.FloatField(required=False)
    gps_radius = serializers.FloatField(required=False)
    gps_address = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    

class OrgSerializer(serializers.ModelSerializer):
    class Meta:
        model = Org
        fields = '__all__'

class UpdateOrgSerializer(OrgSerializer):
    name = serializers.CharField(required=False)
    reg_code = serializers.CharField(required=False)
    school = serializers.CharField(required=False)
    study_req = serializers.FloatField(required=False)
    study_goal = serializers.FloatField(required=False)

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ('id', 'name', 'org')

class CreateGroupSerializer(serializers.ModelSerializer):
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Group
        fields = ('id', 'name', 'user_ids')
        read_only_fields = ('id',)
    
    def create(self, validated_data):
        user_ids = validated_data.pop('user_ids', [])
        current_user = self.context['request'].user
        
        if not current_user.org:
            raise serializers.ValidationError("Admin must belong to an organization")
        
        # Check if group name already exists in this organization
        if Group.objects.filter(org=current_user.org, name=validated_data['name']).exists():
            raise serializers.ValidationError({"name": "A group with this name already exists in your organization"})
        
        # Create the group
        group = Group.objects.create(
            name=validated_data['name'],
            org=current_user.org
        )
        
        # Assign users to the group
        if user_ids:
            # Verify all users belong to the admin's org
            users = User.objects.filter(id__in=user_ids, org=current_user.org)
            if users.count() != len(user_ids):
                raise serializers.ValidationError("Some users do not belong to your organization")
            
            # Assign users to this group
            users.update(group=group)
        
        return group

class UpdateGroupSerializer(serializers.ModelSerializer):
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Group
        fields = ('id', 'name', 'user_ids')
        read_only_fields = ('id',)
    
    def update(self, instance, validated_data):
        user_ids = validated_data.pop('user_ids', None)
        current_user = self.context['request'].user
        
        # Update group name if provided
        if 'name' in validated_data:
            new_name = validated_data['name']
            # Check if the new name conflicts with existing groups (excluding current instance)
            if Group.objects.filter(
                org=current_user.org, 
                name=new_name
            ).exclude(id=instance.id).exists():
                raise serializers.ValidationError({"name": "A group with this name already exists in your organization"})
            
            instance.name = new_name
            instance.save()
        
        # Update user assignments if provided
        if user_ids is not None:
            # First, remove all users from this group
            User.objects.filter(group=instance).update(group=None)
            
            # Then assign the new users
            if user_ids:
                # Verify all users belong to the admin's org
                users = User.objects.filter(id__in=user_ids, org=current_user.org)
                if users.count() != len(user_ids):
                    raise serializers.ValidationError("Some users do not belong to your organization")
                
                # Assign users to this group
                users.update(group=instance)
        
        return instance

class UserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(min_length=8, write_only=True, required=True)
    registration_code = serializers.CharField(write_only=True, required=True)
    last_location = LocationSerializer(read_only=True)
    notify_org_starts_studying = serializers.BooleanField(required=False)
    notify_user_leaves_zone = serializers.BooleanField(required=False)
    notify_study_deadline_approaching = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'registration_code', 'is_staff', 'live', 'last_location',
                  'notify_org_starts_studying', 'notify_user_leaves_zone', 'notify_study_deadline_approaching')
        read_only_fields = ('is_staff', 'live', 'last_location')

    def create(self, validated_data):
        registration_code = validated_data.pop('registration_code')
        try:
            org = Org.objects.get(reg_code=registration_code)  # Assuming Org has a field `code`
        except Org.DoesNotExist:
            raise serializers.ValidationError("Invalid registration code.")
        try:
            user = User.objects.create_user(
                email=validated_data['email'],
                password=validated_data['password'],
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', ''),
                phone_number=validated_data.get('phone_number', ''),
                org = org
            )
            return user
        except:
            raise serializers.ValidationError("Email already in use.")

    def update(self, instance, validated_data):
        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.phone_number = validated_data.get('phone_number', instance.phone_number)
        
        if 'password' in validated_data:
            instance.set_password(validated_data['password'])
        
        instance.save()
        return instance
    
class UpdateUserSerializer(UserSerializer):
    email = serializers.EmailField(
        required=False,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(min_length=8, write_only=True, required=False)
    registration_code = serializers.CharField(write_only=True, required=False)

class SessionSerializer(serializers.ModelSerializer):
    period_instance = PeriodInstanceSerializer(read_only=True)
    
    class Meta:
        model = Session
        fields = ('id', 'start_time', 'hours', 'user', 'org', 'location', 
                 'before_pic', 'after_pic', 'period_instance')
        read_only_fields = ('id',)

class NotificationTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationToken
        fields = ['id', 'token', 'device_id', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        user = self.context['request'].user
        # Check if token already exists for this user and device
        if 'device_id' in validated_data and validated_data['device_id']:
            existing = NotificationToken.objects.filter(
                user=user, 
                device_id=validated_data['device_id']
            ).first()
            
            if existing:
                # Update existing token
                existing.token = validated_data['token']
                existing.is_active = True
                existing.save()
                return existing
        
        # Create new token
        return NotificationToken.objects.create(user=user, **validated_data)

class UserDashboardSerializer(serializers.ModelSerializer):
    org = OrgSerializer(read_only=True)
    org_locations = LocationSerializer(source='org.locations', many=True, read_only=True)
    org_users = serializers.SerializerMethodField()
    user_sessions = SessionSerializer(source='sessions', many=True, read_only=True)
    org_period_instances = serializers.SerializerMethodField()
    active_period_setting = serializers.SerializerMethodField()
    last_location = LocationSerializer(read_only=True)
    group = GroupSerializer(read_only=True)
    org_groups = serializers.SerializerMethodField()
    total_hours = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone_number', 'group',
                 'is_staff', 'live', 'org', 'org_locations', 'org_users', 
                 'user_sessions', 'org_period_instances', 'active_period_setting',
                 'last_location', 'total_hours',
                 'notify_org_starts_studying', 'notify_user_leaves_zone', 'notify_study_deadline_approaching')
                 'last_location', 'org_groups', 'total_hours')

    def get_org_groups(self, obj):
        if obj.org:
            groups = Group.objects.filter(org=obj.org)
            return GroupSerializer(groups, many=True).data
        return []

    def get_org_users(self, obj):
        from .utils import calculate_user_hours, get_or_create_period_instance
        
        if obj.org:
            users = User.objects.filter(org=obj.org).select_related('group')
            user_data = []
            
            # Get current period instance if available
            current_time = timezone.now()
            period_instance = get_or_create_period_instance(obj, current_time)
            
            for user in users:
                # Get base user data
                serialized_user = UserSerializer(user).data
                
                # Add group information
                if user.group:
                    serialized_user['group'] = GroupSerializer(user.group).data
                else:
                    serialized_user['group'] = None
                
                # Add total hours
                if period_instance:
                    serialized_user['total_hours'] = calculate_user_hours(user, period_instance)
                else:
                    serialized_user['total_hours'] = calculate_user_hours(user)
                
                user_data.append(serialized_user)
                
            return user_data
        return []

    def get_total_hours(self, obj):
        from .utils import calculate_user_hours, get_or_create_period_instance
        
        # Get current period instance if available
        current_time = timezone.now()
        period_instance = get_or_create_period_instance(obj, current_time)
        
        # Calculate hours based on period instance or total if no active period
        if period_instance:
            return calculate_user_hours(obj, period_instance)
        else:
            return calculate_user_hours(obj)

    def get_org_period_instances(self, obj):
        if obj.org:
            # First ensure the current period instance exists
            current_time = timezone.now()
            get_or_create_period_instance(obj, current_time)
            
            # Then get all instances
            instances = PeriodInstance.objects.filter(
                period_setting__org=obj.org
            ).order_by('-start_date')
            return PeriodInstanceSerializer(instances, many=True).data
        return None

    def get_active_period_setting(self, obj):
        if obj.org:
            try:
                setting = PeriodSetting.objects.get(org=obj.org, is_active=True)
                return PeriodSettingSerializer(setting).data
            except PeriodSetting.DoesNotExist:
                return None
        return None

class StaffStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('is_staff',)

class OrgOwnerSignupSerializer(serializers.Serializer):
    """
    Serializer for creating a new organization and its owner user
    """
    # User fields
    first_name = serializers.CharField(max_length=255)
    last_name = serializers.CharField(max_length=255)
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(min_length=8, write_only=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    # Organization fields
    org_name = serializers.CharField(max_length=255)
    school = serializers.CharField(max_length=255)
    reg_code = serializers.CharField(max_length=255)
    
    def validate_reg_code(self, value):
        """Check if registration code is already in use"""
        if Org.objects.filter(reg_code=value).exists():
            raise serializers.ValidationError("Registration code is already in use.")
        return value
    
    def create(self, validated_data):
        """Create both the organization and the owner user"""
        # Extract org data
        org_data = {
            'name': validated_data['org_name'],
            'school': validated_data['school'],
            'reg_code': validated_data['reg_code'],
            'study_req': 2.0,  # Default values
            'study_goal': 4.0,
        }
        
        # Create organization
        org = Org.objects.create(**org_data)
        
        # Extract user data
        user_data = {
            'first_name': validated_data['first_name'],
            'last_name': validated_data['last_name'],
            'email': validated_data['email'],
            'phone_number': validated_data.get('phone_number', ''),
            'org': org,
            'is_staff': True,  # Org owner is staff/admin
        }
        
        # Create user
        user = User.objects.create_user(
            email=user_data['email'],
            password=validated_data['password'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name'],
            phone_number=user_data['phone_number'],
            org=user_data['org']
        )
        user.is_staff = True
        user.save()
        
        return {
            'user': user,
            'org': org
        }


