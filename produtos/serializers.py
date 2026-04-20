from rest_framework import serializers
from .models import UnidadeMedida, Produto
from decimal import Decimal


class UnidadeMedidaSerializer(serializers.ModelSerializer):
    """Serializer para UnidadeMedida"""
    
    class Meta:
        model = UnidadeMedida
        fields = ['id', 'nome', 'simbolo']


class ProdutoSerializer(serializers.ModelSerializer):
    """Serializer completo para leitura de Produto"""
    unimed_nome = serializers.CharField(source='unimed.nome', read_only=True)
    unimed_simbolo = serializers.CharField(source='unimed.simbolo', read_only=True)
    margem_lucro = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_deleted = serializers.ReadOnlyField()
    
    class Meta:
        model = Produto
        fields = [
            'id', 'name', 'descricao', 'unimed', 'unimed_nome', 'unimed_simbolo',
            'estoque', 'custo_unitario', 'preco_venda', 'margem_lucro',
            'created_at', 'updated_at', 'deleted_at', 'is_deleted'
        ]
        read_only_fields = ['created_at', 'updated_at', 'deleted_at', 'margem_lucro']


class ProdutoCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para criação e atualização de Produto"""
    
    class Meta:
        model = Produto
        fields = ['name', 'descricao', 'unimed', 'estoque', 'custo_unitario', 'preco_venda']
    
    def validate_name(self, value):
        """Valida o nome do produto"""
        if not value or not value.strip():
            raise serializers.ValidationError("Nome do produto é obrigatório.")
        return value.strip()
    
    def validate_estoque(self, value):
        """Valida o estoque"""
        if value < 0:
            raise serializers.ValidationError("Estoque não pode ser negativo.")
        return value
    
    def validate_custo_unitario(self, value):
        """Valida o custo unitário"""
        if value < 0:
            raise serializers.ValidationError("Custo unitário não pode ser negativo.")
        return value
    
    def validate_preco_venda(self, value):
        """Valida o preço de venda"""
        if value < 0:
            raise serializers.ValidationError("Preço de venda não pode ser negativo.")
        return value
    
    def validate(self, data):
        """Validação cross-field"""
        custo = data.get('custo_unitario', Decimal('0.00'))
        preco = data.get('preco_venda', Decimal('0.00'))
        
        # Aviso se o preço de venda for menor que o custo (mas não impede o cadastro)
        if preco > 0 and custo > 0 and preco < custo:
            # Não levantamos erro, apenas permitimos o cadastro
            # O sistema pode permitir vendas abaixo do custo
            pass
        
        return data
