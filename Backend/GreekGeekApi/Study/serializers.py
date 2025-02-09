from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import User, Org, Location, Session, PeriodSetting, PeriodInstance
from django.utils import timezone
from .utils import get_or_create_period_instance


class PeriodSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodSetting
        fields = '__all__'

class PeriodInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodInstance
        fields = '__all__'

class LocationSerializer(serializers.ModelSerializer):

    org = serializers.PrimaryKeyRelatedField(queryset=Org.objects.all(), required=False)
    class Meta:
        model = Location
        fields = ('id','name','org','gps_lat','gps_long','gps_radius')

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
class UserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(min_length=8, write_only=True, required=True)
    registration_code = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'registration_code', 'is_staff', 'live')
        read_only_fields = ('is_staff', 'live')

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

class UserDashboardSerializer(serializers.ModelSerializer):
    org = OrgSerializer(read_only=True)
    org_locations = LocationSerializer(source='org.locations', many=True, read_only=True)
    org_users = UserSerializer(source='org.users', many=True, read_only=True)
    user_sessions = SessionSerializer(source='sessions', many=True, read_only=True)
    org_period_instances = serializers.SerializerMethodField()
    active_period_setting = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone_number', 
                 'is_staff', 'live', 'org', 'org_locations', 'org_users', 
                 'user_sessions', 'org_period_instances', 'active_period_setting')

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


