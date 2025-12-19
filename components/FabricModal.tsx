import React, { useState, useEffect } from 'react';
import { X, Save, Palette, Layers, FileText } from 'lucide-react';
import { Fabric } from '../types';

interface FabricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fabric: Omit<Fabric, 'id' | 'createdAt' | 'updatedAt'> | Fabric) => void;
  fabricToEdit?: Fabric | null;
}

export const FabricModal: React.FC<FabricModalProps> = ({ isOpen, onClose, onSave, fabricToEdit }) => {
  const [formData, setFormData] = useState({
    name: '',
    color: '',
    colorHex: '#000000',
    stockRolls: 0,
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (fabricToEdit) {
        setFormData({
          name: fabricToEdit.name,
          color: fabricToEdit.color,
          colorHex: fabricToEdit.colorHex,
          stockRolls: fabricToEdit.stockRolls,
          notes: fabricToEdit.notes || ''
        });
      } else {
        setFormData({ 
            name: '', 
            color: '', 
            colorHex: '#000000', 
            stockRolls: 0, 
            notes: '' 
        });
      }
    }
  }, [isOpen, fabricToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fabricToEdit) {
      onSave({ ...formData, id: fabricToEdit.id } as Fabric);
    } else {
      onSave(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-indigo-50/50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="text-indigo-600" size={24}/>
            {fabricToEdit ? 'Editar Estoque de Tecido' : 'Nova Entrada de Tecido'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Tecido</label>
            <input
              required
              type="text"
              placeholder="Ex: Viscose, Linho, Crepe"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
               <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                 <Palette size={16}/> Cor e Tonalidade
               </label>
               <div className="flex gap-3">
                  <div className="flex flex-col gap-1 items-center">
                    <input 
                      type="color" 
                      value={formData.colorHex}
                      onChange={e => setFormData({...formData, colorHex: e.target.value})}
                      className="h-10 w-14 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      required
                      type="text"
                      placeholder="Nome da Cor (Ex: Azul Marinho)"
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.color}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>
               </div>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                Quantidade (Rolos)
             </label>
             <input
               required
               type="number"
               step="0.1"
               min="0"
               className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-semibold text-slate-700"
               value={formData.stockRolls}
               onChange={e => setFormData({ ...formData, stockRolls: parseFloat(e.target.value) || 0 })}
             />
             <p className="text-xs text-slate-400 mt-1">Saldo atual em estoque.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <FileText size={16}/> Observações
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Lote 455, Fornecedor X..."
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-2"
            >
              <Save size={18} />
              Salvar Estoque
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
