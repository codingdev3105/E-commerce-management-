import { Truck, X, User, Phone, MapPin } from 'lucide-react';
import { useUI } from '../../../context/UIContext';

export default function OrderDetailsModal({ order, onClose }) {
    const { toast } = useUI();

    const handleCopyDriver = (e) => {
        e.stopPropagation();
        const text = `${order.driver_name || ''} ${order.driver_phone || ''}`.trim();
        if (text) {
            navigator.clipboard.writeText(text);
            toast.success("Info livreur copiée !");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Truck className="w-5 h-5 text-blue-600" />
                            Détails de la commande
                        </h3>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                            <span className="font-mono bg-white px-1.5 rounded border border-slate-200">Ref: {order.reference}</span>
                            <span className="font-mono bg-white px-1.5 rounded border border-slate-200">Track: {order.tracking}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col md:flex-row gap-6 max-h-[70vh] overflow-y-auto">
                    <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Statut Actuel</div>
                                <div className="text-base font-bold text-slate-800 mt-0.5">{order.status || order.state}</div>
                            </div>
                            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                                <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Montant Total</div>
                                <div className="text-base font-bold text-emerald-700 mt-0.5">{order.amount || order.montant} DA</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Client</h4>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 text-sm space-y-2">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-slate-400" />
                                    <span className="font-bold text-slate-700">{order.client}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span className="font-mono">{order.phone}</span>
                                </div>
                                <div className="flex items-start gap-2 pt-2 border-t border-slate-50">
                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-slate-700">{order.wilaya_name || order.wilaya}, {order.commune}</div>
                                        <div className="text-slate-500 text-xs">{order.address || order.adresse}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Livreur</h4>
                            {(order.driver_name || order.driver_phone) ? (
                                <div
                                    onClick={handleCopyDriver}
                                    className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-indigo-800 cursor-pointer hover:bg-indigo-100 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center">
                                        <Truck className="w-4 h-4 text-indigo-700" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">{order.driver_name}</div>
                                        <div className="font-mono text-xs">{order.driver_phone}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    Pas de livreur assigné pour le moment.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Historique de suivi</h4>
                        <div className="relative pl-4 border-l-2 border-slate-100 space-y-6">
                            {(order.activities || []).map((act, idx) => (
                                <div key={idx} className="relative">
                                    <div className={`absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${idx === 0 ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-slate-300'}`}></div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm font-bold ${idx === 0 ? 'text-blue-700' : 'text-slate-700'}`}>{act.event}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 font-mono">{act.date}</span>
                                        {act.content && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-1 italic">"{act.content}"</p>}
                                    </div>
                                </div>
                            ))}
                            {(!order.activities || order.activities.length === 0) && <div className="text-sm text-slate-400 italic">Aucune activité enregistrée</div>}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}
