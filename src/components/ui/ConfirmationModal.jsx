import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

const ConfirmationModal = ({ isOpen, title, message, type = 'confirm', onConfirm, onCancel, confirmText = 'Confirmer', cancelText = 'Annuler' }) => {
    if (!isOpen) return null;

    const isDestructive = type === 'danger';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 scale-100">
                <div className="p-6">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                        {isDestructive ? <AlertTriangle className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
                </div>

                <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-800 border border-transparent hover:border-slate-200 rounded-lg transition-all"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-all transform active:scale-[0.98] ${isDestructive
                                ? 'bg-red-500 hover:bg-red-600 hover:shadow-red-500/20'
                                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/20'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
