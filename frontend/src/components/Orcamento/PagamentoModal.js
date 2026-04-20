import React, { useState } from 'react';
import api from '../../services/api';
import './PagamentoModal.css';

function PagamentoModal({ orcamento, onClose, onSuccess }) {
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [isParcelado, setIsParcelado] = useState(false);
  const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [valorEntrada, setValorEntrada] = useState('');
  const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState('');
  const [faseMaoObra, setFaseMaoObra] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formasPagamento = [
    { value: 'DINHEIRO', label: 'Dinheiro' },
    { value: 'PIX', label: 'PIX' },
    { value: 'BOLETO', label: 'Boleto' },
    { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
    { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
    { value: 'TRANSFERENCIA', label: 'Transferência' }
  ];

  const fasesMaoObra = [
    { value: 'ESTRUTURA', label: 'Estrutura' },
    { value: 'PLACA', label: 'Placa' },
    { value: 'ACABAMENTO', label: 'Acabamento' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!dataPrimeiroVencimento) {
      setError('Informe a data do primeiro vencimento');
      return;
    }

    if (orcamento.tipo_orcamento === 'MAO_OBRA' && !faseMaoObra) {
      setError('Para orçamentos de mão de obra, informe a fase atual');
      return;
    }

    if (isParcelado && numeroParcelas < 2) {
      setError('Para pagamento parcelado, informe no mínimo 2 parcelas');
      return;
    }

    setLoading(true);

    try {
      const data = {
        forma_pagamento: formaPagamento,
        is_parcelado: isParcelado,
        data_primeiro_vencimento: dataPrimeiroVencimento
      };

      if (isParcelado) {
        data.numero_parcelas = parseInt(numeroParcelas);
        if (valorEntrada) {
          data.valor_entrada = parseFloat(valorEntrada);
        }
      }

      if (orcamento.tipo_orcamento === 'MAO_OBRA') {
        data.fase_mao_obra = faseMaoObra;
      }

      await api.post(`/orcamentos/${orcamento.id}/processar_pagamento/`, data);
      
      onSuccess();
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      setError(err.response?.data?.detail || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const calcularValorParcela = () => {
    // Valida se o orçamento tem valor total
    if (!orcamento || !orcamento.valor_total) {
      return 0;
    }
    
    // Se não está parcelado, retorna o valor total
    if (!isParcelado) {
      return parseFloat(orcamento.valor_total);
    }
    
    // Valida número de parcelas
    const parcelas = parseInt(numeroParcelas);
    if (isNaN(parcelas) || parcelas < 2) {
      return parseFloat(orcamento.valor_total);
    }
    
    // Calcula com entrada se houver
    const entrada = valorEntrada ? parseFloat(valorEntrada) : 0;
    const valorTotal = parseFloat(orcamento.valor_total);
    const valorRestante = valorTotal - entrada;
    
    return valorRestante / parcelas;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pagamento-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configurar Pagamento</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="orcamento-info">
            <p><strong>Cliente:</strong> {orcamento.cliente_nome}</p>
            <p><strong>Valor Total:</strong> R$ {parseFloat(orcamento.valor_total).toFixed(2)}</p>
            {orcamento.tipo_orcamento === 'MAO_OBRA' && (
              <p><strong>Tipo:</strong> Mão de Obra</p>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            {orcamento.tipo_orcamento === 'MAO_OBRA' && (
              <div className="form-group">
                <label>Fase Atual da Mão de Obra *</label>
                <select 
                  value={faseMaoObra} 
                  onChange={(e) => setFaseMaoObra(e.target.value)}
                  required
                >
                  <option value="">Selecione a fase</option>
                  {fasesMaoObra.map(fase => (
                    <option key={fase.value} value={fase.value}>
                      {fase.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Forma de Pagamento *</label>
              <select 
                value={formaPagamento} 
                onChange={(e) => setFormaPagamento(e.target.value)}
                required
              >
                {formasPagamento.map(forma => (
                  <option key={forma.value} value={forma.value}>
                    {forma.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={isParcelado}
                  onChange={(e) => setIsParcelado(e.target.checked)}
                />
                Pagamento Parcelado?
              </label>
            </div>

            {isParcelado && (
              <>
                <div className="form-group">
                  <label>Número de Parcelas *</label>
                  <input
                    type="number"
                    min="2"
                    max="48"
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Valor da Entrada (opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={orcamento.valor_total}
                    placeholder="0.00"
                    value={valorEntrada}
                    onChange={(e) => setValorEntrada(e.target.value)}
                  />
                </div>

                <div className="form-group valor-parcela-info">
                  <strong>Valor de cada parcela: R$ {calcularValorParcela().toFixed(2)}</strong>
                </div>
              </>
            )}

            <div className="form-group">
              <label>Data do {isParcelado ? 'Primeiro ' : ''}Vencimento *</label>
              <input
                type="date"
                value={dataPrimeiroVencimento}
                onChange={(e) => setDataPrimeiroVencimento(e.target.value)}
                required
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Processando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PagamentoModal;
