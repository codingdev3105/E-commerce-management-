import React from 'react';
import { Eye, Truck, Home, Pencil, Send, Trash2 } from 'lucide-react';
import { getStateColor } from '../../common/orderUtils';

export default function OrdersTable({
    orders,
    loading,
    selectedOrders,
    isAllSelected,
    toggleSelectAll,
    toggleSelectRow,
    handleSingleSendToNoest,
    handleDeleteOrder,
    setSelectedNoestOrder,
    setCurrentOrderId,
    setViewMode
}) {
    return (
        <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        <th className="px-3 py-3 w-8 text-center">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={toggleSelectAll}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                        </th>
                        <th className="px-3 py-3">Ref & Date</th>
                        <th className="px-3 py-3">Client</th>
                        <th className="px-3 py-3">Produit & Remarque</th>
                        <th className="px-3 py-3">Localisation & Type</th>
                        <th className="px-3 py-3 text-right">Montant</th>
                        <th className="px-3 py-3 text-center">État</th>
                        <th className="px-3 py-3 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr>
                            <td colSpan="8" className="px-6 py-12 text-center text-slate-500 animate-pulse font-medium">Chargement des données...</td>
                        </tr>
                    ) : orders.length === 0 ? (
                        <tr>
                            <td colSpan="8" className="px-6 py-12 text-center text-slate-500 font-medium">Aucune commande trouvée.</td>
                        </tr>
                    ) : (
                        orders.map((order) => (
                            <tr key={order.rowId} className={`hover:bg-blue-50/30 transition-colors group ${selectedOrders.includes(order.rowId) ? 'bg-blue-50/50' : ''}`}>
                                <td className="px-3 py-3 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedOrders.includes(order.rowId)}
                                        onChange={(e) => toggleSelectRow(order.rowId, e)}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                </td>
                                <td className="px-3 py-3">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-slate-800 text-sm whitespace-nowrap">{order.reference}</span>
                                            {order.tracking && (
                                                <span className="text-xs text-blue-600 font-bold font-mono select-all bg-blue-50 px-1 rounded whitespace-nowrap">
                                                    {order.tracking}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium">{order.date}</div>
                                    </div>
                                </td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs ring-1 ring-slate-200">
                                            {order.client.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-700 truncate max-w-[140px]" title={order.client}>{order.client}</div>
                                            <div className="text-xs text-slate-500 font-medium">
                                                {order.phone}
                                                {order.phone2 && (
                                                    <>
                                                        {' '}- {order.phone2}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-3">
                                    <div className="text-sm text-slate-700 min-w-[200px] whitespace-normal font-medium leading-relaxed">
                                        <span className="font-medium block mb-1">
                                            {typeof order.product === 'object' ? JSON.stringify(order.product) : (order.product || <span className="text-slate-400 italic">Non spécifié</span>)}
                                        </span>
                                        {(order.note || order.remarque) && (
                                            <div className="mt-1 inline-block px-2 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs rounded-md shadow-sm">
                                                {order.note || order.remarque}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center justify-between gap-2 w-full">
                                        <div className="flex flex-col text-xs leading-snug min-w-0">
                                            <span className="font-bold text-slate-700 text-sm truncate">
                                                {order.wilaya_name || order.wilaya}
                                            </span>
                                            {order.commune && (
                                                <span className="text-slate-500 truncate">{order.commune}</span>
                                            )}
                                        </div>

                                        <div className="shrink-0 ml-2">
                                            {order.isStopDesk ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                                                    <Truck className="w-3 h-3" /> Stop
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200 uppercase tracking-wide">
                                                    <Home className="w-3 h-3" /> Dom
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-right">
                                    <div className="text-sm font-bold text-slate-800 whitespace-nowrap">{order.amount} <span className="text-xs font-semibold text-slate-500">DA</span></div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-sm border ${getStateColor(order.state)}`}>
                                        {order.state}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        {order.tracking && (
                                            <button
                                                onClick={() => setSelectedNoestOrder(order)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Détails de livraison"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => { setCurrentOrderId(order.rowId); setViewMode('edit'); }}
                                            disabled={!['Nouvelle', 'Atelier'].some(s => (order.state || '').includes(s))}
                                            className={`p-1.5 rounded transition-colors ${!['Nouvelle', 'Atelier'].some(s => (order.state || '').includes(s))
                                                ? 'text-slate-200 cursor-not-allowed'
                                                : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'
                                                }`}
                                            title="Modifier"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                            onClick={() => handleSingleSendToNoest(order.rowId, order.reference)}
                                            disabled={!['Nouvelle', 'Atelier'].some(s => (order.state || '').includes(s))}
                                            className={`p-1.5 rounded transition-colors ${['Nouvelle', 'Atelier'].some(s => (order.state || '').includes(s))
                                                ? 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                                                : 'text-slate-200 cursor-not-allowed hidden'
                                                }`}
                                            title="Envoyer vers Noest"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                            onClick={() => handleDeleteOrder(order.rowId, order.reference)}
                                            disabled={!['Nouvelle', 'Atelier'].some(s => (order.state || '').includes(s))}
                                            className={`p-1.5 rounded transition-colors ${!['Nouvelle', 'Atelier'].some(s => (order.state || '').includes(s))
                                                ? 'text-slate-200 cursor-not-allowed'
                                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                }`}
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
