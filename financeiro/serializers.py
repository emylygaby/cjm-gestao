from rest_framework import serializers
from .models import (
    CategoriaFinanceira, 
    MovimentacaoFinanceira, 
    GastoFixo,
    Parcelamento,
    Notificacao
)


class CategoriaFinanceiraSerializer(serializers.ModelSerializer):
    """Serializer para categorias financeiras"""
    
    class Meta:
        model = CategoriaFinanceira
        fields = ['id', 'nome', 'tipo']
    
    def validate_nome(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("O nome da categoria não pode estar vazio.")
        return value


class MovimentacaoFinanceiraSerializer(serializers.ModelSerializer):
    """Serializer para movimentações financeiras"""
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True, allow_null=True)
    categoria_tipo = serializers.CharField(source='categoria.tipo', read_only=True, allow_null=True)
    orcamento_cliente = serializers.CharField(source='orcamento.cliente.nome', read_only=True, allow_null=True)
    
    class Meta:
        model = MovimentacaoFinanceira
        fields = [
            'id', 'descricao', 'detalhes', 'valor', 'tipo', 'tipo_movimentacao', 'data_movimentacao',
            'categoria', 'categoria_nome', 'categoria_tipo',
            'orcamento', 'orcamento_cliente', 'created_at'
        ]
    
    def validate_valor(self, value):
        if value <= 0:
            raise serializers.ValidationError("O valor deve ser maior que zero.")
        return value
    
    def validate(self, data):
        """Valida compatibilidade entre categoria, tipo de movimentação e tipo (entrada/saída)"""
        categoria = data.get('categoria')
        tipo = data.get('tipo')
        tipo_movimentacao = data.get('tipo_movimentacao', 'COMUM')
        descricao = data.get('descricao', '').strip()
        
        # Se for movimentação comum, descrição é obrigatória
        if tipo_movimentacao == 'COMUM':
            if not descricao:
                raise serializers.ValidationError({
                    'descricao': 'Para movimentações comuns, a descrição é obrigatória.'
                })
            if categoria:
                raise serializers.ValidationError({
                    'categoria': 'Movimentações comuns não devem ter categoria. Deixe este campo vazio.'
                })
        
        # Se for movimentação categorizada, limpa descricao (será gerada automaticamente)
        if tipo_movimentacao == 'CATEGORIZADA':
            # Remove descrição se foi enviada, pois será auto-gerada
            data['descricao'] = ''
        
        # Se for movimentação categorizada, categoria é obrigatória
        if tipo_movimentacao == 'CATEGORIZADA':
            if not categoria:
                raise serializers.ValidationError({
                    'categoria': 'Para movimentações categorizadas (gastos fixos), você deve selecionar uma categoria.'
                })
            
            # Valida compatibilidade entre categoria e tipo (entrada/saída)
            if categoria.tipo != tipo:
                raise serializers.ValidationError({
                    'categoria': f'A categoria selecionada é do tipo {categoria.get_tipo_display()}, '
                                f'mas a movimentação é do tipo {dict(MovimentacaoFinanceira.TIPO_CHOICES)[tipo]}.'
                })
        
        return data


class GastoFixoSerializer(serializers.ModelSerializer):
    """Serializer para gastos fixos"""
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    
    class Meta:
        model = GastoFixo
        fields = [
            'id', 'nome', 'valor', 'periodo', 'dia_vencimento',
            'categoria', 'categoria_nome'
        ]
    
    def validate_valor(self, value):
        if value <= 0:
            raise serializers.ValidationError("O valor deve ser maior que zero.")
        return value
    
    def validate_nome(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("O nome do gasto fixo não pode estar vazio.")
        return value
    
    def validate_dia_vencimento(self, value):
        periodo = self.initial_data.get('periodo')
        
        if periodo == 'MENSAL':
            if value < 1 or value > 31:
                raise serializers.ValidationError("Para gastos mensais, o dia deve estar entre 1 e 31.")
        elif periodo == 'SEMANAL':
            if value < 1 or value > 7:
                raise serializers.ValidationError("Para gastos semanais, o dia deve estar entre 1 (segunda) e 7 (domingo).")
        elif periodo == 'ANUAL':
            if value < 1 or value > 365:
                raise serializers.ValidationError("Para gastos anuais, o dia deve estar entre 1 e 365.")
        
        return value
    
    def validate(self, data):
        """Valida que a categoria seja do tipo SAIDA"""
        categoria = data.get('categoria')
        
        if categoria and categoria.tipo != 'SAIDA':
            raise serializers.ValidationError({
                'categoria': 'Gastos fixos devem estar associados a categorias do tipo Saída.'
            })
        
        return data


class ParcelamentoSerializer(serializers.ModelSerializer):
    """Serializer para parcelamentos"""
    movimentacao_descricao = serializers.CharField(source='movimentacao.descricao', read_only=True)
    orcamento_id = serializers.IntegerField(source='movimentacao.orcamento.id', read_only=True, allow_null=True)
    orcamento_cliente = serializers.CharField(source='movimentacao.orcamento.cliente.nome', read_only=True, allow_null=True)
    dias_ate_vencimento = serializers.SerializerMethodField()
    proximo_vencimento = serializers.SerializerMethodField()
    
    class Meta:
        model = Parcelamento
        fields = [
            'id', 'movimentacao', 'movimentacao_descricao',
            'orcamento_id', 'orcamento_cliente',
            'numero_parcela', 'total_parcelas', 'valor_parcela',
            'data_vencimento', 'data_pagamento', 'forma_pagamento',
            'status', 'fase_mao_obra', 'observacoes',
            'dias_ate_vencimento', 'proximo_vencimento',
            'created_at', 'updated_at'
        ]
    
    def get_dias_ate_vencimento(self, obj):
        """Retorna dias até o vencimento (negativo se atrasado)"""
        from django.utils import timezone
        return (obj.data_vencimento - timezone.now().date()).days
    
    def get_proximo_vencimento(self, obj):
        """Retorna True se está próximo do vencimento (10 dias)"""
        return obj.esta_proximo_vencimento()


class OrcamentoParcelamentoSerializer(serializers.Serializer):
    """Serializer para criar parcelamentos ao mudar status do orçamento"""
    forma_pagamento = serializers.ChoiceField(choices=Parcelamento.FORMA_PAGAMENTO_CHOICES)
    is_parcelado = serializers.BooleanField()
    numero_parcelas = serializers.IntegerField(required=False, min_value=1, max_value=48)
    valor_entrada = serializers.DecimalField(required=False, max_digits=10, decimal_places=2, min_value=0)
    data_primeiro_vencimento = serializers.DateField()
    fase_mao_obra = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    def validate(self, data):
        if data['is_parcelado']:
            if not data.get('numero_parcelas'):
                raise serializers.ValidationError({
                    'numero_parcelas': 'Número de parcelas é obrigatório quando parcelado'
                })
        return data
