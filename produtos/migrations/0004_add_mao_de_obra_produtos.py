# Generated migration for adding Mão de Obra products

from django.db import migrations
from decimal import Decimal


def criar_produtos_mao_de_obra(apps, schema_editor):
    """Cria produtos especiais para orçamentos de mão de obra"""
    Produto = apps.get_model('produtos', 'Produto')
    UnidadeMedida = apps.get_model('produtos', 'UnidadeMedida')
    
    # Busca ou cria a unidade de medida m² (metro quadrado)
    unidade_m2, _ = UnidadeMedida.objects.get_or_create(
        simbolo='m²',
        defaults={'nome': 'Metro Quadrado'}
    )
    
    # Lista de produtos de mão de obra a serem criados
    produtos_mao_obra = [
        {
            'name': 'Mão de Obra - Estrutura',
            'descricao': 'Serviço de estruturação para drywall',
            'unimed': unidade_m2,
            'estoque': Decimal('0.00'),
            'custo_unitario': Decimal('0.00'),
            'preco_venda': Decimal('0.00'),
        },
        {
            'name': 'Mão de Obra - Placa',
            'descricao': 'Serviço de instalação de placas de drywall',
            'unimed': unidade_m2,
            'estoque': Decimal('0.00'),
            'custo_unitario': Decimal('0.00'),
            'preco_venda': Decimal('0.00'),
        },
        {
            'name': 'Mão de Obra - Acabamento',
            'descricao': 'Serviço de acabamento em drywall',
            'unimed': unidade_m2,
            'estoque': Decimal('0.00'),
            'custo_unitario': Decimal('0.00'),
            'preco_venda': Decimal('0.00'),
        },
    ]
    
    # Cria os produtos se não existirem
    for produto_data in produtos_mao_obra:
        Produto.objects.get_or_create(
            name=produto_data['name'],
            defaults=produto_data
        )


def remover_produtos_mao_de_obra(apps, schema_editor):
    """Remove produtos de mão de obra (reversão)"""
    Produto = apps.get_model('produtos', 'Produto')
    
    produtos_names = [
        'Mão de Obra - Estrutura',
        'Mão de Obra - Placa',
        'Mão de Obra - Acabamento',
    ]
    
    Produto.objects.filter(name__in=produtos_names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('produtos', '0003_produto_deleted_at'),
    ]

    operations = [
        migrations.RunPython(criar_produtos_mao_de_obra, remover_produtos_mao_de_obra),
    ]
