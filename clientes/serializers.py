from rest_framework import serializers
from .models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    is_deleted = serializers.ReadOnlyField()
    total_orcamentos = serializers.SerializerMethodField()
    
    class Meta:
        model = Cliente
        fields = ['id', 'nome', 'cpf_cnpj', 'telefone', 'email', 'endereco', 'observacao', 'created_at', 'updated_at', 'deleted_at', 'is_deleted', 'total_orcamentos']
    
    def get_total_orcamentos(self, obj):
        return obj.orcamentos.count()


class ClienteCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ['nome', 'cpf_cnpj', 'telefone', 'email', 'endereco', 'observacao']
        
    def validate_telefone(self, value):
        if not value:
            raise serializers.ValidationError("Telefone é obrigatório.")
        return value
    
    def validate_cpf_cnpj(self, value):
        if value:
            # Remove caracteres especiais para validação
            cleaned_value = ''.join(filter(str.isdigit, value))
            if len(cleaned_value) not in [11, 14]:
                raise serializers.ValidationError("CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos.")
        return value
    
    def validate_email(self, value):
        if value and not value.strip():
            return None
        return value