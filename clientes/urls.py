from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteViewSet, home

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]