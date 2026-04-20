from django.contrib import admin
from .models import UnidadeMedida, Produto


@admin.register(UnidadeMedida)
class UnidadeMedidaAdmin(admin.ModelAdmin):
    list_display = ['id', 'nome', 'simbolo']
    search_fields = ['nome', 'simbolo']
    ordering = ['nome']


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'unimed', 'estoque', 'custo_unitario', 'preco_venda', 'created_at']
    list_filter = ['unimed', 'created_at']
    search_fields = ['name', 'descricao']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'descricao', 'unimed')
        }),
        ('Valores', {
            'fields': ('estoque', 'custo_unitario', 'preco_venda')
        }),
        ('Datas', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
