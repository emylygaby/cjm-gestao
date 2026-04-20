# Generated migration for fase_atual field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orcamentos', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='orcamento',
            name='fase_atual',
            field=models.CharField(
                max_length=20,
                null=True,
                blank=True,
                verbose_name='Fase Atual da Mão de Obra',
                help_text='Estrutura, Placa ou Acabamento (apenas para orçamentos de mão de obra)',
                choices=[
                    ('ESTRUTURA', 'Estrutura'),
                    ('PLACA', 'Placa'),
                    ('ACABAMENTO', 'Acabamento'),
                ]
            ),
        ),
        migrations.AddField(
            model_name='orcamento',
            name='tipo_orcamento',
            field=models.CharField(
                max_length=20,
                default='PRODUTO',
                verbose_name='Tipo de Orçamento',
                choices=[
                    ('PRODUTO', 'Orçamento de Produtos'),
                    ('MAO_OBRA', 'Orçamento de Mão de Obra'),
                ]
            ),
        ),
    ]
