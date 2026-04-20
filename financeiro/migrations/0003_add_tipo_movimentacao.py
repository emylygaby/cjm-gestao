# Generated migration - Adiciona tipo_movimentacao e torna categoria opcional

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0002_popular_categorias'),
    ]

    operations = [
        # Adiciona o campo tipo_movimentacao
        migrations.AddField(
            model_name='movimentacaofinanceira',
            name='tipo_movimentacao',
            field=models.CharField(
                choices=[('COMUM', 'Movimentação Comum'), ('CATEGORIZADA', 'Gasto Fixo/Categorizado')],
                default='COMUM',
                max_length=15,
                verbose_name='Tipo de Movimentação'
            ),
        ),
        # Torna o campo categoria nullable
        migrations.AlterField(
            model_name='movimentacaofinanceira',
            name='categoria',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='movimentacoes',
                to='financeiro.categoriafinanceira',
                verbose_name='Categoria'
            ),
        ),
    ]
