from rest_framework import serializers
from .models import Cliente, Orcamento


class OrcamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Orcamento
        fields = ['id', 'descricao', 'valor', 'data_orcamento', 'status']


class ClienteSerializer(serializers.ModelSerializer):
    orcamentos = OrcamentoSerializer(many=True, read_only=True)
    
    class Meta:
        model = Cliente
        fields = ['id', 'nome', 'telefone', 'endereco', 'created_at', 'updated_at', 'orcamentos']


class ClienteCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ['nome', 'telefone', 'endereco']
        
    def validate_telefone(self, value):
        if not value:
            raise serializers.ValidationError("Telefone é obrigatório.")
        return value


class OrcamentoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Orcamento
        fields = ['cliente', 'descricao', 'valor', 'status']