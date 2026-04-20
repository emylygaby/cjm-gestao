from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import render
from django.http import JsonResponse
from .models import Cliente
from .serializers import (
    ClienteSerializer, 
    ClienteCreateUpdateSerializer
)

# Create your views here.

def home(request):
    """Página inicial da API"""
    return JsonResponse({
        'message': 'CJM System API',
        'version': '1.0.0',
        'endpoints': {
            'clientes': '/api/clientes/',
            'orcamentos': '/api/orcamentos/',
            'admin': '/admin/'
        },
        'status': 'active'
    })

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ClienteCreateUpdateSerializer
        return ClienteSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cliente = serializer.save()
        
        # Retorna os dados completos do cliente criado
        response_serializer = ClienteSerializer(cliente)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        cliente = serializer.save()
        
        # Retorna os dados completos do cliente atualizado
        response_serializer = ClienteSerializer(cliente)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['delete'])
    def soft_delete(self, request, pk=None):
        """Endpoint para realizar soft delete de um cliente"""
        cliente = self.get_object()
        cliente.delete()  # Fará soft delete
        return Response({'message': 'Cliente excluído com sucesso'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Endpoint para restaurar um cliente excluído"""
        try:
            # Busca incluindo registros excluídos
            cliente = Cliente.all_objects.get(pk=pk)
            if not cliente.is_deleted:
                return Response({'error': 'Cliente não está excluído'}, status=status.HTTP_400_BAD_REQUEST)
            
            cliente.restore()
            serializer = ClienteSerializer(cliente)
            return Response({'message': 'Cliente restaurado com sucesso', 'cliente': serializer.data}, status=status.HTTP_200_OK)
        except Cliente.DoesNotExist:
            return Response({'error': 'Cliente não encontrado'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def deleted(self, request):
        """Endpoint para listar clientes excluídos"""
        clientes_excluidos = Cliente.all_objects.only_deleted()
        serializer = ClienteSerializer(clientes_excluidos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def orcamentos(self, request, pk=None):
        """Endpoint para listar orçamentos de um cliente"""
        from orcamentos.serializers import OrcamentoSerializer
        from orcamentos.models import Orcamento
        
        cliente = self.get_object()
        orcamentos = Orcamento.objects.filter(cliente=cliente).order_by('-data_emissao')
        
        # Importa e usa o serializer de Orcamento
        serializer = OrcamentoSerializer(orcamentos, many=True)
        return Response(serializer.data)
