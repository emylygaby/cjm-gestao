# Generated manually

from django.db import migrations


def criar_unidades_medida(apps, schema_editor):
    """Popula as unidades de medida padrão"""
    UnidadeMedida = apps.get_model('produtos', 'UnidadeMedida')
    
    unidades = [
        {'nome': 'Unidade', 'simbolo': 'un'},
        {'nome': 'Quilograma', 'simbolo': 'kg'},
        {'nome': 'Grama', 'simbolo': 'g'},
        {'nome': 'Litro', 'simbolo': 'l'},
        {'nome': 'Mililitro', 'simbolo': 'ml'},
        {'nome': 'Metro', 'simbolo': 'm'},
        {'nome': 'Centímetro', 'simbolo': 'cm'},
        {'nome': 'Metro Quadrado', 'simbolo': 'm²'},
        {'nome': 'Metro Cúbico', 'simbolo': 'm³'},
        {'nome': 'Pacote', 'simbolo': 'pct'},
        {'nome': 'Caixa', 'simbolo': 'cx'},
        {'nome': 'Fardo', 'simbolo': 'frd'},
        {'nome': 'Saco', 'simbolo': 'sc'},
        {'nome': 'Peça', 'simbolo': 'pç'},
        {'nome': 'Par', 'simbolo': 'pr'},
        {'nome': 'Dúzia', 'simbolo': 'dz'},
    ]
    
    for unidade in unidades:
        UnidadeMedida.objects.create(**unidade)


def remover_unidades_medida(apps, schema_editor):
    """Remove as unidades de medida criadas (para rollback)"""
    UnidadeMedida = apps.get_model('produtos', 'UnidadeMedida')
    UnidadeMedida.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('produtos', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(criar_unidades_medida, remover_unidades_medida),
    ]
