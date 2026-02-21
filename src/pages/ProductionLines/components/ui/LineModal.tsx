import React, { useState, useEffect } from 'react';

// Define Props Interface
interface LineModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    line?: any;
}

const LineModal: React.FC<LineModalProps> = ({ isOpen, onClose, onSave, line }) => {
    const [formData, setFormData] = useState({
        code: '',
        nom: '',
        type: 'FSB',
        statut: 'active',
        efficacite: 0,
        cadence: 0,
        objectif: 0
    });

    useEffect(() => {
        if (line) {
            setFormData(line);
        } else {
            setFormData({
                code: '',
                nom: '',
                type: 'FSB',
                statut: 'active',
                efficacite: 0,
                cadence: 0,
                objectif: 0
            });
        }
    }, [line, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fadeIn">
                <h3 className="text-xl font-bold mb-4 dark:text-white">{line ? 'Modifier la Ligne' : 'Nouvelle Ligne'}</h3>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                            <input name="code" value={formData.code} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: FSB1" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                            <input name="nom" value={formData.nom} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Ligne FSB 1" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="FSB">FSB</option>
                                <option value="RSC">RSC</option>
                                <option value="RSB">RSB</option>
                                <option value="FSC">FSC</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statut</label>
                            <select name="statut" value={formData.statut} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="active">Active</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="stopped">Arrêt</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Efficacité (%)</label>
                            <input type="number" name="efficacite" value={formData.efficacite} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" min="0" max="100" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cadence (p/h)</label>
                            <input type="number" name="cadence" value={formData.cadence} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objectif</label>
                            <input type="number" name="objectif" value={formData.objectif} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors">
                        Annuler
                    </button>
                    <button onClick={() => onSave(formData)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LineModal;
