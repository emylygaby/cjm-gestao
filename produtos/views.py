from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import UnidadeMedida, Produto
from .serializers import (
    UnidadeMedidaSerializer,
    ProdutoSerializer,
    ProdutoCreateUpdateSerializer
)


class UnidadeMedidaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para UnidadeMedida - apenas leitura
    As unidades de medida são pré-cadastradas e não podem ser modificadas pelo usuário
    """
    queryset = UnidadeMedida.objects.all()
    serializer_class = UnidadeMedidaSerializer
    pagination_class = None  # Desabilita paginação para listar todas as unidades


class ProdutoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para CRUD completo de Produtos com soft delete
    """
    queryset = Produto.objects.all()
    
    def get_serializer_class(self):
        """Retorna o serializer apropriado baseado na ação"""
        if self.action in ['create', 'update', 'partial_update']:
            return ProdutoCreateUpdateSerializer
        return ProdutoSerializer
    
    def create(self, request, *args, **kwargs):
        """Cria um novo produto"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        produto = serializer.save()
        
        # Retorna os dados completos do produto criado
        response_serializer = ProdutoSerializer(produto)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Atualiza um produto existente"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        produto = serializer.save()
        
        # Retorna os dados completos do produto atualizado
        response_serializer = ProdutoSerializer(produto)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['delete'])
    def soft_delete(self, request, pk=None):
        """Endpoint para realizar soft delete de um produto"""
        produto = self.get_object()
        produto.delete()  # Fará soft delete
        return Response({'message': 'Produto excluído com sucesso'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Endpoint para restaurar um produto excluído"""
        try:
            # Busca incluindo registros excluídos
            produto = Produto.all_objects.get(pk=pk)
            if not produto.is_deleted:
                return Response({'error': 'Produto não está excluído'}, status=status.HTTP_400_BAD_REQUEST)
            
            produto.restore()
            serializer = ProdutoSerializer(produto)
            return Response({'message': 'Produto restaurado com sucesso', 'produto': serializer.data}, status=status.HTTP_200_OK)
        except Produto.DoesNotExist:
            return Response({'error': 'Produto não encontrado'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def deleted(self, request):
        """Endpoint para listar produtos excluídos"""
        produtos_excluidos = Produto.all_objects.only_deleted()
        serializer = ProdutoSerializer(produtos_excluidos, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def baixo_estoque(self, request):
        """Retorna produtos com estoque baixo (menor que 10 unidades)"""
        produtos_baixo_estoque = self.queryset.filter(estoque__lt=10)
        serializer = self.get_serializer(produtos_baixo_estoque, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def atualizar_estoque(self, request, pk=None):
        """Atualiza o estoque de um produto"""
        produto = self.get_object()
        quantidade = request.data.get('quantidade')
        operacao = request.data.get('operacao', 'adicionar')  # adicionar ou remover
        
        if quantidade is None:
            return Response(
                {'erro': 'Quantidade é obrigatória'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            quantidade = float(quantidade)
        except ValueError:
            return Response(
                {'erro': 'Quantidade deve ser um número válido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if operacao == 'adicionar':
            produto.estoque += quantidade
        elif operacao == 'remover':
            if produto.estoque < quantidade:
                return Response(
                    {'erro': 'Estoque insuficiente'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            produto.estoque -= quantidade
        else:
            return Response(
                {'erro': 'Operação inválida. Use "adicionar" ou "remover"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        produto.save()
        serializer = ProdutoSerializer(produto)
        return Response(serializer.data)
