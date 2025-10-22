from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import render
from .models import Cliente, Orcamento
from .serializers import (
    ClienteSerializer, 
    ClienteCreateUpdateSerializer, 
    OrcamentoSerializer,
    OrcamentoCreateSerializer
)

# Create your views here.

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
    
    @action(detail=True, methods=['get'])
    def orcamentos(self, request, pk=None):
        """Endpoint para listar todos os orçamentos de um cliente específico"""
        cliente = self.get_object()
        orcamentos = cliente.orcamentos.all()
        serializer = OrcamentoSerializer(orcamentos, many=True)
        return Response(serializer.data)


class OrcamentoViewSet(viewsets.ModelViewSet):
    queryset = Orcamento.objects.all()
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return OrcamentoCreateSerializer
        return OrcamentoSerializer
