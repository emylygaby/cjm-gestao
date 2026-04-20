from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from decimal import Decimal
from .models import Orcamento, OrcamentoItem
from .serializers import (
    OrcamentoSerializer,
    OrcamentoCreateUpdateSerializer,
    OrcamentoItemSerializer,
    OrcamentoItemCreateUpdateSerializer
)
from financeiro.models import MovimentacaoFinanceira, CategoriaFinanceira, Parcelamento
from financeiro.serializers import OrcamentoParcelamentoSerializer
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import io
import os


class OrcamentoViewSet(viewsets.ModelViewSet):
    queryset = Orcamento.objects.all()
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return OrcamentoCreateUpdateSerializer
        return OrcamentoSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        orcamento = serializer.save()
        
        # Retorna os dados completos do orçamento criado
        response_serializer = OrcamentoSerializer(orcamento)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        orcamento = serializer.save()
        
        # Retorna os dados completos do orçamento atualizado
        response_serializer = OrcamentoSerializer(orcamento)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['get'])
    def itens(self, request, pk=None):
        """Endpoint para listar todos os itens de um orçamento específico"""
        orcamento = self.get_object()
        itens = orcamento.itens.all()
        serializer = OrcamentoItemSerializer(itens, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def adicionar_item(self, request, pk=None):
        """Endpoint para adicionar um item ao orçamento"""
        orcamento = self.get_object()
        serializer = OrcamentoItemCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Cria o item
        item = OrcamentoItem.objects.create(
            orcamento=orcamento,
            **serializer.validated_data
        )
        
        # Retorna o item criado
        response_serializer = OrcamentoItemSerializer(item)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['delete'])
    def remover_item(self, request, pk=None):
        """Endpoint para remover um item do orçamento"""
        try:
            item_id = request.data.get('item_id')
            if not item_id:
                return Response({'error': 'item_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
            
            orcamento = self.get_object()
            item = orcamento.itens.get(id=item_id)
            item.delete()
            
            return Response({'message': 'Item removido com sucesso'}, status=status.HTTP_200_OK)
        except OrcamentoItem.DoesNotExist:
            return Response({'error': 'Item não encontrado'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def atualizar_status(self, request, pk=None):
        """Endpoint para atualizar o status do orçamento"""
        orcamento = self.get_object()
        novo_status = request.data.get('status')
        
        if novo_status not in dict(Orcamento.STATUS_CHOICES):
            return Response(
                {'error': 'Status inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        orcamento.status = novo_status
        orcamento.save()
        
        serializer = OrcamentoSerializer(orcamento)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def processar_pagamento(self, request, pk=None):
        """Endpoint para processar o pagamento quando o orçamento mudar para EM_ANDAMENTO"""
        orcamento = self.get_object()
        
        # Valida os dados do pagamento
        serializer = OrcamentoParcelamentoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Busca ou cria a categoria para orçamentos
        categoria, created = CategoriaFinanceira.objects.get_or_create(
            nome='Orçamentos - Receita',
            defaults={'tipo': 'ENTRADA'}
        )
        
        # Cria a movimentação financeira principal
        movimentacao = MovimentacaoFinanceira.objects.create(
            descricao=f"Orçamento #{orcamento.id} - {orcamento.cliente.nome}",
            valor=orcamento.valor_total,
            tipo='ENTRADA',
            tipo_movimentacao='COMUM',  # Define como COMUM pois já tem descrição
            data_movimentacao=timezone.now().date(),
            orcamento=orcamento
        )
        
        # Se for parcelado, cria os parcelamentos
        if data['is_parcelado']:
            numero_parcelas = data['numero_parcelas']
            valor_entrada = data.get('valor_entrada', Decimal('0.00'))
            
            # Calcula o valor restante e o valor de cada parcela
            valor_restante = orcamento.valor_total - valor_entrada
            valor_parcela = valor_restante / numero_parcelas
            
            # Se houver entrada, cria o primeiro parcelamento como entrada paga
            if valor_entrada > 0:
                Parcelamento.objects.create(
                    movimentacao=movimentacao,
                    numero_parcela=0,
                    total_parcelas=numero_parcelas + 1,
                    valor_parcela=valor_entrada,
                    data_vencimento=timezone.now().date(),
                    data_pagamento=timezone.now().date(),
                    forma_pagamento=data['forma_pagamento'],
                    status='PAGO',
                    fase_mao_obra=data.get('fase_mao_obra'),
                    observacoes='Entrada'
                )
            
            # Cria os parcelamentos
            data_vencimento_atual = data['data_primeiro_vencimento']
            
            for i in range(1, numero_parcelas + 1):
                Parcelamento.objects.create(
                    movimentacao=movimentacao,
                    numero_parcela=i,
                    total_parcelas=numero_parcelas,
                    valor_parcela=valor_parcela,
                    data_vencimento=data_vencimento_atual,
                    forma_pagamento=data['forma_pagamento'],
                    status='PENDENTE',
                    fase_mao_obra=data.get('fase_mao_obra')
                )
                
                # Avança um mês para a próxima parcela
                data_vencimento_atual = data_vencimento_atual + timedelta(days=30)
        else:
            # Pagamento à vista - cria um único parcelamento
            Parcelamento.objects.create(
                movimentacao=movimentacao,
                numero_parcela=1,
                total_parcelas=1,
                valor_parcela=orcamento.valor_total,
                data_vencimento=data['data_primeiro_vencimento'],
                forma_pagamento=data['forma_pagamento'],
                status='PENDENTE',
                fase_mao_obra=data.get('fase_mao_obra'),
                observacoes='Pagamento à vista'
            )
        
        # Atualiza o status do orçamento para EM_ANDAMENTO
        orcamento.status = 'EM_ANDAMENTO'
        
        # Se for mão de obra e tiver fase informada, atualiza
        if data.get('fase_mao_obra'):
            orcamento.fase_atual = data['fase_mao_obra']
        
        orcamento.save()
        
        # Retorna o orçamento atualizado com informações dos parcelamentos
        serializer = OrcamentoSerializer(orcamento)
        return Response({
            'orcamento': serializer.data,
            'movimentacao_id': movimentacao.id,
            'parcelamentos_criados': movimentacao.parcelamentos.count()
        })
    
    @action(detail=True, methods=['get'])
    def gerar_pdf(self, request, pk=None):
        """Endpoint para gerar PDF do orçamento"""
        orcamento = self.get_object()
        
        # Cria o buffer de memória para o PDF
        buffer = io.BytesIO()
        
        # Cria o documento PDF
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=1.5*cm,
            bottomMargin=2*cm
        )
        
        # Container para os elementos do PDF
        elements = []
        
        # Estilos
        styles = getSampleStyleSheet()
        
        # Estilo para cabeçalho
        header_style = ParagraphStyle(
            'HeaderStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#333333'),
            alignment=TA_LEFT,
            spaceAfter=3
        )
        
        # Estilo para título
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1976d2'),
            spaceAfter=12,
            spaceBefore=5,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        # Estilo para seções
        section_style = ParagraphStyle(
            'SectionStyle',
            parent=styles['Heading2'],
            fontSize=11,
            textColor=colors.HexColor('#1976d2'),
            spaceAfter=6,
            spaceBefore=8,
            fontName='Helvetica-Bold'
        )
        
        # Estilo para texto normal
        normal_style = ParagraphStyle(
            'NormalStyle',
            parent=styles['Normal'],
            fontSize=9,
            spaceAfter=4,
            leading=12
        )
        
        # Largura da página
        page_width = A4[0] - 3*cm
        
        # === CABEÇALHO COM LOGO E INFORMAÇÕES DA EMPRESA ===
        # Caminho da logo
        logo_path = os.path.join(settings.BASE_DIR, 'img', 'new_logo.png')
        
        # Tabela do cabeçalho
        if os.path.exists(logo_path):
            logo = Image(logo_path, width=3*cm, height=3*cm)
            
            # Informações da empresa
            empresa_info = [
                [logo, [
                    Paragraph("<b>CJM DRYWALL - Gesso Acartonado</b>", header_style),
                    Paragraph("CNPJ: 39.151.497/0001-84", header_style),
                    Paragraph("Telefone: (43) 98483-2652", header_style)
                ]]
            ]
            
            header_table = Table(empresa_info, colWidths=[3.5*cm, 12*cm])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('ALIGN', (1, 0), (1, 0), 'LEFT'),
                ('LEFTPADDING', (1, 0), (1, 0), 15),
            ]))
            elements.append(header_table)
        else:
            elements.append(Paragraph("<b>CJM DRYWALL - Gesso Acartonado</b>", header_style))
        
        elements.append(Spacer(1, 0.3*cm))
        
        # Linha divisória
        elements.append(Table([['']], colWidths=[page_width], 
                             style=TableStyle([('LINEABOVE', (0, 0), (-1, 0), 2, colors.HexColor('#1976d2'))])))
        
        # === TÍTULO ===
        elements.append(Paragraph("PROPOSTA COMERCIAL", title_style))
        
        # === INFORMAÇÕES DO ORÇAMENTO ===
        info_data = [
            ['Orçamento Nº:', f"#{orcamento.id:05d}", 'Data de Emissão:', orcamento.data_emissao.strftime('%d/%m/%Y')],
            ['Status:', orcamento.get_status_display(), 'Validade:', orcamento.data_validade.strftime('%d/%m/%Y')]
        ]
        
        info_table = Table(info_data, colWidths=[3*cm, 4*cm, 3*cm, 4*cm])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f0f0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTNAME', (3, 0), (3, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.2*cm))
        
        # === DADOS DO CLIENTE ===
        elements.append(Paragraph("DADOS DO CLIENTE", section_style))
        
        cliente_data = [
            ['Cliente:', orcamento.cliente.nome],
        ]
        if orcamento.cliente.telefone:
            cliente_data.append(['Telefone:', orcamento.cliente.telefone])
        if orcamento.cliente.email:
            cliente_data.append(['Email:', orcamento.cliente.email])
        if orcamento.cliente.endereco:
            cliente_data.append(['Endereço:', orcamento.cliente.endereco])
        
        cliente_table = Table(cliente_data, colWidths=[3*cm, 11*cm])
        cliente_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(cliente_table)
        elements.append(Spacer(1, 0.2*cm))
        
        # === ITENS DO ORÇAMENTO ===
        elements.append(Paragraph("DESCRIÇÃO DOS SERVIÇOS", section_style))
        
        # Cabeçalho da tabela de itens
        itens_data = [['Item', 'Descrição', 'Qtd', 'Unid.', 'Valor Unit.', 'Valor Total']]
        
        # Dados dos itens - usando Paragraph para quebrar linhas em nomes longos
        for idx, item in enumerate(orcamento.itens.all(), 1):
            # Limitar nome do produto para evitar overflow
            produto_nome = Paragraph(item.produto.name, ParagraphStyle(
                'ProdutoNome',
                parent=styles['Normal'],
                fontSize=8,
                leading=10
            ))
            
            itens_data.append([
                str(idx),
                produto_nome,
                f"{item.quantidade:.2f}",
                item.produto.unimed.simbolo,
                f"R$ {item.preco_venda:.2f}",
                f"R$ {item.subtotal:.2f}"
            ])
        
        # Cria a tabela de itens com larguras proporcionais
        itens_table = Table(itens_data, colWidths=[1*cm, 6.5*cm, 1.5*cm, 1.5*cm, 2.5*cm, 2.5*cm])
        itens_table.setStyle(TableStyle([
            # Cabeçalho
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            
            # Corpo da tabela
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Item
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),     # Descrição
            ('ALIGN', (2, 1), (2, -1), 'CENTER'),   # Qtd
            ('ALIGN', (3, 1), (3, -1), 'CENTER'),   # Unid
            ('ALIGN', (4, 1), (4, -1), 'RIGHT'),    # Valor Unit
            ('ALIGN', (5, 1), (5, -1), 'RIGHT'),    # Valor Total
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        elements.append(itens_table)
        elements.append(Spacer(1, 0.2*cm))
        
        # === VALOR TOTAL ===
        total_data = [
            ['VALOR TOTAL DA PROPOSTA', f"R$ {orcamento.valor_total:.2f}"]
        ]
        
        total_table = Table(total_data, colWidths=[12*cm, 3.5*cm])
        total_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (0, 0), 'RIGHT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(total_table)
        elements.append(Spacer(1, 0.2*cm))
        
        # === FORMAS DE PAGAMENTO ===
        elements.append(Paragraph("FORMAS DE PAGAMENTO", section_style))
        elements.append(Paragraph("• Boleto Bancário", normal_style))
        elements.append(Paragraph("• PIX", normal_style))
        
        # === OBSERVAÇÕES ===
        if orcamento.observacoes:
            elements.append(Paragraph("OBSERVAÇÕES", section_style))
            obs_lines = orcamento.observacoes.split('\n')
            for line in obs_lines:
                if line.strip():
                    elements.append(Paragraph(line, normal_style))
        
        # === RODAPÉ ===
        elements.append(Spacer(1, 0.3*cm))
        rodape_style = ParagraphStyle(
            'Rodape',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=TA_CENTER
        )
        elements.append(Paragraph(
            f"Proposta válida até {orcamento.data_validade.strftime('%d/%m/%Y')} | "
            f"CJM DRYWALL - Gesso Acartonado | CNPJ: 39.151.497/0001-84 | Tel: (43) 98483-2652", 
            rodape_style
        ))
        
        # Gera o PDF
        doc.build(elements)
        
        # Retorna o PDF
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="proposta_comercial_{orcamento.id:05d}.pdf"'
        
        return response
    
    @action(detail=True, methods=['delete'])
    def soft_delete(self, request, pk=None):
        """Endpoint para realizar soft delete de um orçamento"""
        orcamento = self.get_object()
        orcamento.delete()
        return Response({'message': 'Orçamento excluído com sucesso'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Endpoint para restaurar um orçamento excluído"""
        try:
            orcamento = Orcamento.all_objects.get(pk=pk)
            if not orcamento.is_deleted:
                return Response(
                    {'error': 'Orçamento não está excluído'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            orcamento.restore()
            serializer = OrcamentoSerializer(orcamento)
            return Response(
                {'message': 'Orçamento restaurado com sucesso', 'orcamento': serializer.data},
                status=status.HTTP_200_OK
            )
        except Orcamento.DoesNotExist:
            return Response(
                {'error': 'Orçamento não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def deleted(self, request):
        """Endpoint para listar orçamentos excluídos"""
        orcamentos_excluidos = Orcamento.all_objects.only_deleted()
        serializer = OrcamentoSerializer(orcamentos_excluidos, many=True)
        return Response(serializer.data)

