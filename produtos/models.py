from django.db import models
from decimal import Decimal


class SoftDeleteManager(models.Manager):
    """Manager personalizado para filtrar automaticamente registros excluídos"""
    
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class AllObjectsManager(models.Manager):
    """Manager que inclui todos os registros, mesmo os excluídos"""
    
    def get_queryset(self):
        return super().get_queryset()
    
    def only_deleted(self):
        """Retorna apenas os registros excluídos"""
        return self.get_queryset().filter(deleted_at__isnull=False)


class UnidadeMedida(models.Model):
    """Modelo para armazenar as unidades de medida dos produtos"""
    nome = models.CharField(max_length=50, verbose_name="Nome", unique=True)
    simbolo = models.CharField(max_length=10, verbose_name="Símbolo", unique=True)
    
    class Meta:
        verbose_name = "Unidade de Medida"
        verbose_name_plural = "Unidades de Medida"
        ordering = ['nome']
    
    def __str__(self):
        return f"{self.nome} ({self.simbolo})"


class Produto(models.Model):
    """Modelo para armazenar os produtos"""
    name = models.CharField(max_length=200, verbose_name="Nome")
    descricao = models.TextField(verbose_name="Descrição", blank=True, null=True)
    unimed = models.ForeignKey(
        UnidadeMedida, 
        on_delete=models.PROTECT, 
        verbose_name="Unidade de Medida",
        related_name='produtos'
    )
    estoque = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Estoque",
        default=Decimal('0.00')
    )
    custo_unitario = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Custo Unitário",
        default=Decimal('0.00')
    )
    preco_venda = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Preço de Venda",
        default=Decimal('0.00')
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data de Criação")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Data de Atualização")
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="Data de Exclusão")
    
    # Manager padrão que filtra automaticamente registros excluídos
    objects = SoftDeleteManager()
    # Manager que inclui todos os registros
    all_objects = AllObjectsManager()
    
    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def delete(self, using=None, keep_parents=False):
        """Override do método delete para realizar soft delete"""
        from django.utils import timezone
        self.deleted_at = timezone.now()
        self.save(using=using)
    
    def hard_delete(self, using=None, keep_parents=False):
        """Método para exclusão definitiva do banco"""
        super().delete(using=using, keep_parents=keep_parents)
    
    def restore(self):
        """Método para restaurar um registro excluído"""
        self.deleted_at = None
        self.save()
    
    @property
    def is_deleted(self):
        """Propriedade para verificar se o registro está excluído"""
        return self.deleted_at is not None
    
    @property
    def margem_lucro(self):
        """Calcula a margem de lucro em percentual"""
        if self.custo_unitario > 0:
            return ((self.preco_venda - self.custo_unitario) / self.custo_unitario) * 100
        return Decimal('0.00')
