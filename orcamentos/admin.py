from django.contrib import admin
from .models import Orcamento, OrcamentoItem


class OrcamentoItemInline(admin.TabularInline):
    model = OrcamentoItem
    extra = 1
    fields = ['produto', 'quantidade', 'preco_venda', 'custo_unitario', 'subtotal']
    readonly_fields = ['subtotal']
    
    def subtotal(self, obj):
        return obj.subtotal if obj.id else 0
    subtotal.short_description = 'Subtotal'


@admin.register(Orcamento)
class OrcamentoAdmin(admin.ModelAdmin):
    list_display = ['id', 'cliente', 'data_emissao', 'data_validade', 'status', 'valor_total', 'lucro_previsto']
    list_filter = ['status', 'data_emissao', 'data_validade']
    search_fields = ['cliente__nome', 'observacoes']
    readonly_fields = ['created_at', 'updated_at', 'valor_total', 'custo_total', 'lucro_previsto']
    inlines = [OrcamentoItemInline]
    
    fieldsets = (
        ('Informações do Cliente', {
            'fields': ('cliente',)
        }),
        ('Datas', {
            'fields': ('data_emissao', 'data_validade')
        }),
        ('Status e Valores', {
            'fields': ('status', 'valor_total', 'custo_total', 'lucro_previsto')
        }),
        ('Observações', {
            'fields': ('observacoes',)
        }),
        ('Auditoria', {
            'fields': ('created_at', 'updated_at', 'deleted_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(OrcamentoItem)
class OrcamentoItemAdmin(admin.ModelAdmin):
    list_display = ['orcamento', 'produto', 'quantidade', 'preco_venda', 'subtotal']
    list_filter = ['orcamento__status']
    search_fields = ['orcamento__cliente__nome', 'produto__name']
    readonly_fields = ['subtotal', 'custo_total', 'lucro_item']

