import React, { useState, useEffect } from 'react';
import { X, Save, User, MapPin, Phone, Scissors } from 'lucide-react';
import { Seamstress } from '../types';

interface SeamstressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (seamstress: Omit<Seamstress, 'id'> | Seamstress) => void;
  seamstressToEdit?: Seamstress | null;
}

export const SeamstressModal: React.FC<SeamstressModalProps> = ({ isOpen, onClose, onSave, seamstressToEdit }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    specialty: '',
    address: '',
    city: '',
    active: true
  });

  useEffect(() => {
    if (isOpen) {
      if (seamstressToEdit) {
        setFormData({
          name: seamstressToEdit.name,
          phone: seamstressToEdit.phone,
          specialty: seamstressToEdit.specialty,
          address: seamstressToEdit.address || '',
          city: seamstressToEdit.city || '',
          active: seamstressToEdit.active
        });
      } else {
        setFormData({ name: '', phone: '', specialty: '', address: '', city: '', active: true });
      }
    }
  }, [isOpen, seamstressToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (seamstressToEdit) {
      onSave({ ...formData, id: seamstressToEdit.id });
    } else {
      onSave(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {seamstressToEdit ? 'Editar Costureira' : 'Nova Costureira'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <User size={16}/> Nome Completo
            </label>
            <input
              required
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Phone size={16}/> Celular / WhatsApp
            </label>
            <input
              required
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Scissors size={16}/> Especialidade (Ex: Reta, Overloque)
             </label>
             <input
               type="text"
               className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
               value={formData.specialty}
               onChange={e => setFormData({ ...formData, specialty: e.target.value })}
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <MapPin size={16}/> Endereço
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
             </div>
          </div>
          
          <div className="flex items-center gap-2 pt-2">
             <input 
                type="checkbox" 
                id="active"
                checked={formData.active}
                onChange={e => setFormData({...formData, active: e.target.checked})}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
             />
             <label htmlFor="active" className="text-sm text-slate-700">Costureira Ativa</label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
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
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};