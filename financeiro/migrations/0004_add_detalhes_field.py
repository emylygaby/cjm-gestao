# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0003_add_tipo_movimentacao'),
    ]

    operations = [
        migrations.AlterField(
            model_name='movimentacaofinanceira',
            name='descricao',
            field=models.CharField(
                blank=True,
                help_text='Gerada automaticamente para gastos categorizados',
                max_length=255,
                verbose_name='Descrição'
            ),
        ),
        migrations.AddField(
            model_name='movimentacaofinanceira',
            name='detalhes',
            field=models.CharField(
                blank=True,
                help_text='Ex: Nome do funcionário para salários, nome do fornecedor, etc.',
                max_length=200,
                null=True,
                verbose_name='Detalhes/Complemento'
            ),
        ),
    ]
