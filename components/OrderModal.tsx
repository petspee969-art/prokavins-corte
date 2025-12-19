
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Plus, Trash2, Calendar, Hash, Search, Info } from 'lucide-react';
import { ProductionOrder, OrderStatus, ProductionOrderItem, Fabric, Seamstress, ProductReference } from '../types';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: Omit<ProductionOrder, 'updatedAt'>) => void;
  references: ProductReference[];
  fabrics: Fabric[];
  seamstresses: Seamstress[];
  orderToEdit?: ProductionOrder | null;
  suggestedId?: string;
}

interface OrderItemInput {
  color: string;
  colorHex?: string;
  rollsUsed: number;
  piecesPerSize: number;
  estimatedPieces: number;
}

export const OrderModal: React.FC<OrderModalProps> = ({ isOpen, onClose, onSave, references, fabrics, seamstresses, orderToEdit, suggestedId }) => {
  const [customId, setCustomId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [fabric, setFabric] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItemInput[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Filtra referências com base no termo de busca
  const filteredReferences = useMemo(() => {
    if (!searchTerm) return [];
    return references.filter(r => 
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [references, searchTerm]);

  const selectedProduct = useMemo(() => 
    references.find(r => r.id === selectedProductId), 
    [references, selectedProductId]
  );

  useEffect(() => {
    if (isOpen) {
      if (orderToEdit) {
        setCustomId(orderToEdit.id);
        setOrderDate(new Date(orderToEdit.createdAt).toISOString().split('T')[0]);
        setReferenceCode(orderToEdit.referenceCode);
        setFabric(orderToEdit.fabric);
        setSelectedProductId(orderToEdit.referenceId);
        setNotes(orderToEdit.notes || '');
        setItems(orderToEdit.items.map(i => ({ 
          color: i.color, 
          colorHex: i.colorHex, 
          rollsUsed: i.rollsUsed, 
          piecesPerSize: i.piecesPerSizeEst,
          estimatedPieces: i.estimatedPieces
        })));
      } else {
        setCustomId(suggestedId || '');
        setOrderDate(new Date().toISOString().split('T')[0]);
        setReferenceCode('');
        setFabric('');
        setSelectedProductId('');
        setSearchTerm('');
        setNotes('');
        setItems([]);
      }
    }
  }, [isOpen, orderToEdit, suggestedId]);

  // Ao selecionar um produto, automatiza tecido e cores
  const handleSelectProduct = (product: ProductReference) => {
    setSelectedProductId(product.id);
    setReferenceCode(product.code);
    setFabric(product.defaultFabric);
    setSearchTerm(product.code);
    setIsSearching(false);
    
    // Inicializa cores do produto
    const initialItems = product.defaultColors.map(color => ({
      color: color.name,
      colorHex: color.hex,
      rollsUsed: 0,
      piecesPerSize: 0,
      estimatedPieces: 0
    }));
    setItems(initialItems);
  };

  const updateItem = (index: number, field: keyof OrderItemInput, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    // Se mudar rolos e houver estimativa no produto, calcula peças
    if (field === 'rollsUsed' && selectedProduct?.estimatedPiecesPerRoll) {
      const rolls = parseFloat(value) || 0;
      item.estimatedPieces = Math.round(rolls * selectedProduct.estimatedPiecesPerRoll);
      // Opcional: atualizar peças/tamanho se quiser manter coerência
      item.piecesPerSize = Math.round(item.estimatedPieces / 4); // Assume padrão 4 tamanhos
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { color: '', colorHex: '#ccc', rollsUsed: 0, piecesPerSize: 0, estimatedPieces: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert("Selecione uma referência válida.");
      return;
    }

    const productionItems: ProductionOrderItem[] = items.map(item => {
      const selectedSizes = ['P', 'M', 'G', 'GG']; 
      const initialSizes: any = {};
      selectedSizes.forEach(s => initialSizes[s] = item.piecesPerSize);
      return {
        color: item.color,
        colorHex: item.colorHex || '#ccc',
        rollsUsed: item.rollsUsed,
        piecesPerSizeEst: item.piecesPerSize,
        estimatedPieces: item.estimatedPieces,
        actualPieces: 0, 
        sizes: initialSizes
      };
    });

    onSave({
      id: customId,
      referenceId: selectedProductId,
      referenceCode,
      description: selectedProduct?.description || referenceCode,
      fabric,
      items: productionItems,
      activeCuttingItems: [],
      splits: [],
      gridType: 'STANDARD',
      status: OrderStatus.PLANNED,
      notes,
      createdAt: new Date(orderDate).toISOString()
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-xl font-bold text-slate-800">{orderToEdit ? 'Editar Ordem' : 'Nova Ordem'}</h2>
          <button onClick={onClose}><X size={24} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Pedido #</label><input required type="text" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={customId} onChange={e => setCustomId(e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Data</label><input required type="date" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={orderDate} onChange={e => setOrderDate(e.target.value)} /></div>
          </div>
          
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Buscar Referência</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                required 
                type="text" 
                placeholder="Digite o código ou nome do produto..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={searchTerm} 
                onChange={e => { setSearchTerm(e.target.value); setIsSearching(true); }}
                onFocus={() => setIsSearching(true)}
              />
            </div>
            
            {isSearching && filteredReferences.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {filteredReferences.map(ref => (
                  <button 
                    key={ref.id} 
                    type="button" 
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b last:border-0 border-slate-100 transition-colors flex justify-between items-center"
                    onClick={() => handleSelectProduct(ref)}
                  >
                    <div>
                      <span className="font-bold text-indigo-700">{ref.code}</span>
                      <span className="text-xs text-slate-400 ml-2">{ref.description}</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full text-slate-500">{ref.defaultFabric}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tecido</label>
              <input 
                readOnly 
                className="w-full px-4 py-2 rounded-lg border bg-slate-50 text-slate-600 outline-none cursor-not-allowed" 
                value={fabric} 
                placeholder="Selecione uma referência..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                Cores e Estimativa 
                {selectedProduct && <span className="text-[10px] text-indigo-500 normal-case font-medium">(Rendimento: {selectedProduct.estimatedPiecesPerRoll} pçs/rolo)</span>}
              </h3>
              <button type="button" onClick={handleAddItem} className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Plus size={14}/> Nova Cor</button>
            </div>
            
            <div className="space-y-2">
              {items.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400">
                  <Info className="mx-auto mb-2 opacity-20" size={24}/>
                  <p className="text-xs italic">Selecione uma referência para listar as cores.</p>
                </div>
              )}
              {items.map((item, idx) => (
                <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 items-end">
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cor</label>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full border border-white shadow-sm" style={{backgroundColor: item.colorHex || '#ccc'}}></div>
                      <input required placeholder="Cor" className="w-full px-3 py-1.5 rounded-lg border bg-white text-sm focus:ring-2 focus:ring-indigo-500" value={item.color} onChange={e => updateItem(idx, 'color', e.target.value)} />
                    </div>
                  </div>
                  <div className="w-24">
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Rolos</label>
                    <input required type="number" step="0.1" className="w-full px-3 py-1.5 rounded-lg border bg-white text-sm font-bold text-indigo-700" value={item.rollsUsed || ''} onChange={e => updateItem(idx, 'rollsUsed', e.target.value)} />
                  </div>
                  <div className="w-28">
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Est. Total</label>
                    <input required type="number" className="w-full px-3 py-1.5 rounded-lg border bg-indigo-50 border-indigo-100 text-sm font-black text-indigo-900" value={item.estimatedPieces || ''} onChange={e => updateItem(idx, 'estimatedPieces', parseInt(e.target.value))} />
                  </div>
                  <div className="w-28 hidden sm:block">
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Pçs/Tamanho</label>
                    <input required type="number" className="w-full px-3 py-1.5 rounded-lg border bg-white text-sm" value={item.piecesPerSize || ''} onChange={e => updateItem(idx, 'piecesPerSize', parseInt(e.target.value))} />
                  </div>
                  <button type="button" onClick={() => handleRemoveItem(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-2xl">
             <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Observações do Pedido</label>
             <textarea 
               className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
               rows={3}
               value={notes}
               onChange={e => setNotes(e.target.value)}
               placeholder="Instruções especiais de corte ou separação..."
             />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium">Cancelar</button><button type="submit" className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-lg"><Save size={18} /> Salvar Ordem</button></div>
        </form>
      </div>
    </div>
  );
}
