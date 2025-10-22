from django.db import models

# Create your models here.

class Cliente(models.Model):
    nome = models.CharField(max_length=200, verbose_name="Nome")
    telefone = models.CharField(max_length=20, verbose_name="Telefone")
    endereco = models.TextField(verbose_name="Endereço")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data de Criação")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Data de Atualização")

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Orcamento(models.Model):
    cliente = models.ForeignKey(
        Cliente, 
        on_delete=models.CASCADE, 
        related_name='orcamentos',
        verbose_name="Cliente"
    )
    descricao = models.TextField(verbose_name="Descrição")
    valor = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Valor")
    data_orcamento = models.DateTimeField(auto_now_add=True, verbose_name="Data do Orçamento")
    status = models.CharField(
        max_length=20,
        choices=[
            ('pendente', 'Pendente'),
            ('aprovado', 'Aprovado'),
            ('rejeitado', 'Rejeitado'),
        ],
        default='pendente',
        verbose_name="Status"
    )

    class Meta:
        verbose_name = "Orçamento"
        verbose_name_plural = "Orçamentos"
        ordering = ['-data_orcamento']

    def __str__(self):
        return f"Orçamento {self.id} - {self.cliente.nome}"
