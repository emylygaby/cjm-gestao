from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, Avg, F, DecimalField, ExpressionWrapper
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from calendar import monthrange

from .models import MovimentacaoFinanceira, Parcelamento
from orcamentos.models import Orcamento, OrcamentoItem
from produtos.models import Produto


def _add_months(base_date, months):
    month_index = (base_date.month - 1) + months
    year = base_date.year + (month_index // 12)
    month = (month_index % 12) + 1
    day = min(base_date.day, monthrange(year, month)[1])
    return base_date.replace(year=year, month=month, day=day)


def _obter_periodo_referencia(request):
    hoje = timezone.now().date()
    mes_param = request.query_params.get('mes') if hasattr(request, 'query_params') else request.GET.get('mes')

    if mes_param:
        try:
            ano, mes = mes_param.split('-')
            ano = int(ano)
            mes = int(mes)
            data_base = datetime(ano, mes, 1).date()
        except (ValueError, TypeError):
            data_base = hoje.replace(day=1)
    else:
        data_base = hoje.replace(day=1)

    primeiro_dia = data_base.replace(day=1)
    ultimo_dia = data_base.replace(day=monthrange(data_base.year, data_base.month)[1])

    return {
        'inicio': primeiro_dia,
        'fim': ultimo_dia,
        'mes': primeiro_dia.strftime('%Y-%m'),
        'label': primeiro_dia.strftime('%m/%Y')
    }


def _eh_orcamento_mao_obra(orcamento):
    if orcamento.tipo_orcamento == 'MAO_OBRA':
        return True

    # Fallback para registros legados/inconsistentes: identifica pelo item de mão de obra.
    for item in orcamento.itens.all():
        if item.produto and item.produto.name and item.produto.name.startswith('Mão de Obra -'):
            return True

    return False


def _calcular_gastos_fixos_projetados(primeiro_dia_mes, ultimo_dia_mes):
    """
    Projeta saídas recorrentes com base em movimentações categorizadas antigas.
    Regra de histórico:
    - aparece no mês se foi criada antes do mês consultado;
    - some do mês atual/futuros quando excluída;
    - permanece em meses já passados quando excluída depois daquele mês.
    """
    movimentacoes_reais_mes = MovimentacaoFinanceira.objects.filter(
        data_movimentacao__gte=primeiro_dia_mes,
        data_movimentacao__lte=ultimo_dia_mes,
        tipo='SAIDA',
        tipo_movimentacao='CATEGORIZADA'
    )

    fim_mes_datetime = timezone.make_aware(
        datetime.combine(ultimo_dia_mes, datetime.max.time())
    )

    recorrentes = MovimentacaoFinanceira.all_objects.filter(
        tipo='SAIDA',
        tipo_movimentacao='CATEGORIZADA',
        data_movimentacao__lt=primeiro_dia_mes
    ).filter(
        Q(deleted_at__isnull=True) | Q(deleted_at__gt=fim_mes_datetime)
    ).select_related('categoria')

    total = Decimal('0.00')
    gastos_adicionados = set()

    for mov in recorrentes:
        categoria_nome = mov.categoria.nome if mov.categoria else 'Sem categoria'
        chave = f"{mov.descricao}_{mov.valor}_{categoria_nome}"

        if chave in gastos_adicionados:
            continue

        duplicado_no_mes = movimentacoes_reais_mes.filter(
            descricao=mov.descricao,
            valor=mov.valor,
            categoria=mov.categoria
        ).exists()

        if not duplicado_no_mes:
            total += mov.valor
            gastos_adicionados.add(chave)

    return total


@api_view(['GET'])
def visao_geral_financeira(request):
    """
    Visão Geral Financeira - O "Respiro" do Negócio
    - Caixa do Mês (Entradas vs. Saídas)
    - Projeção de Faturamento (próximos 3-6 meses)
    - Inadimplência / Valores em Atraso
    """
    try:
        periodo = _obter_periodo_referencia(request)
        primeiro_dia_mes = periodo['inicio']
        ultimo_dia_mes = periodo['fim']
        
        # === CAIXA DO MÊS ===
        movimentacoes_mes = MovimentacaoFinanceira.objects.filter(
            data_movimentacao__gte=primeiro_dia_mes,
            data_movimentacao__lte=ultimo_dia_mes
        )
        
        entradas_mes = movimentacoes_mes.filter(tipo='ENTRADA').aggregate(
            total=Coalesce(Sum('valor'), Decimal('0.00'))
        )['total']
        
        saidas_mes = movimentacoes_mes.filter(tipo='SAIDA').aggregate(
            total=Coalesce(Sum('valor'), Decimal('0.00'))
        )['total']

        # Soma despesas recorrentes projetadas para representar corretamente o mês financeiro.
        saidas_fixas_projetadas = _calcular_gastos_fixos_projetados(primeiro_dia_mes, ultimo_dia_mes)
        saidas_mes = saidas_mes + saidas_fixas_projetadas
        
        saldo_mes = entradas_mes - saidas_mes
        
        # Parcelas pagas no mês (apenas pagas)
        parcelas_pagas_mes = Parcelamento.objects.filter(
            status='PAGO',
            data_pagamento__gte=primeiro_dia_mes,
            data_pagamento__lte=ultimo_dia_mes
        ).aggregate(
            total=Coalesce(Sum('valor_parcela'), Decimal('0.00'))
        )['total']
        
        # === PROJEÇÃO DE FATURAMENTO (próximos 6 meses) ===
        projecao_meses = []
        for i in range(1, 7):
            data_base = _add_months(primeiro_dia_mes, i)
            primeiro_dia = data_base.replace(day=1)
            ultimo_dia = data_base.replace(day=monthrange(data_base.year, data_base.month)[1])
            
            # Soma das parcelas pendentes e pagas previstas para o mês
            receita_prevista = Parcelamento.objects.filter(
                movimentacao__tipo='ENTRADA',
                data_vencimento__gte=primeiro_dia,
                data_vencimento__lte=ultimo_dia,
                status__in=['PENDENTE', 'PAGO']
            ).aggregate(
                total=Coalesce(Sum('valor_parcela'), Decimal('0.00'))
            )['total']
            
            projecao_meses.append({
                'mes': primeiro_dia.strftime('%b/%Y'),
                'ano': primeiro_dia.year,
                'mes_numero': primeiro_dia.month,
                'receita_prevista': float(receita_prevista)
            })
        
        # === INADIMPLÊNCIA / VALORES EM ATRASO ===
        parcelas_atrasadas = Parcelamento.objects.filter(
            status='PENDENTE',
            data_vencimento__lt=primeiro_dia_mes
        )
        
        total_atrasado = parcelas_atrasadas.aggregate(
            total=Coalesce(Sum('valor_parcela'), Decimal('0.00'))
        )['total']
        
        quantidade_atrasadas = parcelas_atrasadas.count()
        
        # Agrupamento por orçamento das parcelas atrasadas
        orcamentos_inadimplentes = []
        orcamentos_com_atraso = parcelas_atrasadas.values('movimentacao__orcamento').distinct()
        
        for orc in orcamentos_com_atraso:
            if orc['movimentacao__orcamento']:
                try:
                    orcamento = Orcamento.objects.get(id=orc['movimentacao__orcamento'])
                    parcelas_orc = parcelas_atrasadas.filter(movimentacao__orcamento=orcamento)
                    total_orc = parcelas_orc.aggregate(total=Sum('valor_parcela'))['total']
                    
                    orcamentos_inadimplentes.append({
                        'orcamento_id': orcamento.id,
                        'cliente_nome': orcamento.cliente.nome,
                        'cliente_telefone': orcamento.cliente.telefone or '',
                        'valor_atrasado': float(total_orc or 0),
                        'quantidade_parcelas': parcelas_orc.count()
                    })
                except Orcamento.DoesNotExist:
                    pass
        
        return Response({
            'periodo_referencia': {
                'mes': periodo['mes'],
                'label': periodo['label'],
                'inicio': primeiro_dia_mes.isoformat(),
                'fim': ultimo_dia_mes.isoformat()
            },
            'caixa_mes': {
                'entradas': float(entradas_mes),
                'saidas': float(saidas_mes),
                'saldo': float(saldo_mes),
                'parcelas_pagas': float(parcelas_pagas_mes),
                'saidas_fixas_projetadas': float(saidas_fixas_projetadas)
            },
            'projecao_faturamento': projecao_meses,
            'inadimplencia': {
                'total_atrasado': float(total_atrasado),
                'quantidade_parcelas': quantidade_atrasadas,
                'orcamentos_inadimplentes': orcamentos_inadimplentes
            }
        })
    except Exception as e:
        # Em caso de erro, retorna valores zerados
        return Response({
            'periodo_referencia': {
                'mes': '',
                'label': '',
                'inicio': '',
                'fim': ''
            },
            'caixa_mes': {
                'entradas': 0.0,
                'saidas': 0.0,
                'saldo': 0.0,
                'parcelas_pagas': 0.0,
                'saidas_fixas_projetadas': 0.0
            },
            'projecao_faturamento': [],
            'inadimplencia': {
                'total_atrasado': 0.0,
                'quantidade_parcelas': 0,
                'orcamentos_inadimplentes': []
            },
            'erro': str(e)
        })


@api_view(['GET'])
def funil_vendas(request):
    """
    Funil de Vendas - A "Saúde" do Negócio
    - Taxa de Conversão de Orçamentos
    - Status dos Orçamentos (Pipeline)
    - Ticket Médio
    """
    try:
        periodo = _obter_periodo_referencia(request)
        primeiro_dia_mes = periodo['inicio']
        ultimo_dia_mes = periodo['fim']
        
        # === TAXA DE CONVERSÃO (últimos 30 dias) ===
        orcamentos_mes = Orcamento.objects.filter(
            data_emissao__gte=primeiro_dia_mes,
            data_emissao__lte=ultimo_dia_mes
        )
        
        total_orcamentos = orcamentos_mes.count()
        orcamentos_aprovados = orcamentos_mes.filter(
            status__in=['APROVADO', 'EM_ANDAMENTO', 'CONCLUIDO']
        ).count()
        
        taxa_conversao = (orcamentos_aprovados / total_orcamentos * 100) if total_orcamentos > 0 else 0
        
        # === PIPELINE DE ORÇAMENTOS (todos os orçamentos ativos) ===
        pipeline = orcamentos_mes.values('status').annotate(
            quantidade=Count('id'),
            valor_total=Coalesce(Sum('valor_total'), Decimal('0.00'))
        )
        
        pipeline_data = []
        for item in pipeline:
            pipeline_data.append({
                'status': item['status'],
                'status_display': dict(Orcamento.STATUS_CHOICES).get(item['status'], item['status']),
                'quantidade': item['quantidade'],
                'valor_total': float(item['valor_total'])
            })
        
        # Totalizadores do pipeline
        total_pipeline = sum(item['quantidade'] for item in pipeline_data)
        valor_total_pipeline = sum(item['valor_total'] for item in pipeline_data)
        
        # === TICKET MÉDIO ===
        orcamentos_aprovados_obj = orcamentos_mes.filter(
            status__in=['APROVADO', 'EM_ANDAMENTO', 'CONCLUIDO']
        )
        
        ticket_medio = orcamentos_aprovados_obj.aggregate(
            media=Avg('valor_total')
        )['media'] or Decimal('0.00')
        
        # Valor total de orçamentos aprovados
        valor_total_aprovados = orcamentos_aprovados_obj.aggregate(
            total=Coalesce(Sum('valor_total'), Decimal('0.00'))
        )['total']
        
        return Response({
            'periodo_referencia': {
                'mes': periodo['mes'],
                'label': periodo['label'],
                'inicio': primeiro_dia_mes.isoformat(),
                'fim': ultimo_dia_mes.isoformat()
            },
            'taxa_conversao': {
                'percentual': round(taxa_conversao, 2),
                'total_orcamentos': total_orcamentos,
                'orcamentos_aprovados': orcamentos_aprovados,
                'orcamentos_rejeitados': total_orcamentos - orcamentos_aprovados
            },
            'pipeline': {
                'status_breakdown': pipeline_data,
                'total_orcamentos': total_pipeline,
                'valor_total': float(valor_total_pipeline)
            },
            'ticket_medio': {
                'valor': float(ticket_medio),
                'quantidade_aprovados': orcamentos_aprovados_obj.count(),
                'valor_total_aprovados': float(valor_total_aprovados)
            }
        })
    except Exception as e:
        return Response({
            'periodo_referencia': {
                'mes': '',
                'label': '',
                'inicio': '',
                'fim': ''
            },
            'taxa_conversao': {
                'percentual': 0.0,
                'total_orcamentos': 0,
                'orcamentos_aprovados': 0,
                'orcamentos_rejeitados': 0
            },
            'pipeline': {
                'status_breakdown': [],
                'total_orcamentos': 0,
                'valor_total': 0.0
            },
            'ticket_medio': {
                'valor': 0.0,
                'quantidade_aprovados': 0,
                'valor_total_aprovados': 0.0
            },
            'erro': str(e)
        })


@api_view(['GET'])
def inteligencia_operacao(request):
    """
    Inteligência de Operação - Onde está o lucro real?
    - Comparativo: Serviço Completo vs. Apenas Mão de Obra
    - Margem de Lucro Estimada vs. Realizada
    - Top 5 Produtos/Serviços Mais Rentáveis
    """
    try:
        periodo = _obter_periodo_referencia(request)
        primeiro_dia_mes = periodo['inicio']
        ultimo_dia_mes = periodo['fim']

        # === COMPARATIVO: SERVIÇO COMPLETO VS MÃO DE OBRA ===
        orcamentos_periodo = Orcamento.objects.filter(
            status__in=['APROVADO', 'EM_ANDAMENTO', 'CONCLUIDO'],
            data_emissao__gte=primeiro_dia_mes,
            data_emissao__lte=ultimo_dia_mes
        ).prefetch_related('itens__produto')

        total_produto = {'valor': Decimal('0.00'), 'custo': Decimal('0.00'), 'lucro': Decimal('0.00')}
        total_mao_obra = {'valor': Decimal('0.00'), 'custo': Decimal('0.00'), 'lucro': Decimal('0.00')}
        quantidade_produto = 0
        quantidade_mao_obra = 0

        for orcamento in orcamentos_periodo:
            if _eh_orcamento_mao_obra(orcamento):
                quantidade_mao_obra += 1
                total_mao_obra['valor'] += orcamento.valor_total
                total_mao_obra['custo'] += orcamento.custo_total
                total_mao_obra['lucro'] += orcamento.lucro_previsto
            else:
                quantidade_produto += 1
                total_produto['valor'] += orcamento.valor_total
                total_produto['custo'] += orcamento.custo_total
                total_produto['lucro'] += orcamento.lucro_previsto

        margem_produto = (
            (total_produto['lucro'] / total_produto['valor'] * 100)
            if total_produto['valor'] > 0 else 0
        )

        margem_mao_obra = (
            (total_mao_obra['lucro'] / total_mao_obra['valor'] * 100)
            if total_mao_obra['valor'] > 0 else 0
        )
        
        # === MARGEM DE LUCRO: ESTIMADA VS REALIZADA ===
        # Lucro total previsto (de todos os orçamentos aprovados)
        lucro_previsto_total = Orcamento.objects.filter(
            status__in=['APROVADO', 'EM_ANDAMENTO', 'CONCLUIDO'],
            data_emissao__gte=primeiro_dia_mes,
            data_emissao__lte=ultimo_dia_mes
        ).aggregate(
            total=Coalesce(Sum('lucro_previsto'), Decimal('0.00'))
        )['total']
        
        # Lucro realizado = Entradas - Saídas (todos os tempos)
        entradas_realizadas = MovimentacaoFinanceira.objects.filter(
            tipo='ENTRADA',
            data_movimentacao__gte=primeiro_dia_mes,
            data_movimentacao__lte=ultimo_dia_mes
        ).aggregate(
            total=Coalesce(Sum('valor'), Decimal('0.00'))
        )['total']
        
        saidas_realizadas = MovimentacaoFinanceira.objects.filter(
            tipo='SAIDA',
            data_movimentacao__gte=primeiro_dia_mes,
            data_movimentacao__lte=ultimo_dia_mes
        ).aggregate(
            total=Coalesce(Sum('valor'), Decimal('0.00'))
        )['total']
        
        lucro_realizado = entradas_realizadas - saidas_realizadas
        
        # === TOP 5 PRODUTOS/SERVIÇOS MAIS RENTÁVEIS ===
        # Calcula manualmente sem F() expressions para evitar problemas
        top_produtos_raw = OrcamentoItem.objects.filter(
            orcamento__status__in=['APROVADO', 'EM_ANDAMENTO', 'CONCLUIDO'],
            orcamento__data_emissao__gte=primeiro_dia_mes,
            orcamento__data_emissao__lte=ultimo_dia_mes
        ).select_related('produto')
        
        # Agrupa por produto
        produtos_dict = {}
        for item in top_produtos_raw:
            produto_id = item.produto.id
            tipo = 'MAO_OBRA' if (
                item.orcamento.tipo_orcamento == 'MAO_OBRA' or
                (item.produto and item.produto.name and item.produto.name.startswith('Mão de Obra -'))
            ) else 'PRODUTO'
            agrupador = f"{item.produto.id}-{tipo}"

            if agrupador not in produtos_dict:
                produtos_dict[agrupador] = {
                    'produto_id': produto_id,
                    'produto_nome': item.produto.name,
                    'is_mao_obra': tipo == 'MAO_OBRA',
                    'quantidade_vendida': 0,
                    'receita_total': Decimal('0.00'),
                    'custo_total': Decimal('0.00'),
                    'lucro_total': Decimal('0.00')
                }
            
            produtos_dict[agrupador]['quantidade_vendida'] += float(item.quantidade)
            produtos_dict[agrupador]['receita_total'] += item.quantidade * item.preco_venda
            produtos_dict[agrupador]['custo_total'] += item.quantidade * item.custo_unitario
            produtos_dict[agrupador]['lucro_total'] += item.quantidade * (item.preco_venda - item.custo_unitario)
        
        # Ordena por lucro e pega top 5
        top_produtos_list = sorted(
            produtos_dict.values(), 
            key=lambda x: x['lucro_total'], 
            reverse=True
        )[:5]
        
        top_produtos_data = []
        for item in top_produtos_list:
            margem = (
                (item['lucro_total'] / item['receita_total'] * 100) 
                if item['receita_total'] > 0 else 0
            )
            
            top_produtos_data.append({
                'produto_id': item['produto_id'],
                'produto_nome': item['produto_nome'],
                'is_mao_obra': item['is_mao_obra'],
                'quantidade_vendida': float(item['quantidade_vendida']),
                'receita_total': float(item['receita_total']),
                'custo_total': float(item['custo_total']),
                'lucro_total': float(item['lucro_total']),
                'margem_percentual': round(float(margem), 2)
            })
        
        return Response({
            'periodo_referencia': {
                'mes': periodo['mes'],
                'label': periodo['label'],
                'inicio': primeiro_dia_mes.isoformat(),
                'fim': ultimo_dia_mes.isoformat()
            },
            'comparativo_tipo_servico': {
                'servico_completo': {
                    'quantidade': quantidade_produto,
                    'valor_total': float(total_produto['valor']),
                    'custo_total': float(total_produto['custo']),
                    'lucro_total': float(total_produto['lucro']),
                    'margem_percentual': round(float(margem_produto), 2)
                },
                'mao_obra': {
                    'quantidade': quantidade_mao_obra,
                    'valor_total': float(total_mao_obra['valor']),
                    'custo_total': float(total_mao_obra['custo']),
                    'lucro_total': float(total_mao_obra['lucro']),
                    'margem_percentual': round(float(margem_mao_obra), 2)
                }
            },
            'margem_lucro': {
                'lucro_previsto': float(lucro_previsto_total),
                'lucro_realizado': float(lucro_realizado),
                'diferenca': float(lucro_realizado - lucro_previsto_total),
                'entradas_realizadas': float(entradas_realizadas),
                'saidas_realizadas': float(saidas_realizadas)
            },
            'top_produtos_rentaveis': top_produtos_data
        })
    except Exception as e:
        import traceback
        print(f"Erro em inteligencia_operacao: {traceback.format_exc()}")
        return Response({
            'periodo_referencia': {
                'mes': '',
                'label': '',
                'inicio': '',
                'fim': ''
            },
            'comparativo_tipo_servico': {
                'servico_completo': {
                    'quantidade': 0,
                    'valor_total': 0.0,
                    'custo_total': 0.0,
                    'lucro_total': 0.0,
                    'margem_percentual': 0.0
                },
                'mao_obra': {
                    'quantidade': 0,
                    'valor_total': 0.0,
                    'custo_total': 0.0,
                    'lucro_total': 0.0,
                    'margem_percentual': 0.0
                }
            },
            'margem_lucro': {
                'lucro_previsto': 0.0,
                'lucro_realizado': 0.0,
                'diferenca': 0.0,
                'entradas_realizadas': 0.0,
                'saidas_realizadas': 0.0
            },
            'top_produtos_rentaveis': [],
            'erro': str(e)
        })


@api_view(['GET'])
def dashboard_completo(request):
    """
    Endpoint que retorna todos os dados do dashboard em uma única chamada
    """
    try:
        # Reutiliza o HttpRequest original para evitar encadear Request do DRF em views @api_view.
        http_request = request._request if hasattr(request, '_request') else request

        periodo = _obter_periodo_referencia(request)

        visao_financeira = visao_geral_financeira(http_request).data
        funil = funil_vendas(http_request).data
        inteligencia = inteligencia_operacao(http_request).data
        
        return Response({
            'periodo_referencia': {
                'mes': periodo['mes'],
                'label': periodo['label'],
                'inicio': periodo['inicio'].isoformat(),
                'fim': periodo['fim'].isoformat()
            },
            'visao_geral_financeira': visao_financeira,
            'funil_vendas': funil,
            'inteligencia_operacao': inteligencia
        })
    except Exception as e:
        import traceback
        print(f"Erro em dashboard_completo: {traceback.format_exc()}")
        return Response({
            'error': 'Erro ao carregar dados do dashboard',
            'details': str(e)
        }, status=500)
