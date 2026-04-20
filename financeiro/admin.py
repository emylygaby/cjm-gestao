from django.contrib import admin
from .models import CategoriaFinanceira, MovimentacaoFinanceira, GastoFixo

# Register your models here.

@admin.register(CategoriaFinanceira)
class CategoriaFinanceiraAdmin(admin.ModelAdmin):
    list_display = ('nome', 'tipo')
    list_filter = ('tipo',)
    search_fields = ('nome',)


@admin.register(MovimentacaoFinanceira)
class MovimentacaoFinanceiraAdmin(admin.ModelAdmin):
    list_display = ('descricao', 'valor', 'tipo', 'tipo_movimentacao', 'data_movimentacao', 'categoria')
    list_filter = ('tipo', 'tipo_movimentacao', 'data_movimentacao', 'categoria')
    search_fields = ('descricao',)
    date_hierarchy = 'data_movimentacao'


@admin.register(GastoFixo)
class GastoFixoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'valor', 'periodo', 'dia_vencimento', 'categoria')
    list_filter = ('periodo', 'categoria')
    search_fields = ('nome',)
