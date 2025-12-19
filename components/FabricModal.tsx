
import React, { useState, useEffect } from 'react';
import { X, Save, Palette, Layers, FileText, PlusCircle } from 'lucide-react';
import { Fabric } from '../types';

interface FabricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fabric: Omit<Fabric, 'id' | 'createdAt' | 'updatedAt'> | Fabric) => void;
  fabricToEdit?: Fabric | null;
  entryMode?: boolean; // New prop for auto-summing entry
}

export const FabricModal: React.FC<FabricModalProps> = ({ isOpen, onClose, onSave, fabricToEdit, entryMode = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    color: '',
    colorHex: '#000000',
    stockRolls: 0,
    notes: ''
  });

  const [addedRolls, setAddedRolls] = useState(0);

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
      setAddedRolls(0);
    }
  }, [isOpen, fabricToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalStock = formData.stockRolls;
    if (entryMode && fabricToEdit) {
        finalStock = (fabricToEdit.stockRolls || 0) + addedRolls;
    }

    if (fabricToEdit) {
      onSave({ ...formData, stockRolls: finalStock, id: fabricToEdit.id } as Fabric);
    } else {
      onSave({ ...formData, stockRolls: finalStock });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-indigo-50/50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {entryMode ? <PlusCircle className="text-indigo-600" size={24}/> : <Layers className="text-indigo-600" size={24}/>}
            {entryMode ? `Entrada: ${formData.name}` : (fabricToEdit ? 'Editar Cadastro' : 'Novo Tecido')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {!entryMode && (
            <>
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
            </>
          )}

          {entryMode ? (
            <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-200 text-center animate-in zoom-in-95 duration-200">
                <p className="text-sm font-bold text-indigo-900 mb-4 uppercase tracking-widest">Quanto você deseja adicionar?</p>
                <div className="flex items-center justify-center gap-4">
                   <div className="text-left">
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Estoque Atual</p>
                       <p className="text-xl font-bold text-slate-500">{formData.stockRolls}</p>
                   </div>
                   <PlusCircle className="text-indigo-400" size={32}/>
                   <div>
                       <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Nova Entrada</label>
                       <input
                        autoFocus
                        required
                        type="number"
                        step="0.1"
                        min="0"
                        className="w-24 px-4 py-3 rounded-xl border-2 border-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none text-2xl font-black text-indigo-700"
                        value={addedRolls || ''}
                        onChange={e => setAddedRolls(parseFloat(e.target.value) || 0)}
                        />
                   </div>
                </div>
                <div className="mt-6 pt-4 border-t border-indigo-100">
                   <p className="text-sm text-indigo-800">
                       Saldo final após salvar: <strong className="text-indigo-950 text-lg">{(formData.stockRolls + addedRolls).toFixed(1)}</strong> rolos
                   </p>
                </div>
            </div>
          ) : (
            <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    Estoque Atual (Rolos)
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
                 <p className="text-xs text-slate-400 mt-1">Saldo total em estoque.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <FileText size={16}/> Observações {entryMode && '(Opcional)'}
            </label>
            <textarea
              rows={2}
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
              className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-200"
            >
              <Save size={18} />
              {entryMode ? 'Confirmar Entrada' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
