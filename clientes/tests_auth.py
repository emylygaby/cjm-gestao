from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase


class AuthAndUserManagementTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='adminuser',
            password='123456',
            is_staff=True,
            is_superuser=True,
        )
        self.common_user = User.objects.create_user(
            username='usuario1',
            password='123456',
            is_staff=False,
        )

    def authenticate_as(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_login_success(self):
        response = self.client.post(
            '/api/auth/login/',
            {'username': 'adminuser', 'password': '123456'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'adminuser')

    def test_me_requires_authentication(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_common_user_cannot_access_user_management(self):
        self.authenticate_as(self.common_user)

        response = self.client.get('/api/auth/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_user(self):
        self.authenticate_as(self.admin_user)

        response = self.client.post(
            '/api/auth/users/',
            {
                'username': 'novo123',
                'password': 'abcdef',
                'is_staff': False,
                'is_active': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='novo123').exists())

    def test_username_with_special_character_is_rejected(self):
        self.authenticate_as(self.admin_user)

        response = self.client.post(
            '/api/auth/users/',
            {
                'username': 'joao@123',
                'password': 'abcdef',
                'is_staff': False,
                'is_active': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_password_with_less_than_six_characters_is_rejected(self):
        self.authenticate_as(self.admin_user)

        response = self.client.post(
            '/api/auth/users/',
            {
                'username': 'usuario2',
                'password': '12345',
                'is_staff': False,
                'is_active': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_admin_cannot_delete_himself(self):
        self.authenticate_as(self.admin_user)

        response = self.client.delete(f'/api/auth/users/{self.admin_user.id}/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(id=self.admin_user.id).exists())
