from django.contrib import admin
from .models import Cliente, Orcamento

# Register your models here.

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ['nome', 'telefone', 'created_at']
    list_filter = ['created_at']
    search_fields = ['nome', 'telefone']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Orcamento)
class OrcamentoAdmin(admin.ModelAdmin):
    list_display = ['cliente', 'valor', 'status', 'data_orcamento']
    list_filter = ['status', 'data_orcamento']
    search_fields = ['cliente__nome', 'descricao']
    readonly_fields = ['data_orcamento']
