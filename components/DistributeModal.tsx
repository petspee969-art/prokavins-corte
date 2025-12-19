import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Users, CheckCircle2, Layers } from 'lucide-react';
import { ProductionOrder, Seamstress } from '../types';

interface DistributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  seamstresses: Seamstress[];
  onDistribute: (originalOrderId: string, distributionMap: {color: string, sizes: any}[], seamstressId: string) => void;
}

// Logic order for clothing sizes
const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3', 'G4', 'UNI'];

export const DistributeModal: React.FC<DistributeModalProps> = ({ 
  isOpen, 
  onClose, 
  order, 
  seamstresses, 
  onDistribute 
}) => {
  const [selectedSeamstressId, setSelectedSeamstressId] = useState('');
  const [distributionMode, setDistributionMode] = useState<'FULL' | 'BY_SIZE'>('FULL');
  
  // For 'BY_SIZE' mode
  const [selectedSizesToDistribute, setSelectedSizesToDistribute] = useState<string[]>([]);

  useEffect(() => {
    if (order && isOpen) {
        setSelectedSeamstressId('');
        setDistributionMode('FULL');
        setSelectedSizesToDistribute([]);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  // READ FROM ACTIVE CUTTING ITEMS, NOT TOTAL ITEMS
  const sourceItems = order.activeCuttingItems || [];

  // Get all unique sizes available in this order across all colors
  const unsortedSizes = Array.from(new Set(
      sourceItems.flatMap(item => Object.keys(item.sizes).filter(size => (item.sizes[size] || 0) > 0))
  )) as string[];

  // Custom sort function
  const allAvailableSizes = unsortedSizes.sort((a, b) => {
      const idxA = SIZE_ORDER.indexOf(a.toUpperCase());
      const idxB = SIZE_ORDER.indexOf(b.toUpperCase());
      
      // If both are found in the list, compare indices
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      
      // If only A is found, it comes first
      if (idxA !== -1) return -1;
      
      // If only B is found, it comes first
      if (idxB !== -1) return 1;
      
      // If neither found, default to string comparison
      return a.localeCompare(b);
  });

  // Calculate stats based on selection
  const calculateTotal = () => {
      if (distributionMode === 'FULL') {
          return sourceItems.reduce((acc, item) => acc + item.actualPieces, 0);
      } else {
          // Sum up pieces for selected sizes across all colors
          let total = 0;
          sourceItems.forEach(item => {
              selectedSizesToDistribute.forEach(size => {
                  total += (item.sizes[size] || 0);
              });
          });
          return total;
      }
  };

  const totalToSend = calculateTotal();

  const toggleSizeSelection = (size: string) => {
      if (selectedSizesToDistribute.includes(size)) {
          setSelectedSizesToDistribute(selectedSizesToDistribute.filter(s => s !== size));
      } else {
          setSelectedSizesToDistribute([...selectedSizesToDistribute, size]);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeamstressId || totalToSend === 0) return;

    const distributionMap: {color: string, sizes: any}[] = [];

    sourceItems.forEach(item => {
        const sizesForThisColor: any = {};
        let hasItems = false;

        if (distributionMode === 'FULL') {
            // Send everything that is available for this color
            Object.keys(item.sizes).forEach(key => {
                if ((item.sizes[key] || 0) > 0) {
                    sizesForThisColor[key] = item.sizes[key];
                    hasItems = true;
                }
            });
        } else {
            // Send only selected sizes
            selectedSizesToDistribute.forEach(size => {
                if ((item.sizes[size] || 0) > 0) {
                    sizesForThisColor[size] = item.sizes[size];
                    hasItems = true;
                }
            });
        }

        if (hasItems) {
            distributionMap.push({
                color: item.color,
                sizes: sizesForThisColor
            });
        }
    });

    onDistribute(order.id, distributionMap, selectedSeamstressId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-t-2xl text-white flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users size={20} />
                Distribuir para Costura
              </h2>
              <p className="text-orange-100 text-sm mt-1">Ref: {order.referenceCode} - Pedido #{order.id}</p>
            </div>
            <button onClick={onClose} className="text-orange-200 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
          
          <div className="mb-6">
             <label className="block text-sm font-medium text-slate-700 mb-2">1. Selecione a Costureira</label>
             <select 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none bg-white text-slate-700"
                value={selectedSeamstressId}
                onChange={e => setSelectedSeamstressId(e.target.value)}
             >
                <option value="">-- Escolha uma costureira --</option>
                {seamstresses.filter(s => s.active).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.specialty})</option>
                ))}
             </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">2. O que você deseja enviar?</label>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                    type="button"
                    onClick={() => setDistributionMode('FULL')}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                        distributionMode === 'FULL' 
                        ? 'border-amber-500 bg-amber-50 text-amber-700' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-amber-200'
                    }`}
                >
                    <Layers size={24} />
                    <span className="font-bold">Corte Completo</span>
                    <span className="text-xs text-center opacity-70">Todas as cores e tamanhos restantes do corte</span>
                </button>

                <button
                    type="button"
                    onClick={() => setDistributionMode('BY_SIZE')}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                        distributionMode === 'BY_SIZE' 
                        ? 'border-amber-500 bg-amber-50 text-amber-700' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-amber-200'
                    }`}
                >
                    <CheckCircle2 size={24} />
                    <span className="font-bold">Por Tamanho</span>
                    <span className="text-xs text-center opacity-70">Escolha tamanhos específicos (Ex: Apenas P)</span>
                </button>
            </div>

            {distributionMode === 'BY_SIZE' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Selecione os tamanhos (aplicado a todas as cores disponíveis):</p>
                    <div className="flex flex-wrap gap-2">
                        {allAvailableSizes.length > 0 ? allAvailableSizes.map(size => (
                            <button
                                key={size}
                                type="button"
                                onClick={() => toggleSizeSelection(size)}
                                className={`w-10 h-10 rounded-lg font-bold text-sm border shadow-sm transition-all ${
                                    selectedSizesToDistribute.includes(size)
                                    ? 'bg-amber-500 text-white border-amber-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {size}
                            </button>
                        )) : (
                            <span className="text-sm text-slate-400">Nenhum tamanho disponível no corte.</span>
                        )}
                    </div>
                </div>
            )}
          </div>

          {/* Summary Preview */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
             <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Resumo do Envio (Estoque Disponível)</h4>
             {sourceItems.map((item, idx) => {
                 // Calculate what would be sent for this item
                 let qty = 0;
                 if (distributionMode === 'FULL') {
                     qty = item.actualPieces;
                 } else {
                     selectedSizesToDistribute.forEach(s => qty += (item.sizes[s] || 0));
                 }
                 
                 if (qty === 0) return null;

                 return (
                     <div key={idx} className="flex justify-between items-center text-sm mb-1 last:mb-0">
                         <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.colorHex || '#999'}}></div>
                            <span className="text-slate-700">{item.color}</span>
                         </div>
                         <span className="font-bold text-slate-900">{qty} pçs</span>
                     </div>
                 )
             })}
          </div>

        </form>

        <div className="p-6 border-t border-slate-100 bg-white rounded-b-2xl flex justify-between items-center flex-shrink-0">
              <div className="text-sm text-slate-500">
                  Total enviando: <strong className="text-amber-600 text-lg">{totalToSend}</strong> peças
              </div>
              <button
                onClick={handleSubmit}
                disabled={!selectedSeamstressId || totalToSend === 0}
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg shadow-md flex items-center gap-2 transition-transform active:scale-95"
              >
                Confirmar Envio
                <ArrowRight size={18} />
              </button>
          </div>
      </div>
    </div>
  );
};