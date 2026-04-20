from django.db import models
from orcamentos.models import Orcamento
from django.utils import timezone
from datetime import timedelta

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


class CategoriaFinanceira(models.Model):
    """Modelo para categorias financeiras"""
    
    TIPO_CHOICES = [
        ('ENTRADA', 'Entrada'),
        ('SAIDA', 'Saída'),
    ]
    
    nome = models.CharField(max_length=100, verbose_name="Nome")
    tipo = models.CharField(
        max_length=10, 
        choices=TIPO_CHOICES, 
        verbose_name="Tipo"
    )
    
    class Meta:
        verbose_name = "Categoria Financeira"
        verbose_name_plural = "Categorias Financeiras"
        ordering = ['nome']
    
    def __str__(self):
        return f"{self.nome} ({self.get_tipo_display()})"


class MovimentacaoFinanceira(models.Model):
    """Modelo para registrar movimentações financeiras"""
    
    TIPO_CHOICES = [
        ('ENTRADA', 'Entrada'),
        ('SAIDA', 'Saída'),
    ]
    
    TIPO_MOVIMENTACAO_CHOICES = [
        ('COMUM', 'Movimentação Comum'),
        ('CATEGORIZADA', 'Gasto Fixo/Categorizado'),
    ]
    
    descricao = models.CharField(
        max_length=255, 
        blank=True,
        verbose_name="Descrição",
        help_text="Gerada automaticamente para gastos categorizados"
    )
    detalhes = models.CharField(
        max_length=200, 
        blank=True, 
        null=True,
        verbose_name="Detalhes/Complemento",
        help_text="Ex: Nome do funcionário para salários, nome do fornecedor, etc."
    )
    valor = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Valor"
    )
    tipo = models.CharField(
        max_length=10, 
        choices=TIPO_CHOICES, 
        verbose_name="Tipo"
    )
    tipo_movimentacao = models.CharField(
        max_length=15,
        choices=TIPO_MOVIMENTACAO_CHOICES,
        default='COMUM',
        verbose_name="Tipo de Movimentação"
    )
    data_movimentacao = models.DateField(verbose_name="Data da Movimentação")
    categoria = models.ForeignKey(
        CategoriaFinanceira,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name="Categoria",
        related_name='movimentacoes'
    )
    orcamento = models.ForeignKey(
        Orcamento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Orçamento",
        related_name='movimentacoes_financeiras'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data de Criação")
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="Data de Exclusão")
    
    # Manager padrão que filtra automaticamente registros excluídos
    objects = SoftDeleteManager()
    # Manager que inclui todos os registros
    all_objects = AllObjectsManager()
    
    class Meta:
        verbose_name = "Movimentação Financeira"
        verbose_name_plural = "Movimentações Financeiras"
        ordering = ['-data_movimentacao', '-created_at']
    
    def save(self, *args, **kwargs):
        """Gera descrição automaticamente para movimentações categorizadas"""
        if self.tipo_movimentacao == 'CATEGORIZADA' and self.categoria:
            # Para gastos categorizados, gera descrição baseada na categoria
            if self.detalhes and self.detalhes.strip():
                # Se há detalhes, concatena: "Categoria - Detalhes"
                self.descricao = f"{self.categoria.nome} - {self.detalhes.strip()}"
            else:
                # Sem detalhes, usa apenas o nome da categoria
                self.descricao = self.categoria.nome
        elif self.tipo_movimentacao == 'COMUM' and not self.descricao:
            # Para movimentações comuns, descrição é obrigatória
            raise ValueError("Descrição é obrigatória para movimentações comuns")
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.descricao} - R$ {self.valor}"
    
    def delete(self, using=None, keep_parents=False):
        """Override do método delete para realizar soft delete"""
        self.deleted_at = timezone.now()
        self.save()
    
    def hard_delete(self):
        """Método para exclusão permanente do banco de dados"""
        super().delete()
    
    def restore(self):
        """Método para restaurar um registro excluído"""
        self.deleted_at = None
        self.save()
    
    def registrar_entrada(self):
        """Método para registrar entrada"""
        self.tipo = 'ENTRADA'
        self.save()
    
    def registrar_saida(self):
        """Método para registrar saída"""
        self.tipo = 'SAIDA'
        self.save()


class GastoFixo(models.Model):
    """Modelo para gastos fixos recorrentes"""
    
    PERIODO_CHOICES = [
        ('MENSAL', 'Mensal'),
        ('SEMANAL', 'Semanal'),
        ('ANUAL', 'Anual'),
    ]
    
    nome = models.CharField(max_length=100, verbose_name="Nome")
    valor = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Valor"
    )
    periodo = models.CharField(
        max_length=10, 
        choices=PERIODO_CHOICES, 
        verbose_name="Período"
    )
    dia_vencimento = models.IntegerField(verbose_name="Dia do Vencimento")
    categoria = models.ForeignKey(
        CategoriaFinanceira,
        on_delete=models.PROTECT,
        verbose_name="Categoria",
        related_name='gastos_fixos'
    )
    
    class Meta:
        verbose_name = "Gasto Fixo"
        verbose_name_plural = "Gastos Fixos"
        ordering = ['nome']
    
    def __str__(self):
        return f"{self.nome} - R$ {self.valor} ({self.get_periodo_display()})"
    
    def cadastrar(self):
        """Método para cadastrar gasto fixo"""
        self.save()
    
    def gerar_previsao(self):
        """Método para gerar previsão de movimentações com base no gasto fixo"""
        # Este método pode ser expandido para criar automaticamente
        # movimentações financeiras baseadas nos gastos fixos
        pass


class Parcelamento(models.Model):
    """Modelo para controle de parcelamentos de orçamentos"""
    
    FORMA_PAGAMENTO_CHOICES = [
        ('DINHEIRO', 'Dinheiro'),
        ('PIX', 'PIX'),
        ('BOLETO', 'Boleto'),
        ('CARTAO_CREDITO', 'Cartão de Crédito'),
        ('CARTAO_DEBITO', 'Cartão de Débito'),
        ('TRANSFERENCIA', 'Transferência Bancária'),
    ]
    
    STATUS_CHOICES = [
        ('PENDENTE', 'Pendente'),
        ('PAGO', 'Pago'),
        ('ATRASADO', 'Atrasado'),
        ('CANCELADO', 'Cancelado'),
    ]
    
    movimentacao = models.ForeignKey(
        MovimentacaoFinanceira,
        on_delete=models.CASCADE,
        verbose_name="Movimentação",
        related_name='parcelamentos'
    )
    numero_parcela = models.IntegerField(verbose_name="Número da Parcela")
    total_parcelas = models.IntegerField(verbose_name="Total de Parcelas")
    valor_parcela = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Valor da Parcela"
    )
    data_vencimento = models.DateField(verbose_name="Data de Vencimento")
    data_pagamento = models.DateField(
        null=True, 
        blank=True, 
        verbose_name="Data de Pagamento"
    )
    forma_pagamento = models.CharField(
        max_length=20,
        choices=FORMA_PAGAMENTO_CHOICES,
        verbose_name="Forma de Pagamento"
    )
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='PENDENTE',
        verbose_name="Status"
    )
    fase_mao_obra = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name="Fase da Mão de Obra",
        help_text="Estrutura, Placa ou Acabamento"
    )
    observacoes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Observações"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data de Criação")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última Atualização")
    
    class Meta:
        verbose_name = "Parcelamento"
        verbose_name_plural = "Parcelamentos"
        ordering = ['data_vencimento', 'numero_parcela']
    
    def __str__(self):
        return f"Parcela {self.numero_parcela}/{self.total_parcelas} - R$ {self.valor_parcela}"
    
    def marcar_como_pago(self, data_pagamento=None):
        """Marca parcela como paga"""
        self.status = 'PAGO'
        self.data_pagamento = data_pagamento or timezone.now().date()
        self.save()
    
    def esta_proximo_vencimento(self, dias=10):
        """Verifica se está próximo do vencimento"""
        if self.status == 'PAGO':
            return False
        dias_ate_vencimento = (self.data_vencimento - timezone.now().date()).days
        return 0 <= dias_ate_vencimento <= dias
    
    def esta_atrasado(self):
        """Verifica se está atrasado"""
        if self.status == 'PAGO':
            return False
        return timezone.now().date() > self.data_vencimento
    
    def atualizar_status(self):
        """Atualiza status automaticamente baseado na data"""
        if self.status != 'PAGO' and self.esta_atrasado():
            self.status = 'ATRASADO'
            self.save()


class Notificacao(models.Model):
    """Modelo para notificações de vencimentos"""
    
    TIPO_CHOICES = [
        ('VENCIMENTO_PROXIMO', 'Vencimento Próximo'),
        ('VENCIMENTO_HOJE', 'Vence Hoje'),
        ('ATRASADO', 'Atrasado'),
    ]
    
    STATUS_CHOICES = [
        ('NAO_LIDA', 'Não Lida'),
        ('LIDA', 'Lida'),
        ('ARQUIVADA', 'Arquivada'),
    ]
    
    parcelamento = models.ForeignKey(
        Parcelamento,
        on_delete=models.CASCADE,
        verbose_name="Parcelamento",
        related_name='notificacoes'
    )
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        verbose_name="Tipo"
    )
    mensagem = models.TextField(verbose_name="Mensagem")
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='NAO_LIDA',
        verbose_name="Status"
    )
    data_criacao = models.DateTimeField(auto_now_add=True, verbose_name="Data de Criação")
    data_leitura = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Data de Leitura"
    )
    
    class Meta:
        verbose_name = "Notificação"
        verbose_name_plural = "Notificações"
        ordering = ['-data_criacao']
    
    def __str__(self):
        return f"{self.get_tipo_display()} - {self.parcelamento}"
    
    def marcar_como_lida(self):
        """Marca notificação como lida"""
        self.status = 'LIDA'
        self.data_leitura = timezone.now()
        self.save()
    
    @classmethod
    def gerar_notificacoes_pendentes(cls):
        """Gera notificações para parcelas próximas do vencimento"""
        hoje = timezone.now().date()
        notificacoes_criadas = []
        
        # Busca parcelas pendentes
        parcelas_pendentes = Parcelamento.objects.filter(
            status='PENDENTE'
        )
        
        for parcela in parcelas_pendentes:
            dias_ate_vencimento = (parcela.data_vencimento - hoje).days
            
            # Notificação: vence em 10 dias
            if dias_ate_vencimento == 10:
                # Verifica se já existe notificação
                if not cls.objects.filter(
                    parcelamento=parcela,
                    tipo='VENCIMENTO_PROXIMO',
                    data_criacao__date=hoje
                ).exists():
                    notif = cls.objects.create(
                        parcelamento=parcela,
                        tipo='VENCIMENTO_PROXIMO',
                        mensagem=f"A parcela {parcela.numero_parcela}/{parcela.total_parcelas} vence em 10 dias! Valor: R$ {parcela.valor_parcela}"
                    )
                    notificacoes_criadas.append(notif)
            
            # Notificação: vence hoje
            elif dias_ate_vencimento == 0:
                if not cls.objects.filter(
                    parcelamento=parcela,
                    tipo='VENCIMENTO_HOJE',
                    data_criacao__date=hoje
                ).exists():
                    notif = cls.objects.create(
                        parcelamento=parcela,
                        tipo='VENCIMENTO_HOJE',
                        mensagem=f"A parcela {parcela.numero_parcela}/{parcela.total_parcelas} vence HOJE! Valor: R$ {parcela.valor_parcela}"
                    )
                    notificacoes_criadas.append(notif)
            
            # Notificação: atrasado
            elif dias_ate_vencimento < 0:
                if not cls.objects.filter(
                    parcelamento=parcela,
                    tipo='ATRASADO',
                    data_criacao__date=hoje
                ).exists():
                    dias_atraso = abs(dias_ate_vencimento)
                    notif = cls.objects.create(
                        parcelamento=parcela,
                        tipo='ATRASADO',
                        mensagem=f"A parcela {parcela.numero_parcela}/{parcela.total_parcelas} está atrasada há {dias_atraso} dias! Valor: R$ {parcela.valor_parcela}"
                    )
                    notificacoes_criadas.append(notif)
                    
                    # Atualiza status da parcela
                    parcela.atualizar_status()
        
        return notificacoes_criadas
