from django.test import TestCase
from .models import Org, User, Group, Location, Session
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from datetime import datetime, timedelta
from django.utils import timezone


class UserDashboardTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create two organizations
        self.org1 = Org.objects.create(
            name="Test Organization 1",
            reg_code="12345",
            school="Test School 1",
            study_req=10.0,
            study_goal=20.0
        )
        
        self.org2 = Org.objects.create(
            name="Test Organization 2",
            reg_code="67890",
            school="Test School 2",
            study_req=15.0,
            study_goal=25.0
        )
        
        # Create locations for each org
        self.location1_org1 = Location.objects.create(
            name="Location 1 Org1",
            org=self.org1,
            gps_lat=40.0,
            gps_long=75.0,
            gps_radius=10.0
        )
        
        self.location2_org1 = Location.objects.create(
            name="Location 2 Org1",
            org=self.org1,
            gps_lat=41.0,
            gps_long=76.0,
            gps_radius=10.0
        )
        
        self.location_org2 = Location.objects.create(
            name="Location Org2",
            org=self.org2,
            gps_lat=42.0,
            gps_long=77.0,
            gps_radius=10.0
        )
        
        # Create users for each org
        self.user1_org1 = User.objects.create_user(
            email="user1@org1.com",
            password="password123",
            first_name="User1",
            last_name="Org1",
            org=self.org1
        )
        
        self.user2_org1 = User.objects.create_user(
            email="user2@org1.com",
            password="password123",
            first_name="User2",
            last_name="Org1",
            org=self.org1
        )
        
        self.user_org2 = User.objects.create_user(
            email="user@org2.com",
            password="password123",
            first_name="User",
            last_name="Org2",
            org=self.org2
        )
        
        # Create sessions for users
        self.session1_user1 = Session.objects.create(
            start_time=timezone.now() - timedelta(hours=2),
            hours=2.0,
            user=self.user1_org1,
            org=self.org1,
            location=self.location1_org1
        )
        
        self.session2_user1 = Session.objects.create(
            start_time=timezone.now() - timedelta(hours=4),
            hours=1.5,
            user=self.user1_org1,
            org=self.org1,
            location=self.location2_org1
        )
        
        self.session_user2 = Session.objects.create(
            start_time=timezone.now() - timedelta(hours=3),
            hours=3.0,
            user=self.user2_org1,
            org=self.org1,
            location=self.location1_org1
        )
        
        self.session_user_org2 = Session.objects.create(
            start_time=timezone.now() - timedelta(hours=1),
            hours=1.0,
            user=self.user_org2,
            org=self.org2,
            location=self.location_org2
        )

    def test_dashboard_authentication_required(self):
        """Test that unauthenticated users cannot access the dashboard"""
        url = reverse('dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_data_user1(self):
        """Test that user1 gets correct data from their org and only their sessions"""
        self.client.force_authenticate(user=self.user1_org1)
        url = reverse('dashboard')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check org data
        self.assertEqual(response.data['org']['id'], self.org1.id)
        self.assertEqual(response.data['org']['name'], self.org1.name)
        
        # Check locations (should only see org1 locations)
        locations = response.data['org_locations']
        self.assertEqual(len(locations), 2)
        location_names = {loc['name'] for loc in locations}
        self.assertEqual(location_names, {'Location 1 Org1', 'Location 2 Org1'})
        
        # Check users (should only see org1 users)
        users = response.data['org_users']
        self.assertEqual(len(users), 2)
        user_emails = {user['email'] for user in users}
        self.assertEqual(user_emails, {'user1@org1.com', 'user2@org1.com'})
        
        # Check sessions (should only see user1's sessions)
        sessions = response.data['user_sessions']
        self.assertEqual(len(sessions), 2)
        session_hours = {session['hours'] for session in sessions}
        self.assertEqual(session_hours, {2.0, 1.5})

    def test_dashboard_data_user2(self):
        """Test that user2 gets correct data from their org and only their sessions"""
        self.client.force_authenticate(user=self.user2_org1)
        url = reverse('dashboard')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check sessions (should only see user2's session)
        sessions = response.data['user_sessions']
        self.assertEqual(len(sessions), 1)
        self.assertEqual(sessions[0]['hours'], 3.0)

    def test_dashboard_data_org2_user(self):
        """Test that org2 user gets correct data from their org"""
        self.client.force_authenticate(user=self.user_org2)
        url = reverse('dashboard')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check org data
        self.assertEqual(response.data['org']['id'], self.org2.id)
        
        # Check locations (should only see org2 location)
        locations = response.data['org_locations']
        self.assertEqual(len(locations), 1)
        self.assertEqual(locations[0]['name'], 'Location Org2')
        
        # Check users (should only see org2 users)
        users = response.data['org_users']
        self.assertEqual(len(users), 1)
        self.assertEqual(users[0]['email'], 'user@org2.com')
        
        # Check sessions (should only see org2 user's session)
        sessions = response.data['user_sessions']
        self.assertEqual(len(sessions), 1)
        self.assertEqual(sessions[0]['hours'], 1.0)

    def test_dashboard_data_completeness(self):
        """Test that all required fields are present in the response"""
        self.client.force_authenticate(user=self.user1_org1)
        url = reverse('dashboard')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check user data
        self.assertIn('id', response.data)
        self.assertIn('email', response.data)
        self.assertIn('first_name', response.data)
        self.assertIn('last_name', response.data)
        
        # Check org data
        self.assertIn('org', response.data)
        org_data = response.data['org']
        self.assertIn('name', org_data)
        self.assertIn('reg_code', org_data)
        self.assertIn('school', org_data)
        self.assertIn('study_req', org_data)
        self.assertIn('study_goal', org_data)
        
        # Check location data
        self.assertIn('org_locations', response.data)
        if response.data['org_locations']:
            location = response.data['org_locations'][0]
            self.assertIn('name', location)
            self.assertIn('gps_lat', location)
            self.assertIn('gps_long', location)
            self.assertIn('gps_radius', location)
        
        # Check session data
        self.assertIn('user_sessions', response.data)
        if response.data['user_sessions']:
            session = response.data['user_sessions'][0]
            self.assertIn('start_time', session)
            self.assertIn('hours', session)
            self.assertIn('location', session)

class ClockInClockOutTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.inUrl = '/api/clockin/'
        self.outUrl = '/api/clockout/'

        self.org = Org.objects.create(
            name="Test Organization",
            reg_code="12345",
            school="Test School",
            study_req=10.0,
            study_goal=20.0
        )

        self.user = User.objects.create_user(
            email="regular@example.com", 
            password="password123",
            org=self.org
        )

        self.location = Location.objects.create(
            name = "Test Location Org1",
            org = self.org,
            gps_lat = 40.0,
            gps_long = 75.0,
            gps_radius = 10.0
        )

    def test_clock_in_out(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.inUrl, {"location_id":self.location.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Session.objects.count(), 1)

        response = self.client.post(self.inUrl, {"location_id":self.location.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Session.objects.count(), 1)

        response = self.client.post(self.outUrl)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Session.objects.count(), 1)

        response = self.client.post(self.outUrl)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Session.objects.count(), 1)

        response = self.client.post(self.inUrl, {"location_id":self.location.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Session.objects.count(), 2)

        
class LocationCrudTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.locations_url = '/api/locations/'
        self.org1 = Org.objects.create(
            name="Test Organization",
            reg_code="12345",
            school="Test School",
            study_req=10.0,
            study_goal=20.0
        )
        self.org2 = Org.objects.create(
            name="Test Organization 2",
            reg_code="12345a",
            school="Test School",
            study_req=10.0,
            study_goal=20.0
        )
        self.location_data = {
            "name": "Test Location",
            "org": self.org1.id,
            "gps_lat": 40.0,
            "gps_long": 75.0,
            "gps_radius": 10.0,
            "gps_address": "123 Test Street, Test City, TC 12345"
        }
        self.location1_org1 = Location.objects.create(
            name = "Test Location Org1",
            org = self.org1,
            gps_lat = 40.0,
            gps_long = 75.0,
            gps_radius = 10.0
        )
        self.location2_org2 = Location.objects.create(
            name = "Test Location Org2",
            org = self.org2,
            gps_lat = 40.0,
            gps_long = 75.0,
            gps_radius = 10.0
        )

        # Create superuser
        self.staffuser_org1 = User.objects.create_user(
            email="super@example.com",
            password="password123",
            org=self.org1,
            is_staff=True
        )
        
        # Create regular user
        self.regular_user = User.objects.create_user(
            email="regular@example.com", 
            password="password123",
            org=self.org1
        )
        
    def test_create_location_as_staff(self):
        self.client.force_authenticate(user=self.staffuser_org1)
        url = reverse('location-create')
        response = self.client.post(url, self.location_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Location.objects.count(), 3)
        
    def test_create_location_as_user(self):
        self.client.force_authenticate(user=self.regular_user)
        url = reverse('location-create')
        response = self.client.post(url, self.location_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Location.objects.count(), 2)
        
    def test_update_location_as_staff(self):
        self.client.force_authenticate(user=self.staffuser_org1)
        url = reverse('location-modify', args=[self.location1_org1.id])
        data = {
            "name": "Updated Location",
            "org": self.org1.id,
            "gps_lat": 40.0,
            "gps_long": 75.0,
            "gps_radius": 10.0
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.location1_org1.refresh_from_db()
        self.assertEqual(self.location1_org1.name, "Updated Location")
        
    def test_update_location_as_user(self):
        self.client.force_authenticate(user=self.regular_user)
        url = reverse('location-modify', args=[self.location1_org1.id])
        data = {
            "name": "Updated Location",
            "org": self.org1.id,
            "gps_lat": 40.0,
            "gps_long": 75.0,
            "gps_radius": 10.0
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Location.objects.count(), 2)
        
    def test_delete_location_as_staff(self):
        self.client.force_authenticate(user=self.staffuser_org1)
        url = reverse('location-modify', args=[self.location1_org1.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Location.objects.count(), 1)
        
    def test_delete_location_as_user(self):
        self.client.force_authenticate(user=self.regular_user)
        url = reverse('location-modify', args=[self.location1_org1.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Location.objects.count(), 2)
        
    def test_list_locations_as_user(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.locations_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], self.location1_org1.name)
        
    def test_create_location_with_address(self):
        self.client.force_authenticate(user=self.staffuser_org1)
        url = reverse('location-create')
        response = self.client.post(url, self.location_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Location.objects.count(), 3)
        
        # Verify the address was saved
        created_location = Location.objects.get(name="Test Location")
        self.assertEqual(created_location.gps_address, "123 Test Street, Test City, TC 12345")
        
    def test_create_location_without_address(self):
        self.client.force_authenticate(user=self.staffuser_org1)
        url = reverse('location-create')
        location_data_no_address = {
            "name": "Test Location No Address",
            "org": self.org1.id,
            "gps_lat": 41.0,
            "gps_long": 76.0,
            "gps_radius": 15.0
        }
        response = self.client.post(url, location_data_no_address)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the address is None/null
        created_location = Location.objects.get(name="Test Location No Address")
        self.assertIsNone(created_location.gps_address)
        
        
    
    

class OrgCrudTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.orgs_url = '/api/orgs/'
        
        # Create superuser
        self.superuser = User.objects.create_superuser(
            email="super@example.com",
            password="password123"
        )
        
        # Create regular user
        self.regular_user = User.objects.create_user(
            email="regular@example.com", 
            password="password123"
        )
        
        # Create test org data
        self.org_data = {
            "name": "Test Organization",
            "reg_code": "12345",
            "school": "Test School",
            "study_req": 10.0,
            "study_goal": 20.0
        }
        
        # Create an org for update/delete tests
        self.org = Org.objects.create(**self.org_data)
        
    def test_create_org_as_superuser(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.post(self.orgs_url, self.org_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Org.objects.count(), 2)
        
    def test_create_org_as_regular_user(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(self.orgs_url, self.org_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_list_orgs_as_superuser(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(self.orgs_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        
    def test_list_orgs_as_regular_user(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.orgs_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_update_org_as_superuser(self):
        self.client.force_authenticate(user=self.superuser)
        update_data = {"name": "Updated Org Name"}
        response = self.client.patch(f'/api/org/{self.org.id}/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.org.refresh_from_db()
        self.assertEqual(self.org.name, "Updated Org Name")
        
    def test_update_org_as_regular_user(self):
        self.client.force_authenticate(user=self.regular_user)
        update_data = {"name": "Updated Org Name"}
        response = self.client.patch(f'/api/org/{self.org.id}/', update_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_delete_org_as_superuser(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.delete(f'/api/org/{self.org.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Org.objects.count(), 0)
        
    def test_delete_org_as_regular_user(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.delete(f'/api/org/{self.org.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Org.objects.count(), 1)



class UserDetailTestCase(TestCase):
    def setUp(self):
        self.user_detail_url = '/api/user/'
        self.token_url = '/api/token/'
        # Create an organization
        self.org = Org.objects.create(
            name="Test Organization",
            reg_code="12345",
            school="Test School",
            study_req=10.0,
            study_goal=20.0
        )
        
        # Create regular user and staff user
        self.user1 = User.objects.create_user(
            email="user1@example.com",
            password="password123",
            first_name="John",
            last_name="Doe",
            org=self.org
        )
        
        self.user2 = User.objects.create_user(
            email="user2@example.com",
            password="password123",
            first_name="Jane",
            last_name="Doe",
            org=self.org
        )
        
        self.staff_user = User.objects.create_user(
            email="staffuser@example.com",
            password='password123',
            first_name="Admin",
            last_name="User",
            is_staff=True,
            org=self.org
        )
        
        self.other_org = Org.objects.create(
            name="Other Organization",
            reg_code="54321",
            school="Other School",
            study_req=10.0,
            study_goal=20.0
        )
        
        self.user3 = User.objects.create_user(
            email="user3@example.com",
            password="password123",
            first_name="Someone",
            last_name="Else",
            org=self.other_org
        )
        
        # API client to simulate requests
        self.client = APIClient()
        
        # Add staff management URL
        self.staff_management_url = '/api/users/{}/staff-status/'

    def get_token(self, user):
        """Helper function to get JWT token for a user."""
        url = self.token_url
        response = self.client.post(url, {'email': user.email, 'password': 'password123'})
        return response.data['access']

    def test_get_user_details_as_owner(self):
        """Test: Regular user should be able to view their own details."""
        token = self.get_token(self.user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')  # Set the token in the header
        url = reverse('user-detail', args=[self.user1.id])  # Use reverse to construct the URL
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user1.email)
    
    def test_get_user_details_as_staff_in_same_org(self):
        """Test: Staff user should be able to view another user’s details in the same organization."""
        token = self.get_token(self.staff_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = reverse('user-detail', args=[self.user1.id])  # Use reverse here
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user1.email)
    
    def test_get_user_details_as_staff_in_different_org(self):
        """Test: Staff user should NOT be able to view user details in a different organization."""
        token = self.get_token(self.staff_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = reverse('user-detail', args=[self.user3.id])  # Use reverse here
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_user_details_as_non_owner_and_not_staff(self):
        """Test: Regular user should not be able to view another user's details."""
        token = self.get_token(self.user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = reverse('user-detail', args=[self.user2.id])  # Use reverse here
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_user_details_as_owner(self):
        """Test: Regular user should be able to update their own details."""
        token = self.get_token(self.user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = reverse('user-detail', args=[self.user1.id])  # Use reverse here
        data = {'first_name': 'John Updated', 'last_name': 'Doe Updated'}
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.first_name, 'John Updated')

    def test_update_user_details_as_staff_in_same_org(self):
        """Test: Staff user should be able to update another user’s details in the same organization."""
        token = self.get_token(self.staff_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = reverse('user-detail', args=[self.user1.id])  # Use reverse here
        data = {'first_name': 'John Updated By Staff'}
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.first_name, 'John Updated By Staff')

    def test_update_user_details_as_staff_in_different_org(self):
        """Test: Staff user should NOT be able to update user details in a different organization."""
        token = self.get_token(self.staff_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = reverse('user-detail', args=[self.user3.id])  # Use reverse here
        data = {'first_name': 'Someone Updated'}
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_user_details_as_non_owner_and_not_staff(self):
        """Test: Regular user should NOT be able to update another user's details."""
        token = self.get_token(self.user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = reverse('user-detail', args=[self.user2.id])  # Use reverse here
        data = {'first_name': 'Jane Updated'}
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_user_as_admin(self):
        """Test: Admin user should be able to delete a user in the same organization."""
        token = self.get_token(self.staff_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = reverse('user-detail', args=[self.user2.id])  # Use reverse here
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(User.objects.filter(id=self.user2.id).count(), 0)

    def test_delete_user_as_non_admin(self):
        """Test: Regular user should NOT be able to delete another user."""
        token = self.get_token(self.user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = reverse('user-detail', args=[self.user2.id])  # Use reverse here
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_user_as_staff_in_different_org(self):
        """Test: Staff user should NOT be able to delete a user in a different organization."""
        token = self.get_token(self.staff_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = reverse('user-detail', args=[self.user3.id])  # Use reverse here
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_details_includes_staff_status(self):
        """Test: User details response should include is_staff field"""
        token = self.get_token(self.user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = reverse('user-detail', args=[self.user1.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('is_staff', response.data)
        self.assertEqual(response.data['is_staff'], False)

    def test_staff_promotion_by_admin_same_org(self):
        """Test: Admin can promote a user to staff in the same org"""
        token = self.get_token(self.staff_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = self.staff_management_url.format(self.user1.id)
        response = self.client.patch(url, {'is_staff': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertTrue(self.user1.is_staff)

    def test_staff_demotion_by_admin_same_org(self):
        """Test: Admin can demote a staff user in the same org"""
        # First promote a user to staff
        self.user1.is_staff = True
        self.user1.save()
        
        token = self.get_token(self.staff_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = self.staff_management_url.format(self.user1.id)
        response = self.client.patch(url, {'is_staff': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertFalse(self.user1.is_staff)

    def test_staff_promotion_by_admin_different_org(self):
        """Test: Admin cannot promote a user in a different org"""
        token = self.get_token(self.staff_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = self.staff_management_url.format(self.user3.id)
        response = self.client.patch(url, {'is_staff': True}, format='json')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
        self.user3.refresh_from_db()
        self.assertFalse(self.user3.is_staff)

    def test_staff_promotion_by_non_admin(self):
        """Test: Non-admin users cannot promote others to staff"""
        token = self.get_token(self.user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = self.staff_management_url.format(self.user2.id)
        response = self.client.patch(url, {'is_staff': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.user2.refresh_from_db()
        self.assertFalse(self.user2.is_staff)

    def test_admin_cannot_modify_own_staff_status(self):
        """Test: Admin cannot modify their own staff status"""
        token = self.get_token(self.staff_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = self.staff_management_url.format(self.staff_user.id)
        response = self.client.patch(url, {'is_staff': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.staff_user.refresh_from_db()
        self.assertTrue(self.staff_user.is_staff)

    
class SignupTestCase(TestCase):
    def setUp(self):
        self.signup_url = '/api/signup/'
        self.valid_payload = {
            'email': 'test@example.com',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User',
            'phone_number': '1234567890',
            'registration_code': '12345'
        }
        self.org = Org.objects.create(
            name="Test Organization",
            reg_code="12345",
            school="Test School",
            study_req=10.0,
            study_goal=20.0
        )

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

    def test_new_user_not_staff(self):
        """Test that newly registered users are not staff by default"""
        response = self.client.post(
            self.signup_url,
            data=self.valid_payload,
            format='json'
        )
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email=self.valid_payload['email'])
        self.assertFalse(user.is_staff)

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



