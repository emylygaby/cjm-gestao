from django.db import models
from decimal import Decimal
from clientes.models import Cliente
from produtos.models import Produto


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


class Orcamento(models.Model):
    """Modelo para armazenar os orçamentos"""
    
    STATUS_CHOICES = [
        ('PENDENTE', 'Pendente'),
        ('APROVADO', 'Aprovado'),
        ('REJEITADO', 'Rejeitado'),
        ('EM_ANDAMENTO', 'Em Andamento'),
        ('CONCLUIDO', 'Concluído'),
        ('CANCELADO', 'Cancelado'),
    ]
    
    TIPO_ORCAMENTO_CHOICES = [
        ('PRODUTO', 'Produtos'),
        ('MAO_OBRA', 'Mão de Obra'),
    ]
    
    FASE_MAO_OBRA_CHOICES = [
        ('ESTRUTURA', 'Estrutura'),
        ('PLACA', 'Placa'),
        ('ACABAMENTO', 'Acabamento'),
    ]
    
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        verbose_name="Cliente",
        related_name='orcamentos'
    )
    data_emissao = models.DateField(verbose_name="Data de Emissão")
    data_validade = models.DateField(verbose_name="Data de Validade")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDENTE',
        verbose_name="Status"
    )
    tipo_orcamento = models.CharField(
        max_length=10,
        choices=TIPO_ORCAMENTO_CHOICES,
        default='PRODUTO',
        verbose_name="Tipo de Orçamento"
    )
    fase_atual = models.CharField(
        max_length=15,
        choices=FASE_MAO_OBRA_CHOICES,
        blank=True,
        null=True,
        verbose_name="Fase Atual (Mão de Obra)"
    )
    valor_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Valor Total",
        default=Decimal('0.00')
    )
    custo_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Custo Total",
        default=Decimal('0.00')
    )
    lucro_previsto = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Lucro Previsto",
        default=Decimal('0.00')
    )
    observacoes = models.TextField(verbose_name="Observações", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data de Criação")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Data de Atualização")
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="Data de Exclusão")
    
    # Manager padrão que filtra automaticamente registros excluídos
    objects = SoftDeleteManager()
    # Manager que inclui todos os registros
    all_objects = AllObjectsManager()
    
    class Meta:
        verbose_name = "Orçamento"
        verbose_name_plural = "Orçamentos"
        ordering = ['-data_emissao']
    
    def __str__(self):
        return f"Orçamento #{self.id} - {self.cliente.nome}"
    
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
    
    def calcular_totais(self):
        """Calcula os totais do orçamento com base nos itens"""
        itens = self.itens.all()
        self.valor_total = sum(item.subtotal for item in itens)
        self.custo_total = sum(item.custo_total for item in itens)
        self.lucro_previsto = self.valor_total - self.custo_total
        self.save()


class OrcamentoItem(models.Model):
    """Modelo para armazenar os itens de um orçamento"""
    
    orcamento = models.ForeignKey(
        Orcamento,
        on_delete=models.CASCADE,
        verbose_name="Orçamento",
        related_name='itens'
    )
    produto = models.ForeignKey(
        Produto,
        on_delete=models.PROTECT,
        verbose_name="Produto",
        related_name='orcamento_itens'
    )
    quantidade = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Quantidade"
    )
    preco_venda = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Preço de Venda"
    )
    custo_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Custo Unitário"
    )
    
    class Meta:
        verbose_name = "Item do Orçamento"
        verbose_name_plural = "Itens do Orçamento"
        ordering = ['id']
    
    def __str__(self):
        return f"{self.produto.name} - {self.quantidade} {self.produto.unimed.simbolo}"
    
    @property
    def subtotal(self):
        """Calcula o subtotal do item (quantidade * preço de venda)"""
        return self.quantidade * self.preco_venda
    
    @property
    def custo_total(self):
        """Calcula o custo total do item (quantidade * custo unitário)"""
        return self.quantidade * self.custo_unitario
    
    @property
    def lucro_item(self):
        """Calcula o lucro do item"""
        return self.subtotal - self.custo_total
    
    def save(self, *args, **kwargs):
        """Override do método save para atualizar os totais do orçamento"""
        super().save(*args, **kwargs)
        # Atualiza os totais do orçamento
        self.orcamento.calcular_totais()
    
    def delete(self, *args, **kwargs):
        """Override do método delete para atualizar os totais do orçamento"""
        orcamento = self.orcamento
        super().delete(*args, **kwargs)
        # Atualiza os totais do orçamento
        orcamento.calcular_totais()
