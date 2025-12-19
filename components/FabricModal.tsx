
import React, { useState, useEffect } from 'react';
import { X, Save, Palette, Layers, FileText, PlusCircle, ArrowRight } from 'lucide-react';
import { Fabric } from '../types';

interface FabricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fabric: Omit<Fabric, 'id' | 'createdAt' | 'updatedAt'> | Fabric) => void;
  fabricToEdit?: Fabric | null;
  entryMode?: boolean; 
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {entryMode ? <PlusCircle className="text-blue-600" size={24}/> : <Layers className="text-indigo-600" size={24}/>}
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
                <label className="block text-sm font-medium text-slate-700 mb-1 uppercase text-[10px] font-bold">Tipo de Tecido</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Viscose, Linho"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 uppercase text-[10px] font-bold">Cor e Tonalidade</label>
                <div className="flex gap-2">
                   <input 
                      type="color" 
                      value={formData.colorHex}
                      onChange={e => setFormData({...formData, colorHex: e.target.value})}
                      className="h-10 w-12 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                   <input
                      required
                      type="text"
                      placeholder="Ex: Azul Marinho"
                      className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      value={formData.color}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                    />
                </div>
              </div>
            </>
          )}

          {entryMode ? (
            <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-200 text-center space-y-4">
                <p className="text-xs font-black text-blue-900 uppercase tracking-widest">Informar nova entrada</p>
                
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                   <div className="text-left">
                       <p className="text-[9px] font-bold text-slate-400 uppercase">Estoque Atual</p>
                       <p className="text-xl font-black text-slate-700">{formData.stockRolls}</p>
                   </div>
                   <div className="h-8 w-[1px] bg-blue-100"></div>
                   <div className="text-right">
                       <label className="block text-[9px] font-bold text-blue-600 uppercase mb-1">Novos Rolos (+)</label>
                       <input
                        autoFocus
                        required
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        className="w-24 px-2 py-1 rounded-lg border-2 border-blue-400 focus:ring-2 focus:ring-blue-500 outline-none text-xl font-black text-blue-700 text-center"
                        value={addedRolls || ''}
                        onChange={e => setAddedRolls(parseFloat(e.target.value) || 0)}
                        />
                   </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                   <div className="px-3 py-1 bg-white rounded-full border border-blue-200 text-xs font-bold text-blue-800 flex items-center gap-2">
                       Novo Saldo: <ArrowRight size={12}/> <span className="text-lg">{(formData.stockRolls + addedRolls).toFixed(1)}</span> rolos
                   </div>
                </div>
            </div>
          ) : (
            <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1 uppercase text-[10px] font-bold">Estoque Total (Rolos)</label>
                 <input
                   required
                   type="number"
                   step="0.1"
                   min="0"
                   className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold text-slate-700"
                   value={formData.stockRolls}
                   onChange={e => setFormData({ ...formData, stockRolls: parseFloat(e.target.value) || 0 })}
                 />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 uppercase text-[10px] font-bold flex items-center gap-2">
                <FileText size={14}/> Observações {entryMode && '(Opcional)'}
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Lote novo, Fornecedor X..."
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-slate-500 hover:bg-slate-50 font-medium transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-6 py-2 rounded-lg text-white font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95 ${entryMode ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
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
