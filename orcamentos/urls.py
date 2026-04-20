from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrcamentoViewSet

router = DefaultRouter()
router.register(r'orcamentos', OrcamentoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
