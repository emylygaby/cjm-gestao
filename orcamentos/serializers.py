from rest_framework import serializers
from .models import Orcamento, OrcamentoItem
from clientes.models import Cliente
from produtos.models import Produto


class OrcamentoItemSerializer(serializers.ModelSerializer):
    """Serializer para itens do orçamento"""
    produto_nome = serializers.CharField(source='produto.name', read_only=True)
    produto_descricao = serializers.CharField(source='produto.descricao', read_only=True)
    produto_unidade = serializers.CharField(source='produto.unimed.simbolo', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    custo_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    lucro_item = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = OrcamentoItem
        fields = [
            'id', 'produto', 'produto_nome', 'produto_descricao', 'produto_unidade',
            'quantidade', 'preco_venda', 'custo_unitario', 
            'subtotal', 'custo_total', 'lucro_item'
        ]
    
    def validate_quantidade(self, value):
        if value <= 0:
            raise serializers.ValidationError("A quantidade deve ser maior que zero.")
        return value
    
    def validate_preco_venda(self, value):
        if value < 0:
            raise serializers.ValidationError("O preço de venda não pode ser negativo.")
        return value
    
    def validate_custo_unitario(self, value):
        if value < 0:
            raise serializers.ValidationError("O custo unitário não pode ser negativo.")
        return value


class OrcamentoSerializer(serializers.ModelSerializer):
    """Serializer completo para leitura de orçamentos"""
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    cliente_telefone = serializers.CharField(source='cliente.telefone', read_only=True)
    cliente_email = serializers.CharField(source='cliente.email', read_only=True)
    cliente_endereco = serializers.CharField(source='cliente.endereco', read_only=True)
    itens = OrcamentoItemSerializer(many=True, read_only=True)
    is_deleted = serializers.ReadOnlyField()
    
    class Meta:
        model = Orcamento
        fields = [
            'id', 'cliente', 'cliente_nome', 'cliente_telefone', 'cliente_email', 
            'cliente_endereco', 'data_emissao', 'data_validade', 'status',
            'tipo_orcamento', 'fase_atual',
            'valor_total', 'custo_total', 'lucro_previsto', 'observacoes',
            'created_at', 'updated_at', 'deleted_at', 'is_deleted', 'itens'
        ]


class OrcamentoCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para criação e atualização de orçamentos"""
    itens = OrcamentoItemSerializer(many=True, required=False)
    
    class Meta:
        model = Orcamento
        fields = [
            'cliente', 'data_emissao', 'data_validade', 'status',
            'tipo_orcamento', 'fase_atual',
            'observacoes', 'itens'
        ]
    
    def validate(self, data):
        """Valida os dados do orçamento"""
        data_emissao = data.get('data_emissao')
        data_validade = data.get('data_validade')
        
        if data_emissao and data_validade:
            if data_validade < data_emissao:
                raise serializers.ValidationError({
                    'data_validade': 'A data de validade deve ser posterior à data de emissão.'
                })
        
        return data
    
    def create(self, validated_data):
        """Cria um orçamento com seus itens"""
        itens_data = validated_data.pop('itens', [])
        orcamento = Orcamento.objects.create(**validated_data)
        
        # Cria os itens do orçamento
        for item_data in itens_data:
            OrcamentoItem.objects.create(orcamento=orcamento, **item_data)
        
        # Calcula os totais
        orcamento.calcular_totais()
        
        return orcamento
    
    def update(self, instance, validated_data):
        """Atualiza um orçamento e seus itens"""
        itens_data = validated_data.pop('itens', None)
        
        # Atualiza os campos do orçamento
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Se foram fornecidos novos itens, remove os antigos e cria os novos
        if itens_data is not None:
            instance.itens.all().delete()
            for item_data in itens_data:
                OrcamentoItem.objects.create(orcamento=instance, **item_data)
        
        # Calcula os totais
        instance.calcular_totais()
        
        return instance


class OrcamentoItemCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para criar/atualizar item individual"""
    
    class Meta:
        model = OrcamentoItem
        fields = ['produto', 'quantidade', 'preco_venda', 'custo_unitario']
    
    def validate_quantidade(self, value):
        if value <= 0:
            raise serializers.ValidationError("A quantidade deve ser maior que zero.")
        return value
