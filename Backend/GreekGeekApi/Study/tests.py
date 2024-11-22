from django.test import TestCase
from .models import Org, User, Group, Location, Session

class SignupTestCase(TestCase):
    def setUp(self):
        self.signup_url = '/api/signup/'
        self.valid_payload = {
            'email': 'test@example.com',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User',
            'phone_number': '1234567890'
        }

    def test_valid_signup(self):
        response = self.client.post(
            self.signup_url,
            data=self.valid_payload,
            format='json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().email, 'test@example.com')

    def test_invalid_email_signup(self):
        invalid_payload = self.valid_payload.copy()
        invalid_payload['email'] = 'invalid-email'
        response = self.client.post(
            self.signup_url,
            data=invalid_payload,
            format='json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), 0)

    def test_duplicate_email_signup(self):
        # Create first user
        self.client.post(
            self.signup_url,
            data=self.valid_payload,
            format='json'
        )
        # Try to create second user with same email
        response = self.client.post(
            self.signup_url,
            data=self.valid_payload,
            format='json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), 1)

    def test_missing_required_fields(self):
        invalid_payload = {
            'email': 'test@example.com'
        }
        response = self.client.post(
            self.signup_url,
            data=invalid_payload,
            format='json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), 0)

class OrganizationTestCase(TestCase):
    
    def setUp(self):
        # Create an organization
        self.org = Org.objects.create(
            name="Test Organization",
            reg_code="12345",
            school="Test School",
            study_req=10.0,
            study_goal=20.0
        )
        
        # Create 3 users for the organization
        self.user1 = User.objects.create(
            org=self.org,
            first_name="John",
            last_name="Doe",
            is_staff=True,
            email="john.doe@example.com",
            password="hashedpassword123",  # This should be hashed password in a real use case
            group_id=1,
            live=True,
            last_location=None  # Or create a location object to assign
        )

        self.user2 = User.objects.create(
            org=self.org,
            first_name="Jane",
            last_name="Smith",
            is_staff=False,
            email="jane.smith@example.com",
            password="hashedpassword456",
            group_id=2,
            live=True,
            last_location=None
        )

        self.user3 = User.objects.create(
            org=self.org,
            first_name="Alice",
            last_name="Johnson",
            is_staff=False,
            email="alice.johnson@example.com",
            password="hashedpassword789",
            group_id=3,
            live=True,
            last_location=None
        )
        
        # Optionally create a group for the organization (if needed)
        self.group = Group.objects.create(org=self.org)

    def test_organization_exists(self):
        """Test that the organization exists in the database"""
        org = Org.objects.get(id=self.org.id)
        self.assertEqual(org.name, "Test Organization")
        self.assertEqual(org.reg_code, "12345")
        self.assertEqual(org.school, "Test School")

    def test_users_exist(self):
        """Test that the users exist and are linked to the organization"""
        user1 = User.objects.get(id=self.user1.id)
        user2 = User.objects.get(id=self.user2.id)
        user3 = User.objects.get(id=self.user3.id)

        # Verify each user
        self.assertEqual(user1.first_name, "John")
        self.assertEqual(user1.last_name, "Doe")
        self.assertEqual(user1.email, "john.doe@example.com")

        self.assertEqual(user2.first_name, "Jane")
        self.assertEqual(user2.last_name, "Smith")
        self.assertEqual(user2.email, "jane.smith@example.com")

        self.assertEqual(user3.first_name, "Alice")
        self.assertEqual(user3.last_name, "Johnson")
        self.assertEqual(user3.email, "alice.johnson@example.com")

        # Verify that all users are associated with the correct organization
        self.assertEqual(user1.org, self.org)
        self.assertEqual(user2.org, self.org)
        self.assertEqual(user3.org, self.org)

    def test_org_and_users_count(self):
        """Test that the correct number of users are associated with the org"""
        users_count = User.objects.filter(org=self.org).count()
        self.assertEqual(users_count, 3)  # Expecting 3 users

    def test_user_group_assignment(self):
        """Test that users are assigned to the correct group_id"""
        self.assertEqual(self.user1.group_id, 1)
        self.assertEqual(self.user2.group_id, 2)
        self.assertEqual(self.user3.group_id, 3)
        
    

    def test_location_exists(self):
        """Test that a location can be created and associated with a user"""
        location = Location.objects.create(
            org=self.org,
            name="Test Location",
            gps_lat=40.7128,
            gps_long=-74.0060,
            gps_radius=100.0
        )
        
        # Assign the location to a user
        self.user1.last_location = location
        self.user1.save()

        # Verify that the location is correctly assigned
        self.assertEqual(self.user1.last_location, location)
        self.assertEqual(self.user1.last_location.name, "Test Location")

