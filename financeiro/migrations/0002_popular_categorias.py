# Generated migration para popular categorias financeiras padrão

from django.db import migrations


def popular_categorias(apps, schema_editor):
    CategoriaFinanceira = apps.get_model('financeiro', 'CategoriaFinanceira')
    
    categorias_entrada = [
        {'nome': 'Vendas', 'tipo': 'ENTRADA'},
        {'nome': 'Prestação de Serviços', 'tipo': 'ENTRADA'},
        {'nome': 'Outras Receitas', 'tipo': 'ENTRADA'},
    ]
    
    categorias_saida = [
        {'nome': 'Salários', 'tipo': 'SAIDA'},
        {'nome': 'Fornecedores', 'tipo': 'SAIDA'},
        {'nome': 'Aluguel', 'tipo': 'SAIDA'},
        {'nome': 'Energia Elétrica', 'tipo': 'SAIDA'},
        {'nome': 'Água', 'tipo': 'SAIDA'},
        {'nome': 'Internet/Telefone', 'tipo': 'SAIDA'},
        {'nome': 'Alimentação', 'tipo': 'SAIDA'},
        {'nome': 'Transporte', 'tipo': 'SAIDA'},
        {'nome': 'Material de Escritório', 'tipo': 'SAIDA'},
        {'nome': 'Impostos e Taxas', 'tipo': 'SAIDA'},
        {'nome': 'Manutenção', 'tipo': 'SAIDA'},
        {'nome': 'Outras Despesas', 'tipo': 'SAIDA'},
    ]
    
    for cat_data in categorias_entrada + categorias_saida:
        CategoriaFinanceira.objects.get_or_create(
            nome=cat_data['nome'],
            tipo=cat_data['tipo']
        )


def remover_categorias(apps, schema_editor):
    CategoriaFinanceira = apps.get_model('financeiro', 'CategoriaFinanceira')
    CategoriaFinanceira.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(popular_categorias, remover_categorias),
    ]
