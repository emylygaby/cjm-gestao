# Generated migration for Parcelamento e Notificacao models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0004_add_detalhes_field'),
    ]

    operations = [
        migrations.CreateModel(
            name='Parcelamento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numero_parcela', models.IntegerField(verbose_name='Número da Parcela')),
                ('total_parcelas', models.IntegerField(verbose_name='Total de Parcelas')),
                ('valor_parcela', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Valor da Parcela')),
                ('data_vencimento', models.DateField(verbose_name='Data de Vencimento')),
                ('data_pagamento', models.DateField(blank=True, null=True, verbose_name='Data de Pagamento')),
                ('forma_pagamento', models.CharField(
                    choices=[
                        ('DINHEIRO', 'Dinheiro'),
                        ('PIX', 'PIX'),
                        ('BOLETO', 'Boleto'),
                        ('CARTAO_CREDITO', 'Cartão de Crédito'),
                        ('CARTAO_DEBITO', 'Cartão de Débito'),
                        ('TRANSFERENCIA', 'Transferência Bancária')
                    ],
                    max_length=20,
                    verbose_name='Forma de Pagamento'
                )),
                ('status', models.CharField(
                    choices=[
                        ('PENDENTE', 'Pendente'),
                        ('PAGO', 'Pago'),
                        ('ATRASADO', 'Atrasado'),
                        ('CANCELADO', 'Cancelado')
                    ],
                    default='PENDENTE',
                    max_length=15,
                    verbose_name='Status'
                )),
                ('fase_mao_obra', models.CharField(
                    blank=True,
                    help_text='Estrutura, Placa ou Acabamento',
                    max_length=20,
                    null=True,
                    verbose_name='Fase da Mão de Obra'
                )),
                ('observacoes', models.TextField(blank=True, null=True, verbose_name='Observações')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Data de Criação')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Última Atualização')),
                ('movimentacao', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='parcelamentos',
                    to='financeiro.movimentacaofinanceira',
                    verbose_name='Movimentação'
                )),
            ],
            options={
                'verbose_name': 'Parcelamento',
                'verbose_name_plural': 'Parcelamentos',
                'ordering': ['data_vencimento', 'numero_parcela'],
            },
        ),
        migrations.CreateModel(
            name='Notificacao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(
                    choices=[
                        ('VENCIMENTO_PROXIMO', 'Vencimento Próximo'),
                        ('VENCIMENTO_HOJE', 'Vence Hoje'),
                        ('ATRASADO', 'Atrasado')
                    ],
                    max_length=20,
                    verbose_name='Tipo'
                )),
                ('mensagem', models.TextField(verbose_name='Mensagem')),
                ('status', models.CharField(
                    choices=[
                        ('NAO_LIDA', 'Não Lida'),
                        ('LIDA', 'Lida'),
                        ('ARQUIVADA', 'Arquivada')
                    ],
                    default='NAO_LIDA',
                    max_length=15,
                    verbose_name='Status'
                )),
                ('data_criacao', models.DateTimeField(auto_now_add=True, verbose_name='Data de Criação')),
                ('data_leitura', models.DateTimeField(blank=True, null=True, verbose_name='Data de Leitura')),
                ('parcelamento', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notificacoes',
                    to='financeiro.parcelamento',
                    verbose_name='Parcelamento'
                )),
            ],
            options={
                'verbose_name': 'Notificação',
                'verbose_name_plural': 'Notificações',
                'ordering': ['-data_criacao'],
            },
        ),
    ]
