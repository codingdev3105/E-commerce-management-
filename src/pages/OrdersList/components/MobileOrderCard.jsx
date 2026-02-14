import { Eye, Truck, Home, RefreshCw, Trash2, Pencil, Send, Phone, MapPin, Check, Box, StickyNote, Calendar } from 'lucide-react';
import { getStateColor } from '../../common/orderUtils';

export default function MobileOrderCard({
    order,
    isSelected,
    toggleSelectRow,
    handleSendToNoest,
    handleDelete,
    setCurrentOrderId,
    setViewMode,
    expandedOrderId,
    setExpandedOrderId
}) {
    const isEditable = ['Nouvelle', 'Atelier'].some(s => (order.state || '').includes(s));

    return (
        <div className={`bg-white rounded-xl border transition-all duration-200 ${isSelected ? 'border-blue-500 shadow-md bg-blue-50/10' : 'border-slate-100 shadow-sm hover:border-slate-300'}`}>
            <div className="p-3">
                {/* Header: Ref, Date, State */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center p-2 rounded-full cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleSelectRow(order.rowId)}>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">#{order.reference}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                <span className="font-mono">{order.date}</span>
                            </div>
                        </div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${getStateColor(order.state)}`}>
                        {order.state || 'Nouveau'}
                    </span>
                </div>

                {/* Sub-Header: Client, Phone */}
                <div className="flex items-center justify-between px-1 mb-3">
                    <div className="font-bold text-slate-700 text-sm truncate max-w-[60%]">{order.client}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-mono">{order.phone}</span>
                    </div>
                </div>

                {/* Footer: Type & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        {order.isStopDesk ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                <Truck className="w-3 h-3" /> Stop Desk
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                <Home className="w-3 h-3" /> Domicile
                            </span>
                        )}
                        {order.isExchange && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                <RefreshCw className="w-3 h-3" /> Échange
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setExpandedOrderId(expandedOrderId === order.rowId ? null : order.rowId)}
                            className={`p-1.5 rounded border border-slate-200 transition-colors ${expandedOrderId === order.rowId ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                            title="Voir détails"
                        >
                            <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                            onClick={() => { setCurrentOrderId(order.rowId); setViewMode('edit'); }}
                            disabled={!isEditable}
                            className={`p-1.5 rounded border border-slate-200 transition-colors ${!isEditable
                                ? 'text-slate-200 cursor-not-allowed bg-slate-50'
                                : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                                }`}
                            title="Modifier"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                            onClick={() => handleSendToNoest(order.rowId, order.reference)}
                            disabled={!isEditable}
                            className={`p-1.5 rounded border border-slate-200 transition-colors ${isEditable
                                ? 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                                : 'text-slate-200 cursor-not-allowed hidden'
                                }`}
                            title="Envoyer vers Noest"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>

                        <button
                            onClick={() => handleDelete(order.rowId, order.reference)}
                            className={`p-1.5 rounded border border-slate-200 transition-colors ${isEditable
                                ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-slate-200 cursor-not-allowed opacity-50'
                                }`}
                            title="Supprimer"
                            disabled={!isEditable}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Expanded Details */}
                {expandedOrderId === order.rowId && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* Product & Price */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1">
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Produit</div>
                                <div className="flex items-start gap-1.5 text-slate-700 font-medium text-xs leading-relaxed">
                                    <Box className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                                    <span>
                                        {typeof order.product === 'object' ? JSON.stringify(order.product) : (order.product || <span className="italic text-slate-400">Non spécifié</span>)}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Prix</div>
                                <div className="text-sm font-bold text-emerald-700 whitespace-nowrap bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                    {order.amount} DA
                                </div>
                            </div>
                        </div>

                        {/* Remarque */}
                        {(order.note || order.remarque) && (
                            <div className="mb-3">
                                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 p-2 rounded-lg text-xs text-yellow-800">
                                    <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <span>{order.note || order.remarque}</span>
                                </div>
                            </div>
                        )}

                        {/* Location (Standard Info) */}
                        <div className="flex items-start gap-2 text-xs text-slate-600 mb-4 px-1">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400" />
                            <div>
                                <div className="font-medium">{order.wilaya_name || order.wilaya}</div>
                                <div className="text-slate-500 leading-tight">{order.commune}</div>
                            </div>
                        </div>

                        {/* Noest Info Section */}
                        {/* Noest Info Section - Only if Tracking exists */}
                        {order.tracking && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60 dashed">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="bg-slate-200 h-px flex-1"></span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Suivi Noest</span>
                                    <span className="bg-slate-200 h-px flex-1"></span>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-3">
                                    <div className="bg-white px-2 py-1 rounded border border-slate-200 text-[10px] font-mono text-slate-600">
                                        Track: <span className="font-bold text-blue-600 select-all">{order.tracking}</span>
                                    </div>
                                </div>

                                {(order.driver_name || order.driver_phone) && (
                                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg p-2 mb-4 text-indigo-800">
                                        <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center shrink-0">
                                            <Truck className="w-3 h-3 text-indigo-700" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-xs truncate">{order.driver_name}</div>
                                            <div className="font-mono text-[10px]">{order.driver_phone}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="relative pl-3 border-l border-slate-200 space-y-3">
                                    {(order.activities || []).map((act, idx) => (
                                        <div key={idx} className="relative">
                                            <div className={`absolute -left-[16.5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${idx === 0 ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-bold leading-tight ${idx === 0 ? 'text-blue-700' : 'text-slate-700'}`}>{act.event}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{act.date}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!order.activities || order.activities.length === 0) && <div className="text-xs text-slate-400 italic">Aucune activité enregistrée</div>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
