import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const Toast = ({ id, type, message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [id, onClose]);

    const styles = {
        success: 'bg-white border-l-4 border-green-500 text-slate-800',
        error: 'bg-white border-l-4 border-red-500 text-slate-800',
        warning: 'bg-white border-l-4 border-orange-500 text-slate-800',
        info: 'bg-white border-l-4 border-blue-500 text-slate-800',
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-orange-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg shadow-slate-200 border border-slate-100 min-w-[300px] animate-in slide-in-from-right-full transition-all ${styles[type] || styles.info}`}>
            {icons[type] || icons.info}
            <p className="text-sm font-medium flex-1">{message}</p>
            <button onClick={() => onClose(id)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} onClose={removeToast} />
            ))}
        </div>
    );
};

export default ToastContainer;
