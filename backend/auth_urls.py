from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .auth_views import UserManagementViewSet, login_view, logout_view, me_view

router = DefaultRouter()
router.register(r'users', UserManagementViewSet, basename='auth-users')

urlpatterns = [
    path('login/', login_view, name='auth-login'),
    path('logout/', logout_view, name='auth-logout'),
    path('me/', me_view, name='auth-me'),
    path('', include(router.urls)),
]
