from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteViewSet, OrcamentoViewSet

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet)
router.register(r'orcamentos', OrcamentoViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]