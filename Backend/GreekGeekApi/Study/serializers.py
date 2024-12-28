
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import User, Org, Location

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
        fields = ('id', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'registration_code')

    def create(self, validated_data):
        registration_code = validated_data.pop('registration_code')
        try:
            org = Org.objects.get(reg_code=registration_code)  # Assuming Org has a field `code`
        except Org.DoesNotExist:
            raise serializers.ValidationError("Invalid registration code.")
        

        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            org = org
        )
        return user

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



    


