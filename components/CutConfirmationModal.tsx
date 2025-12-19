import React, { useState, useEffect } from 'react';
import { X, Scissors, ArrowRight, Check } from 'lucide-react';
import { ProductionOrder, ProductionOrderItem } from '../types';

interface CutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  onConfirm: (updatedItems: ProductionOrderItem[], activeItems: ProductionOrderItem[]) => void;
}

export const CutConfirmationModal: React.FC<CutConfirmationModalProps> = ({ isOpen, onClose, order, onConfirm }) => {
  const [itemsData, setItemsData] = useState<ProductionOrderItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  useEffect(() => {
    if (order && isOpen) {
      // Deep copy to edit
      const initialItems: ProductionOrderItem[] = JSON.parse(JSON.stringify(order.items));
      
      // FIX: If actualPieces is 0 (first time confirming), calculate it based on the sizes (which hold the estimates)
      initialItems.forEach(item => {
        if (item.actualPieces === 0 && item.sizes) {
          const totalFromSizes = Object.values(item.sizes).reduce((acc: number, curr: number | undefined) => acc + (curr || 0), 0);
          if (totalFromSizes > 0) {
            item.actualPieces = totalFromSizes;
          }
        }
      });

      setItemsData(initialItems);
      setActiveItemIndex(0);
    }
  }, [order, isOpen]);

  if (!isOpen || !order || itemsData.length === 0) return null;

  const currentItem = itemsData[activeItemIndex];

  const handleSizeChange = (sizeKey: string, value: string) => {
    const newVal = parseInt(value) || 0;
    const newItems = [...itemsData];
    
    // Update size
    newItems[activeItemIndex].sizes = {
      ...newItems[activeItemIndex].sizes,
      [sizeKey]: newVal
    };
    
    // Update actualPieces count
    const total = Object.values(newItems[activeItemIndex].sizes).reduce((acc: number, curr: number | undefined) => acc + (curr || 0), 0);
    newItems[activeItemIndex].actualPieces = total;

    setItemsData(newItems);
  };

  const handleNext = () => {
    if (activeItemIndex < itemsData.length - 1) {
      setActiveItemIndex(activeItemIndex + 1);
    }
  };

  const handlePrev = () => {
    if (activeItemIndex > 0) {
      setActiveItemIndex(activeItemIndex - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final consistency check
    const finalizedItems = itemsData.map(item => {
        const total = Object.values(item.sizes).reduce((acc: number, curr: number | undefined) => acc + (curr || 0), 0);
        return { ...item, actualPieces: total };
    });

    // When confirming cut, the active items in cutting room equal the total confirmed items (initially)
    const activeItems = JSON.parse(JSON.stringify(finalizedItems));

    onConfirm(finalizedItems, activeItems);
    onClose();
  };

  // Ensure all sizes from the grid exist in keys
  const sizeKeys = Object.keys(currentItem.sizes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-t-2xl text-white flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Scissors size={20} />
                Confirmar Corte
              </h2>
              <p className="text-purple-100 text-sm mt-1">
                Cor {activeItemIndex + 1} de {itemsData.length}: <strong className="text-white bg-white/20 px-2 py-0.5 rounded">{currentItem.color}</strong>
              </p>
            </div>
            <button onClick={onClose} className="text-purple-200 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Estimativa ({currentItem.color}):</span>
              <span className="font-bold text-slate-700">{currentItem.estimatedPieces} peças</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="font-bold text-indigo-900">Total Real:</span>
              <span className={`font-bold ${currentItem.actualPieces > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {currentItem.actualPieces} peças
              </span>
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-700 mb-3">Distribuição Real ({currentItem.color})</h3>
          <div className="grid grid-cols-2 gap-4">
            {sizeKeys.map((sizeKey) => (
              <div key={sizeKey}>
                <label className="block text-xs font-bold text-slate-500 mb-1 text-center bg-slate-100 rounded py-1">
                  {sizeKey}
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 text-center text-lg font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  value={currentItem.sizes[sizeKey] || 0}
                  onChange={(e) => handleSizeChange(sizeKey, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white rounded-b-2xl flex justify-between gap-3 flex-shrink-0">
          {activeItemIndex > 0 ? (
            <button 
              type="button" 
              onClick={handlePrev}
              className="px-4 py-2 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium"
            >
              Voltar
            </button>
          ) : (
            <div></div> // Spacer
          )}

          {activeItemIndex < itemsData.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"
            >
              Próxima Cor
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-emerald-200 flex items-center gap-2"
            >
              Confirmar Tudo
              <Check size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};