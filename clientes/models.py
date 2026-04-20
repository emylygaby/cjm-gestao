from django.db import models

# Create your models here.

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


class Cliente(models.Model):
    nome = models.CharField(max_length=200, verbose_name="Nome")
    cpf_cnpj = models.CharField(max_length=18, verbose_name="CPF/CNPJ", blank=True, null=True)
    telefone = models.CharField(max_length=20, verbose_name="Telefone", unique=True)
    email = models.EmailField(verbose_name="Email", blank=True, null=True)
    endereco = models.TextField(verbose_name="Endereço", blank=True, null=True)
    observacao = models.TextField(verbose_name="Observação", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data de Criação")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Data de Atualização")
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="Data de Exclusão")

    # Manager padrão que filtra automaticamente registros excluídos
    objects = SoftDeleteManager()
    # Manager que inclui todos os registros
    all_objects = AllObjectsManager()

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ['nome']

    def __str__(self):
        return self.nome
    
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
