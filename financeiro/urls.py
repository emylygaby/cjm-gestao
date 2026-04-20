from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoriaFinanceiraViewSet, 
    MovimentacaoFinanceiraViewSet, 
    GastoFixoViewSet,
    ParcelamentoViewSet
)
from .dashboard_views import (
    visao_geral_financeira,
    funil_vendas,
    inteligencia_operacao,
    dashboard_completo
)

router = DefaultRouter()
router.register(r'categorias', CategoriaFinanceiraViewSet, basename='categoria')
router.register(r'movimentacoes', MovimentacaoFinanceiraViewSet, basename='movimentacao')
router.register(r'gastos-fixos', GastoFixoViewSet, basename='gasto-fixo')
router.register(r'parcelamentos', ParcelamentoViewSet, basename='parcelamento')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', dashboard_completo, name='dashboard-completo'),
    path('dashboard/visao-geral/', visao_geral_financeira, name='dashboard-visao-geral'),
    path('dashboard/funil-vendas/', funil_vendas, name='dashboard-funil-vendas'),
    path('dashboard/inteligencia/', inteligencia_operacao, name='dashboard-inteligencia'),
]
