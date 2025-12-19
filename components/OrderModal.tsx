
import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Calendar, Hash } from 'lucide-react';
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
}

export const OrderModal: React.FC<OrderModalProps> = ({ isOpen, onClose, onSave, fabrics, seamstresses, orderToEdit, suggestedId }) => {
  const [customId, setCustomId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [fabric, setFabric] = useState('');
  const [selectedSeamstressId, setSelectedSeamstressId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItemInput[]>([{ color: '', colorHex: '', rollsUsed: 0, piecesPerSize: 0 }]);

  useEffect(() => {
    if (isOpen) {
      if (orderToEdit) {
        setCustomId(orderToEdit.id);
        setOrderDate(new Date(orderToEdit.createdAt).toISOString().split('T')[0]);
        setReferenceCode(orderToEdit.referenceCode);
        setFabric(orderToEdit.fabric);
        setSelectedSeamstressId(orderToEdit.seamstressId || '');
        setNotes(orderToEdit.notes || '');
        setItems(orderToEdit.items.map(i => ({ color: i.color, colorHex: i.colorHex, rollsUsed: i.rollsUsed, piecesPerSize: i.piecesPerSizeEst })));
      } else {
        setCustomId(suggestedId || '');
        setOrderDate(new Date().toISOString().split('T')[0]);
        setReferenceCode('');
        setFabric('');
        setSelectedSeamstressId('');
        setNotes('');
        setItems([{ color: '', colorHex: '', rollsUsed: 0, piecesPerSize: 0 }]);
      }
    }
  }, [isOpen, orderToEdit, suggestedId]);

  const handleAddItem = () => setItems([...items, { color: '', colorHex: '', rollsUsed: 0, piecesPerSize: 0 }]);
  const handleRemoveItem = (index: number) => items.length > 1 && setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof OrderItemInput, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productionItems: ProductionOrderItem[] = items.map(item => {
      const selectedSizes = ['P', 'M', 'G', 'GG']; // Padrão simples
      const initialSizes: any = {};
      selectedSizes.forEach(s => initialSizes[s] = item.piecesPerSize);
      return {
        color: item.color,
        colorHex: item.colorHex || '#ccc',
        rollsUsed: item.rollsUsed,
        piecesPerSizeEst: item.piecesPerSize,
        estimatedPieces: item.piecesPerSize * selectedSizes.length,
        actualPieces: 0, 
        sizes: initialSizes
      };
    });

    onSave({
      id: customId,
      referenceId: Date.now().toString(),
      referenceCode,
      description: referenceCode,
      fabric,
      seamstressId: selectedSeamstressId,
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
          <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Referência (Digitar)</label><input required type="text" placeholder="Ex: REF-102" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={referenceCode} onChange={e => setReferenceCode(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tecido</label>
              <select required className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={fabric} onChange={e => setFabric(e.target.value)}>
                <option value="">Selecione...</option>
                {Array.from(new Set(fabrics.map(f => f.name))).map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Costureira (Opcional)</label>
              <select className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={selectedSeamstressId} onChange={e => setSelectedSeamstressId(e.target.value)}>
                <option value="">Nenhuma...</option>
                {seamstresses.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-xs font-bold text-slate-700 uppercase">Cores e Quantidades</h3><button type="button" onClick={handleAddItem} className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Plus size={14}/> Adicionar Cor</button></div>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <input required placeholder="Cor" className="flex-1 px-3 py-1 rounded border text-sm" value={item.color} onChange={e => updateItem(idx, 'color', e.target.value)} />
                <input required type="number" step="0.1" placeholder="Rolos" className="w-20 px-3 py-1 rounded border text-sm" value={item.rollsUsed || ''} onChange={e => updateItem(idx, 'rollsUsed', e.target.value)} />
                <input required type="number" placeholder="Peças/Tam" className="w-28 px-3 py-1 rounded border text-sm" value={item.piecesPerSize || ''} onChange={e => updateItem(idx, 'piecesPerSize', parseInt(e.target.value))} />
                <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium">Cancelar</button><button type="submit" className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-lg"><Save size={18} /> Salvar Ordem</button></div>
        </form>
      </div>
    </div>
  );
}
