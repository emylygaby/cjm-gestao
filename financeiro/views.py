from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import datetime, timedelta
from .models import CategoriaFinanceira, MovimentacaoFinanceira, GastoFixo, Parcelamento
from .serializers import (
    CategoriaFinanceiraSerializer,
    MovimentacaoFinanceiraSerializer,
    GastoFixoSerializer,
    ParcelamentoSerializer
)


class CategoriaFinanceiraViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar categorias financeiras"""
    queryset = CategoriaFinanceira.objects.all()
    serializer_class = CategoriaFinanceiraSerializer
    
    @action(detail=False, methods=['get'])
    def por_tipo(self, request):
        """Retorna categorias filtradas por tipo (ENTRADA ou SAIDA)"""
        tipo = request.query_params.get('tipo', None)
        
        if tipo:
            if tipo not in ['ENTRADA', 'SAIDA']:
                return Response(
                    {'error': 'Tipo inválido. Use ENTRADA ou SAIDA.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            categorias = self.queryset.filter(tipo=tipo)
        else:
            categorias = self.queryset.all()
        
        serializer = self.get_serializer(categorias, many=True)
        return Response(serializer.data)


class MovimentacaoFinanceiraViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar movimentações financeiras"""
    queryset = MovimentacaoFinanceira.objects.all()
    serializer_class = MovimentacaoFinanceiraSerializer
    
    @action(detail=True, methods=['delete'])
    def soft_delete(self, request, pk=None):
        """Endpoint para realizar soft delete de uma movimentação"""
        movimentacao = self.get_object()
        movimentacao.delete()  # Fará soft delete
        return Response({'message': 'Movimentação excluída com sucesso'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Endpoint para restaurar uma movimentação excluída"""
        try:
            # Busca incluindo registros excluídos
            movimentacao = MovimentacaoFinanceira.all_objects.get(pk=pk)
            if not movimentacao.deleted_at:
                return Response({'error': 'Movimentação não está excluída'}, status=status.HTTP_400_BAD_REQUEST)
            
            movimentacao.restore()
            serializer = self.get_serializer(movimentacao)
            return Response({'message': 'Movimentação restaurada com sucesso', 'movimentacao': serializer.data}, status=status.HTTP_200_OK)
        except MovimentacaoFinanceira.DoesNotExist:
            return Response({'error': 'Movimentação não encontrada'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def deleted(self, request):
        """Endpoint para listar movimentações excluídas"""
        movimentacoes_excluidas = MovimentacaoFinanceira.all_objects.only_deleted()
        serializer = self.get_serializer(movimentacoes_excluidas, many=True)
        return Response(serializer.data)
    
    def get_queryset(self):
        """Permite filtrar movimentações por período e tipo"""
        queryset = MovimentacaoFinanceira.objects.all()
        
        # Filtro por data inicial
        data_inicio = self.request.query_params.get('data_inicio', None)
        if data_inicio:
            queryset = queryset.filter(data_movimentacao__gte=data_inicio)
        
        # Filtro por data final
        data_fim = self.request.query_params.get('data_fim', None)
        if data_fim:
            queryset = queryset.filter(data_movimentacao__lte=data_fim)
        
        # Filtro por tipo
        tipo = self.request.query_params.get('tipo', None)
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        
        # Filtro por categoria
        categoria_id = self.request.query_params.get('categoria', None)
        if categoria_id:
            queryset = queryset.filter(categoria_id=categoria_id)
        
        # Filtro por orçamento
        orcamento_id = self.request.query_params.get('orcamento', None)
        if orcamento_id:
            queryset = queryset.filter(orcamento_id=orcamento_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def resumo_mensal(self, request):
        """Retorna resumo financeiro do mês atual"""
        ano = request.query_params.get('ano', None)
        mes = request.query_params.get('mes', None)
        
        if not ano or not mes:
            hoje = timezone.now()
            ano = hoje.year
            mes = hoje.month
        else:
            ano = int(ano)
            mes = int(mes)
        
        # Filtra movimentações do mês
        movimentacoes = MovimentacaoFinanceira.objects.filter(
            data_movimentacao__year=ano,
            data_movimentacao__month=mes
        )
        
        # Calcula totais
        entradas = movimentacoes.filter(tipo='ENTRADA').aggregate(total=Sum('valor'))['total'] or 0
        saidas = movimentacoes.filter(tipo='SAIDA').aggregate(total=Sum('valor'))['total'] or 0
        saldo = entradas - saidas
        
        # Agrupa por categoria
        categorias_resumo = []
        categorias = CategoriaFinanceira.objects.all()
        
        for categoria in categorias:
            movs_categoria = movimentacoes.filter(categoria=categoria)
            total_categoria = movs_categoria.aggregate(total=Sum('valor'))['total'] or 0
            
            if total_categoria > 0:
                categorias_resumo.append({
                    'categoria_id': categoria.id,
                    'categoria_nome': categoria.nome,
                    'categoria_tipo': categoria.tipo,
                    'total': float(total_categoria),
                    'quantidade': movs_categoria.count()
                })
        
        return Response({
            'ano': ano,
            'mes': mes,
            'total_entradas': float(entradas),
            'total_saidas': float(saidas),
            'saldo': float(saldo),
            'categorias': categorias_resumo
        })
    
    @action(detail=False, methods=['get'])
    def relatorio_periodo(self, request):
        """Retorna relatório detalhado de um período"""
        data_inicio = request.query_params.get('data_inicio', None)
        data_fim = request.query_params.get('data_fim', None)
        
        if not data_inicio or not data_fim:
            return Response(
                {'error': 'data_inicio e data_fim são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        movimentacoes = MovimentacaoFinanceira.objects.filter(
            data_movimentacao__gte=data_inicio,
            data_movimentacao__lte=data_fim
        )
        
        entradas = movimentacoes.filter(tipo='ENTRADA').aggregate(total=Sum('valor'))['total'] or 0
        saidas = movimentacoes.filter(tipo='SAIDA').aggregate(total=Sum('valor'))['total'] or 0
        saldo = entradas - saidas
        
        serializer = self.get_serializer(movimentacoes, many=True)
        
        return Response({
            'periodo': {
                'data_inicio': data_inicio,
                'data_fim': data_fim
            },
            'resumo': {
                'total_entradas': float(entradas),
                'total_saidas': float(saidas),
                'saldo': float(saldo),
                'quantidade_movimentacoes': movimentacoes.count()
            },
            'movimentacoes': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def previsao_mes(self, request):
        """Retorna previsão financeira do mês incluindo movimentações reais, parcelamentos e gastos fixos"""
        from calendar import monthrange
        
        ano = request.query_params.get('ano', None)
        mes = request.query_params.get('mes', None)
        
        if not ano or not mes:
            hoje = timezone.now()
            ano = hoje.year
            mes = hoje.month
        else:
            ano = int(ano)
            mes = int(mes)
        
        # Data inicial e final do mês
        primeiro_dia = datetime(ano, mes, 1).date()
        ultimo_dia_num = monthrange(ano, mes)[1]
        ultimo_dia = datetime(ano, mes, ultimo_dia_num).date()
        
        # 1. Movimentações reais do mês
        movimentacoes_reais = MovimentacaoFinanceira.objects.filter(
            data_movimentacao__gte=primeiro_dia,
            data_movimentacao__lte=ultimo_dia
        )
        
        # 2. Parcelamentos do mês (pendentes ou pagos)
        parcelamentos_mes = Parcelamento.objects.filter(
            data_vencimento__gte=primeiro_dia,
            data_vencimento__lte=ultimo_dia
        ).select_related('movimentacao', 'movimentacao__orcamento', 'movimentacao__orcamento__cliente')
        
        # 3. Gastos fixos mensais projetados (da tabela GastoFixo)
        gastos_fixos_mensais = GastoFixo.objects.filter(periodo='MENSAL')
        
        # 4. Buscar movimentações categorizadas (gastos fixos) criadas em meses anteriores
        # Estas devem ser projetadas para o mês atual
        # Busca apenas movimentações criadas ANTES do primeiro dia do mês consultado
        # E que NÃO foram excluídas ATÉ o final do mês consultado (lógica de histórico)
        # Se foi excluída DEPOIS do mês consultado ou não foi excluída, deve aparecer
        movimentacoes_categorizadas = MovimentacaoFinanceira.all_objects.filter(
            tipo_movimentacao='CATEGORIZADA',
            tipo='SAIDA',
            data_movimentacao__lt=primeiro_dia  # Criadas antes do mês consultado
        ).filter(
            Q(deleted_at__isnull=True) | Q(deleted_at__gt=ultimo_dia)
            # deleted_at IS NULL (não foi excluída) OU deleted_at > ultimo_dia (foi excluída DEPOIS deste mês)
        ).select_related('categoria').order_by('created_at')
        
        # Serializa as movimentações reais
        movimentacoes_serializer = self.get_serializer(movimentacoes_reais, many=True)
        
        # Prepara lista de parcelamentos
        parcelamentos_lista = []
        total_parcelamentos_entrada = 0
        total_parcelamentos_saida = 0
        
        for parcela in parcelamentos_mes:
            parcela_info = {
                'id': f"parcela_{parcela.id}",
                'tipo': 'PARCELAMENTO',
                'descricao': f"Parcela {parcela.numero_parcela}/{parcela.total_parcelas} - {parcela.movimentacao.descricao}",
                'valor': float(parcela.valor_parcela),
                'data_vencimento': parcela.data_vencimento,
                'status': parcela.status,
                'forma_pagamento': parcela.get_forma_pagamento_display(),
                'orcamento_id': parcela.movimentacao.orcamento_id if parcela.movimentacao.orcamento else None,
                'cliente': parcela.movimentacao.orcamento.cliente.nome if parcela.movimentacao.orcamento else None,
                'pago': parcela.status == 'PAGO',
                'fase_mao_obra': parcela.fase_mao_obra
            }
            parcelamentos_lista.append(parcela_info)
            
            # Contabiliza nos totais
            if parcela.movimentacao.tipo == 'ENTRADA':
                total_parcelamentos_entrada += parcela.valor_parcela
            else:
                total_parcelamentos_saida += parcela.valor_parcela
        
        # Prepara lista de gastos fixos
        gastos_fixos_lista = []
        total_gastos_fixos = 0
        
        # Adiciona gastos fixos da tabela GastoFixo
        for gasto in gastos_fixos_mensais:
            gasto_info = {
                'id': f"gasto_fixo_{gasto.id}",
                'tipo': 'GASTO_FIXO',
                'descricao': gasto.nome,
                'valor': float(gasto.valor),
                'data_vencimento': datetime(ano, mes, min(gasto.dia_vencimento, ultimo_dia_num)).date(),
                'categoria': gasto.categoria.nome,
                'periodo': gasto.get_periodo_display()
            }
            gastos_fixos_lista.append(gasto_info)
            total_gastos_fixos += gasto.valor
        
        # Adiciona movimentações categorizadas (gastos fixos recorrentes)
        # Para cada movimentação categorizada, verifica se deve ser projetada para este mês
        gastos_adicionados = set()  # Para evitar duplicatas
        
        for mov_cat in movimentacoes_categorizadas:
            # Cria uma chave única para este gasto (descrição + valor + categoria)
            categoria_nome = mov_cat.categoria.nome if mov_cat.categoria else 'Sem categoria'
            chave_gasto = f"{mov_cat.descricao}_{mov_cat.valor}_{categoria_nome}"
            
            # Verifica se já não foi adicionado
            if chave_gasto in gastos_adicionados:
                continue
            
            # Verifica se já não existe uma movimentação real categorizada igual no mês
            ja_existe = movimentacoes_reais.filter(
                descricao=mov_cat.descricao,
                valor=mov_cat.valor,
                tipo_movimentacao='CATEGORIZADA',
                categoria=mov_cat.categoria
            ).exists()
            
            if not ja_existe:
                # Projeta para o mês consultado, usando o mesmo dia ou último dia do mês
                dia_vencimento = min(mov_cat.data_movimentacao.day, ultimo_dia_num)
                data_projetada = datetime(ano, mes, dia_vencimento).date()
                
                gasto_info = {
                    'id': f"gasto_fixo_cat_{mov_cat.id}",
                    'tipo': 'GASTO_FIXO',
                    'descricao': mov_cat.descricao,
                    'valor': float(mov_cat.valor),
                    'data_vencimento': data_projetada,
                    'categoria': categoria_nome,
                    'periodo': 'Mensal (Recorrente)'
                }
                gastos_fixos_lista.append(gasto_info)
                total_gastos_fixos += mov_cat.valor
                gastos_adicionados.add(chave_gasto)
        
        # Calcula totais das movimentações reais
        entradas_reais = movimentacoes_reais.filter(tipo='ENTRADA').aggregate(total=Sum('valor'))['total'] or 0
        saidas_reais = movimentacoes_reais.filter(tipo='SAIDA').aggregate(total=Sum('valor'))['total'] or 0
        
        # Calcula totais previstos
        total_entradas_previsto = float(entradas_reais) + float(total_parcelamentos_entrada)
        total_saidas_previsto = float(saidas_reais) + float(total_parcelamentos_saida) + float(total_gastos_fixos)
        saldo_previsto = total_entradas_previsto - total_saidas_previsto
        
        return Response({
            'ano': ano,
            'mes': mes,
            'periodo': {
                'inicio': primeiro_dia,
                'fim': ultimo_dia
            },
            'movimentacoes_reais': movimentacoes_serializer.data,
            'parcelamentos': parcelamentos_lista,
            'gastos_fixos': gastos_fixos_lista,
            'resumo': {
                'entradas_reais': float(entradas_reais),
                'saidas_reais': float(saidas_reais),
                'total_entradas_previsto': total_entradas_previsto,
                'total_saidas_previsto': total_saidas_previsto,
                'saldo_previsto': saldo_previsto,
                'quantidade_movimentacoes_reais': movimentacoes_reais.count(),
                'quantidade_parcelamentos': len(parcelamentos_lista),
                'quantidade_gastos_fixos': len(gastos_fixos_lista)
            }
        })


class GastoFixoViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar gastos fixos"""
    queryset = GastoFixo.objects.all()
    serializer_class = GastoFixoSerializer
    
    def get_queryset(self):
        """Permite filtrar gastos fixos por período"""
        queryset = GastoFixo.objects.all()
        
        # Filtro por período
        periodo = self.request.query_params.get('periodo', None)
        if periodo:
            queryset = queryset.filter(periodo=periodo)
        
        # Filtro por categoria
        categoria_id = self.request.query_params.get('categoria', None)
        if categoria_id:
            queryset = queryset.filter(categoria_id=categoria_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def total_mensal(self, request):
        """Retorna o total de gastos fixos mensais"""
        gastos_mensais = GastoFixo.objects.filter(periodo='MENSAL')
        total = gastos_mensais.aggregate(total=Sum('valor'))['total'] or 0
        
        gastos_semanais = GastoFixo.objects.filter(periodo='SEMANAL')
        total_semanal = (gastos_semanais.aggregate(total=Sum('valor'))['total'] or 0) * 4
        
        gastos_anuais = GastoFixo.objects.filter(periodo='ANUAL')
        total_anual = (gastos_anuais.aggregate(total=Sum('valor'))['total'] or 0) / 12
        
        total_geral = total + total_semanal + total_anual
        
        return Response({
            'total_mensal_fixo': float(total),
            'total_semanal_convertido': float(total_semanal),
            'total_anual_convertido': float(total_anual),
            'total_gasto_fixo_mensal': float(total_geral),
            'quantidade_gastos': GastoFixo.objects.count()
        })
    
    @action(detail=True, methods=['post'])
    def gerar_movimentacao(self, request, pk=None):
        """Gera uma movimentação financeira a partir de um gasto fixo"""
        gasto_fixo = self.get_object()
        
        data_movimentacao = request.data.get('data_movimentacao', None)
        if not data_movimentacao:
            data_movimentacao = timezone.now().date()
        
        descricao = request.data.get('descricao', f"{gasto_fixo.nome} - Gasto Fixo")
        
        # Cria a movimentação
        movimentacao = MovimentacaoFinanceira.objects.create(
            descricao=descricao,
            valor=gasto_fixo.valor,
            tipo='SAIDA',
            data_movimentacao=data_movimentacao,
            categoria=gasto_fixo.categoria
        )
        
        serializer = MovimentacaoFinanceiraSerializer(movimentacao)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ParcelamentoViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar parcelamentos"""
    queryset = Parcelamento.objects.all()
    serializer_class = ParcelamentoSerializer
    
    def get_queryset(self):
        """Permite filtrar parcelamentos"""
        queryset = Parcelamento.objects.all()
        
        # Filtro por status
        status_param = self.request.query_params.get('status', None)
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filtro por orçamento
        orcamento_id = self.request.query_params.get('orcamento', None)
        if orcamento_id:
            queryset = queryset.filter(movimentacao__orcamento_id=orcamento_id)
        
        # Filtro por movimentação
        movimentacao_id = self.request.query_params.get('movimentacao', None)
        if movimentacao_id:
            queryset = queryset.filter(movimentacao_id=movimentacao_id)
        
        return queryset.order_by('data_vencimento')
    
    @action(detail=False, methods=['get'])
    def proximos_vencimento(self, request):
        """Retorna parcelamentos com vencimento próximo (10 dias)"""
        dias = int(request.query_params.get('dias', 10))
        data_limite = timezone.now().date() + timedelta(days=dias)
        
        parcelamentos = Parcelamento.objects.filter(
            status='PENDENTE',
            data_vencimento__lte=data_limite
        ).order_by('data_vencimento')
        
        serializer = self.get_serializer(parcelamentos, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def atrasados(self, request):
        """Retorna parcelamentos atrasados"""
        parcelamentos = Parcelamento.objects.filter(
            status='ATRASADO'
        ).order_by('data_vencimento')
        
        serializer = self.get_serializer(parcelamentos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def marcar_pago(self, request, pk=None):
        """Marca um parcelamento como pago"""
        parcelamento = self.get_object()
        
        data_pagamento = request.data.get('data_pagamento', None)
        if data_pagamento:
            data_pagamento = datetime.strptime(data_pagamento, '%Y-%m-%d').date()
        
        parcelamento.marcar_como_pago(data_pagamento)
        
        serializer = self.get_serializer(parcelamento)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def atualizar_status_todos(self, request):
        """Atualiza o status de todos os parcelamentos pendentes"""
        parcelamentos = Parcelamento.objects.filter(status='PENDENTE')
        atualizados = 0
        
        for parcelamento in parcelamentos:
            if parcelamento.atualizar_status():
                atualizados += 1
        
        return Response({
            'message': f'{atualizados} parcelamentos atualizados para status ATRASADO',
            'total_verificados': parcelamentos.count()
        })
