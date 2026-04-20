# Generated migration for financeiro app

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('orcamentos', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CategoriaFinanceira',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=100, verbose_name='Nome')),
                ('tipo', models.CharField(choices=[('ENTRADA', 'Entrada'), ('SAIDA', 'Saída')], max_length=10, verbose_name='Tipo')),
            ],
            options={
                'verbose_name': 'Categoria Financeira',
                'verbose_name_plural': 'Categorias Financeiras',
                'ordering': ['nome'],
            },
        ),
        migrations.CreateModel(
            name='GastoFixo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=100, verbose_name='Nome')),
                ('valor', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Valor')),
                ('periodo', models.CharField(choices=[('MENSAL', 'Mensal'), ('SEMANAL', 'Semanal'), ('ANUAL', 'Anual')], max_length=10, verbose_name='Período')),
                ('dia_vencimento', models.IntegerField(verbose_name='Dia do Vencimento')),
                ('categoria', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='gastos_fixos', to='financeiro.categoriafinanceira', verbose_name='Categoria')),
            ],
            options={
                'verbose_name': 'Gasto Fixo',
                'verbose_name_plural': 'Gastos Fixos',
                'ordering': ['nome'],
            },
        ),
        migrations.CreateModel(
            name='MovimentacaoFinanceira',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('descricao', models.CharField(max_length=255, verbose_name='Descrição')),
                ('valor', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Valor')),
                ('tipo', models.CharField(choices=[('ENTRADA', 'Entrada'), ('SAIDA', 'Saída')], max_length=10, verbose_name='Tipo')),
                ('data_movimentacao', models.DateField(verbose_name='Data da Movimentação')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Data de Criação')),
                ('categoria', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='movimentacoes', to='financeiro.categoriafinanceira', verbose_name='Categoria')),
                ('orcamento', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='movimentacoes_financeiras', to='orcamentos.orcamento', verbose_name='Orçamento')),
            ],
            options={
                'verbose_name': 'Movimentação Financeira',
                'verbose_name_plural': 'Movimentações Financeiras',
                'ordering': ['-data_movimentacao', '-created_at'],
            },
        ),
    ]
