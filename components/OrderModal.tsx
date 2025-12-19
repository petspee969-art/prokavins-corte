import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, AlertCircle, Calendar, Hash, Check } from 'lucide-react';
import { ProductReference, GridType, ProductionOrder, OrderStatus, ProductionOrderItem, ProductColor } from '../types';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: Omit<ProductionOrder, 'updatedAt'>) => void;
  references: ProductReference[];
  orderToEdit?: ProductionOrder | null;
  suggestedId?: string;
}

interface OrderItemInput {
  color: string;
  colorHex?: string;
  rollsUsed: number;
  piecesPerSize: number;
}

export const OrderModal: React.FC<OrderModalProps> = ({ isOpen, onClose, onSave, references, orderToEdit, suggestedId }) => {
  // Order Identification
  const [customId, setCustomId] = useState('');
  const [orderDate, setOrderDate] = useState('');

  // Selection State
  const [selectedRefId, setSelectedRefId] = useState('');
  const [fabric, setFabric] = useState('');
  const [gridType, setGridType] = useState<GridType>('STANDARD');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  
  // List of items (Color + Rolls + Estimate)
  const [items, setItems] = useState<OrderItemInput[]>([{ color: '', colorHex: '', rollsUsed: 0, piecesPerSize: 0 }]);

  // Derived state
  const selectedRef = references.find(r => r.id === selectedRefId);

  useEffect(() => {
    if (isOpen) {
      if (orderToEdit) {
        // Pre-fill form for editing
        setCustomId(orderToEdit.id);
        setOrderDate(new Date(orderToEdit.createdAt).toISOString().split('T')[0]);
        setSelectedRefId(orderToEdit.referenceId);
        setFabric(orderToEdit.fabric);
        setGridType(orderToEdit.gridType);
        setNotes(orderToEdit.notes || '');

        // Reconstruct items input
        const editItems = orderToEdit.items.map(i => ({
          color: i.color,
          colorHex: i.colorHex,
          rollsUsed: i.rollsUsed,
          piecesPerSize: i.piecesPerSizeEst
        }));
        setItems(editItems);

        // Reconstruct selected sizes based on the first item's estimate keys
        if (orderToEdit.gridType === 'STANDARD') setSelectedSizes(['P', 'M', 'G', 'GG']);
        else if (orderToEdit.gridType === 'PLUS') setSelectedSizes(['G1', 'G2', 'G3']);
        else if (orderToEdit.items.length > 0) {
            // Try to infer from first item sizes even if estimated
            setSelectedSizes(Object.keys(orderToEdit.items[0].sizes || {}));
        }

      } else {
        resetForm();
      }
    }
  }, [isOpen, orderToEdit, suggestedId]);

  useEffect(() => {
    // Only auto-update if NOT editing (to avoid overwriting existing data when loading ref)
    if (selectedRef && !orderToEdit) {
      setGridType(selectedRef.defaultGrid);
      updateSizesFromGrid(selectedRef.defaultGrid);
      setFabric(selectedRef.defaultFabric || '');
      setItems([{ color: '', colorHex: '', rollsUsed: 0, piecesPerSize: 0 }]);
    }
  }, [selectedRef]);

  // Recalculate estimates whenever selectedSizes changes
  useEffect(() => {
    if (selectedRef?.estimatedPiecesPerRoll && selectedSizes.length > 0) {
        setItems(prevItems => prevItems.map(item => {
            if (item.rollsUsed > 0) {
                 const totalEstimated = item.rollsUsed * (selectedRef.estimatedPiecesPerRoll || 0);
                 const avgPerSize = Math.floor(totalEstimated / selectedSizes.length);
                 return { ...item, piecesPerSize: avgPerSize };
            }
            return item;
        }));
    }
  }, [selectedSizes, selectedRef]);

  const resetForm = () => {
    setCustomId(suggestedId || '');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setSelectedRefId('');
    setFabric('');
    setGridType('STANDARD');
    updateSizesFromGrid('STANDARD');
    setNotes('');
    setItems([{ color: '', colorHex: '', rollsUsed: 0, piecesPerSize: 0 }]);
  };

  const updateSizesFromGrid = (type: GridType) => {
    if (type === 'STANDARD') setSelectedSizes(['P', 'M', 'G', 'GG']);
    else if (type === 'PLUS') setSelectedSizes(['G1', 'G2', 'G3']);
    else setSelectedSizes([]);
  };

  const handleAddItem = () => {
    setItems([...items, { color: '', colorHex: '', rollsUsed: 0, piecesPerSize: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof OrderItemInput, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // AUTOMATION: If changing rolls and product has estimated yield, calculate pieces per size
    if (field === 'rollsUsed' && selectedRef?.estimatedPiecesPerRoll && selectedSizes.length > 0) {
        const rolls = parseFloat(value) || 0;
        const totalEstimated = rolls * selectedRef.estimatedPiecesPerRoll;
        // Distribute average across sizes
        const avgPerSize = Math.floor(totalEstimated / selectedSizes.length);
        newItems[index].piecesPerSize = avgPerSize;
    }

    setItems(newItems);
  };

  const selectColorForItem = (index: number, color: ProductColor) => {
    const newItems = [...items];
    newItems[index] = { 
        ...newItems[index], 
        color: color.name, 
        colorHex: color.hex 
    };
    setItems(newItems);
  };

  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter(s => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRef) return;

    const productionItems: ProductionOrderItem[] = items.map(item => {
      // Calculate sizes based on current form input
      const initialSizes: any = {};
      selectedSizes.forEach(s => initialSizes[s] = item.piecesPerSize);
      
      const totalEstimated = item.piecesPerSize * selectedSizes.length;

      const existingItem = orderToEdit?.items.find(i => i.color === item.color);

      // CRITICAL LOGIC: 
      // If the cut has already been confirmed (activeCuttingItems exist), we MUST preserve the exact sizes saved previously.
      // If the cut has NOT been confirmed (empty activeItems), we SHOULD update the sizes based on the new input values.
      const isCutConfirmed = orderToEdit && orderToEdit.activeCuttingItems && orderToEdit.activeCuttingItems.length > 0;
      
      const finalSizes = (existingItem && isCutConfirmed) ? existingItem.sizes : initialSizes;

      return {
        color: item.color,
        colorHex: item.colorHex || '#ccc',
        rollsUsed: item.rollsUsed,
        piecesPerSizeEst: item.piecesPerSize,
        estimatedPieces: totalEstimated,
        actualPieces: existingItem ? existingItem.actualPieces : 0, 
        sizes: finalSizes
      };
    });

    const newOrder: Omit<ProductionOrder, 'updatedAt'> = {
      id: customId,
      referenceId: selectedRef.id,
      referenceCode: selectedRef.code,
      description: selectedRef.description,
      fabric: fabric,
      items: productionItems,
      // Preserve state if editing
      activeCuttingItems: orderToEdit ? orderToEdit.activeCuttingItems : [],
      splits: orderToEdit ? orderToEdit.splits : [],
      gridType: gridType,
      status: orderToEdit ? orderToEdit.status : OrderStatus.PLANNED,
      notes: notes,
      createdAt: new Date(orderDate).toISOString()
    };

    onSave(newOrder);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
                {orderToEdit ? 'Editar Ordem de Produção' : 'Nova Ordem de Produção'}
            </h2>
            <p className="text-xs text-slate-500">
                {orderToEdit ? 'Atualize os dados necessários.' : 'Preencha os dados do corte para iniciar.'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8 flex-1">
          
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1">
                    <Hash size={12}/> Número do Pedido (ID)
                </label>
                <input
                    required
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-mono font-bold text-indigo-700 disabled:opacity-50"
                    value={customId}
                    onChange={e => setCustomId(e.target.value)}
                    placeholder="Ex: 1054"
                    disabled={!!orderToEdit} // Lock ID editing
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1">
                    <Calendar size={12}/> Data do Pedido
                </label>
                <input
                    required
                    type="date"
                    className="w-full px-4 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    value={orderDate}
                    onChange={e => setOrderDate(e.target.value)}
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Referência (Produto)</label>
              <select
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                value={selectedRefId}
                onChange={e => setSelectedRefId(e.target.value)}
              >
                <option value="">Selecione uma referência...</option>
                {references.map(ref => (
                  <option key={ref.id} value={ref.id}>{ref.code} - {ref.description}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tecido Principal</label>
              <input
                required
                type="text"
                placeholder="Ex: Viscose"
                className={`w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none ${selectedRef ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'}`}
                value={fabric}
                onChange={e => setFabric(e.target.value)}
                disabled={!!selectedRef} // Disable if reference is selected
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6"></div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                Configuração da Grade
                <span className="text-xs font-normal text-slate-400">(Tamanhos que serão cortados)</span>
              </h3>
              <div className="flex gap-2">
                 {(['STANDARD', 'PLUS', 'CUSTOM'] as GridType[]).map(type => (
                   <button
                    key={type}
                    type="button"
                    onClick={() => { setGridType(type); updateSizesFromGrid(type); }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      gridType === type 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                   >
                     {type === 'STANDARD' ? 'Padrão (P-GG)' : type === 'PLUS' ? 'Plus (G1-G3)' : 'Personalizado'}
                   </button>
                 ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
               <div className="flex flex-wrap gap-3">
                 {gridType === 'CUSTOM' ? (
                   <>
                     {['P','M','G','GG','G1','G2','G3'].map(size => (
                       <label key={size} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
                         <input 
                            type="checkbox" 
                            checked={selectedSizes.includes(size)}
                            onChange={() => toggleSize(size)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                         />
                         <span className="text-sm font-medium text-slate-700">{size}</span>
                       </label>
                     ))}
                   </>
                 ) : (
                   <div className="flex gap-4 w-full justify-center">
                      {selectedSizes.map(size => (
                        <div key={size} className="w-12 h-12 rounded-full bg-white border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 shadow-sm">
                          {size}
                        </div>
                      ))}
                      {selectedSizes.length === 0 && <span className="text-slate-400 italic text-sm">Nenhum tamanho selecionado</span>}
                   </div>
                 )}
               </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6"></div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-700">Detalhes do Corte (Cores e Rolos)</h3>
              <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 flex items-center gap-1">
                <AlertCircle size={12} />
                Selecione as cores cadastradas para este produto.
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3 items-start p-4 bg-slate-50 rounded-xl border border-slate-200 relative group">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-2">Cor do Corte</label>
                    
                    {selectedRef ? (
                        <div className="flex flex-wrap gap-2">
                            {selectedRef.defaultColors.map((colorObj, cIdx) => (
                                <button
                                    key={cIdx}
                                    type="button"
                                    onClick={() => selectColorForItem(index, colorObj)}
                                    className={`px-3 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                                        item.color === colorObj.name 
                                        ? 'bg-white border-indigo-500 ring-1 ring-indigo-500 shadow-sm' 
                                        : 'bg-white border-slate-200 hover:border-indigo-300'
                                    }`}
                                >
                                    <div 
                                        className="w-4 h-4 rounded-full border border-slate-100 shadow-sm" 
                                        style={{ backgroundColor: colorObj.hex }}
                                    ></div>
                                    <span className={`text-sm ${item.color === colorObj.name ? 'font-bold text-indigo-900' : 'text-slate-600'}`}>
                                        {colorObj.name}
                                    </span>
                                    {item.color === colorObj.name && <Check size={14} className="text-indigo-600 ml-1"/>}
                                </button>
                            ))}
                            {selectedRef.defaultColors.length === 0 && (
                                <p className="text-xs text-red-400 italic mt-2">Este produto não tem cores cadastradas.</p>
                            )}
                        </div>
                    ) : (
                        <div className="text-xs text-slate-400 italic p-2">Selecione uma referência primeiro.</div>
                    )}
                    
                  </div>

                  <div className="flex gap-3 items-end">
                      <div className="w-24">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Qtd Rolos</label>
                        <input 
                          required
                          type="number"
                          min="0.1"
                          step="0.1"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                          value={item.rollsUsed || ''}
                          onChange={e => updateItem(index, 'rollsUsed', e.target.value)}
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Peças p/ Tam.</label>
                        <input 
                          required
                          type="number"
                          min="1"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-indigo-600"
                          value={item.piecesPerSize || ''}
                          onChange={e => updateItem(index, 'piecesPerSize', parseInt(e.target.value))}
                        />
                      </div>
                      
                      <div className="w-20 pb-2 text-xs text-slate-400 font-mono text-center">
                        Total Est.: <br/>
                        <span className="font-bold text-slate-600">{(item.piecesPerSize || 0) * selectedSizes.length}</span>
                      </div>

                      <button 
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mb-[1px]"
                        disabled={items.length === 1}
                      >
                        <Trash2 size={18} />
                      </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Plus size={16} />
              Adicionar outra cor
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações Gerais</label>
            <textarea
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 sticky bottom-0 bg-white pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-2 shadow-lg shadow-indigo-200"
            >
              <Save size={18} />
              {orderToEdit ? 'Atualizar Ordem' : 'Criar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}