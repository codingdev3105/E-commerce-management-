
import { useState, useEffect, useMemo } from 'react';
import { getOrders, getNoestTrackingInfo, updateMessageStatus, updateOrder } from '../../services/api';
import { Search, RefreshCw, Truck, MapPin, User, X, Phone, Eye, ArrowRightLeft } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useAppData } from '../../context/AppDataContext';
import { getCategoryFromEvent, formatNoestDate, parseNoestDate } from '../common/noestUtils';

function NoestTrackingPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const { toast } = useUI();
    const { wilayas } = useAppData();

    useEffect(() => {
        fetchNoestData();
    }, [wilayas]);


    const fetchNoestData = async () => {
        setLoading(true);
        try {
            const sheetOrders = await getOrders();
            const trackedOrders = sheetOrders.filter(o => o.tracking && String(o.tracking).trim().length > 5);
            const trackingsToFetch = trackedOrders.map(o => o.tracking);

            if (trackingsToFetch.length === 0) {
                setOrders([]);
                setLoading(false);
                return;
            }

            const result = await getNoestTrackingInfo(trackingsToFetch);

            const noestData = Object.values(result).map(item => {
                const info = item.OrderInfo || {};
                const activities = item.activity || [];
                const deliveryAttempts = item.deliveryAttempts || [];

                const sortedActivities = activities.map(act => ({
                    ...act,
                    parsedDate: parseNoestDate(act.date)
                })).sort((a, b) => b.parsedDate - a.parsedDate);

                const latest = sortedActivities[0] || {};
                const wilayaName = (wilayas || []).find(w => w.code == info.wilaya_id)?.nom || '';
                const isStopDesk = Number(info.stop_desk) === 1;

                const category = getCategoryFromEvent(latest.event_key, latest.event || info.current_status, isStopDesk);

                const localOrder = sheetOrders.find(o =>
                    String(o.tracking).trim() === String(info.tracking).trim()
                );

                if (!localOrder) {
                    console.warn("Orphaned tracking info:", info.tracking);
                }

                const remarque = localOrder?.remarque || info.remarque || '';
                const isMessageSent = localOrder ? (localOrder.isMessageSent === true) : false;
                const rowId = localOrder?.rowId;

                return {
                    tracking: info.tracking,
                    reference: info.reference,
                    client: info.client,
                    phone: info.phone,
                    wilaya_id: info.wilaya_id,
                    wilaya_name: wilayaName,
                    commune: info.commune,
                    adresse: info.adresse,
                    montant: info.montant,
                    created_at: formatNoestDate(parseNoestDate(info.created_at)),
                    status: latest.event || info.current_status || 'En attente',
                    category: category,
                    status_class: latest['badge-class'],
                    activities: sortedActivities.map(a => ({
                        ...a,
                        date: formatNoestDate(a.parsedDate)
                    })),
                    deliveryAttempts: deliveryAttempts,
                    driver_name: info.driver_name,
                    driver_phone: info.driver_phone,
                    produit: info.produit,
                    remarque: remarque,
                    is_stopdesk: isStopDesk,
                    isMessageSent: isMessageSent,
                    rowId: rowId,
                    stationExpedition: localOrder?.stationExpedition,
                    localOrder: localOrder // Store full object for sync
                };
            });

            setOrders(noestData);

        } catch (error) {
            console.error("Failed to fetch Noest info", error);
            toast.error("Erreur lors de la récupération des données");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        const updatesToSync = orders.filter(o =>
            o.localOrder && o.category && o.localOrder.state !== o.category
        ).map(o => ({
            rowId: o.rowId,
            orderAtIndex: o.localOrder,
            newState: o.category
        }));

        if (updatesToSync.length === 0) {

            toast.info("Tout est déjà synchronisé !");
            return;
        }

        const confirmed = window.confirm(`Voulez-vous synchroniser ${updatesToSync.length} commandes avec les statuts Noest ?`);
        if (!confirmed) return;

        setLoading(true);
        try {
            const updatePromises = updatesToSync.map(update => {
                const payload = { ...update.orderAtIndex, state: update.newState };
                return updateOrder(update.rowId, payload);
            });

            await Promise.all(updatePromises);
            toast.success(`${updatesToSync.length} commandes synchronisées avec succès !`);

            setOrders(prev => prev.map(o => {
                const update = updatesToSync.find(u => u.rowId === o.rowId);
                if (update) {
                    return { ...o, localOrder: { ...o.localOrder, state: update.newState } };
                }
                return o;
            }));

        } catch (syncError) {
            console.error("Synchronization failed", syncError);
            toast.error("Erreur lors de la synchronisation des états.");
        } finally {
            setLoading(false);
        }
    };

    const handleMessageSent = async (order) => {
        if (!order.rowId) {
            console.error("Missing rowId for order", order);
            toast.error("Impossible de mettre à jour : ID manquant (Commande introuvable dans le sheet)");
            return;
        }

        try {
            setOrders(prev => prev.map(o =>
                o.tracking === order.tracking ? { ...o, isMessageSent: true } : o
            ));

            await updateMessageStatus(order.rowId, 'OUI');
            toast.success("Statut mis à jour !");
        } catch (error) {
            console.error("Failed to update message status", error);
            toast.error("Erreur lors de la mise à jour");
            setOrders(prev => prev.map(o =>
                o.tracking === order.tracking ? { ...o, isMessageSent: false } : o
            ));
        }
    };

    const [activeTab, setActiveTab] = useState('all');

    const ORDERED_CATEGORIES = ['all', 'Upload', 'En traitement', 'En expédition', 'En Hub', 'En livraison', 'Suspendu', 'Livré', 'Finance', 'Retour', 'En modification', 'Autres'];

    const displayedOrders = useMemo(() => {
        const filtered = (orders || []).filter(order => {
            const text = String(filterText || "").toLowerCase();
            return (
                String(order.reference || "").toLowerCase().includes(text) ||
                String(order.tracking || "").toLowerCase().includes(text) ||
                String(order.client || "").toLowerCase().includes(text) ||
                String(order.phone || "").toLowerCase().includes(text) ||
                String(order.wilaya_name || "").toLowerCase().includes(text)
            );
        });

        if (activeTab === 'all') return filtered;
        return filtered.filter(order => order.category === activeTab);
    }, [orders, filterText, activeTab]);

    const tabCounts = useMemo(() => {
        return (orders || []).reduce((acc, order) => {
            const cat = order.category || 'Autres';
            acc[cat] = (acc[cat] || 0) + 1;
            acc.all = (acc.all || 0) + 1;
            return acc;
        }, { all: 0 });
    }, [orders]);

    const visibleTabs = useMemo(() => {
        return ORDERED_CATEGORIES
            .filter(cat => tabCounts[cat] > 0 || cat === 'all')
            .map(cat => ({
                id: cat,
                label: cat === 'all' ? 'Tous' : cat,
                count: tabCounts[cat] || 0
            }));
    }, [tabCounts]);

    useEffect(() => {
        if (activeTab !== 'all' && (tabCounts[activeTab] || 0) === 0 && !loading && (orders || []).length > 0) {
            setActiveTab('all');
        }
    }, [tabCounts, activeTab, loading, (orders || []).length]);

    const [numColumns, setNumColumns] = useState(4);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 640) setNumColumns(1);
            else if (width < 768) setNumColumns(2);
            else if (width < 1024) setNumColumns(3);
            else setNumColumns(4);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getDistributedOrders = () => {
        if (!displayedOrders.length) return [];
        const perColumn = Math.ceil(displayedOrders.length / numColumns);
        return Array.from({ length: numColumns }, (_, i) => {
            return displayedOrders.slice(i * perColumn, (i + 1) * perColumn);
        });
    };

    const columnsData = getDistributedOrders();

    return (
        <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-green-600" />
                        Suivi Noest Express
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={fetchNoestData} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Actualiser">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleSync} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-green-600 transition-colors" title="Synchroniser">
                        <ArrowRightLeft className="w-4 h-4" />
                    </button>
                    <div className="relative group">
                        <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder="Recherche..."
                            className="pl-9 pr-3 py-1.5 w-full md:w-64 bg-slate-50 border border-slate-200 rounded-md text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        />
                    </div>
                </div>
            </div>

            <div className="border-b border-slate-100 bg-slate-50/50">
                <div className="flex overflow-x-auto hide-scrollbar px-2 gap-1">
                    {visibleTabs.map(tab => {
                        const count = tabCounts[tab.id] || 0;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    whitespace-nowrap px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2
                                    ${isActive
                                        ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                    }
                                `}
                            >
                                {tab.label}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 bg-slate-50/30 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Chargement...</span>
                    </div>
                ) : displayedOrders.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 italic">Aucune commande dans cet onglet.</div>
                ) : (
                    <>
                        <div className="md:hidden flex gap-2 items-start p-4 pb-20">
                            {columnsData.map((colOrders, colIndex) => (
                                <div key={colIndex} className="flex-1 flex flex-col gap-2 min-w-0">
                                    {colOrders.map((o) => (
                                        <OrderCard key={o.tracking || o.reference} order={o} onMessageSent={handleMessageSent} onClick={() => setSelectedOrder(o)} />
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div className="hidden md:block pb-20 bg-white">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100">
                                        <th className="px-6 py-3 font-bold text-center w-12">#</th>
                                        <th className="px-4 py-3 font-bold">Référence</th>
                                        <th className="px-4 py-3 font-bold">Tracking</th>
                                        <th className="px-4 py-3 font-bold">Client</th>
                                        <th className="px-4 py-3 font-bold">Localisation</th>
                                        <th className="px-4 py-3 font-bold text-right">Montant</th>
                                        <th className="px-4 py-3 font-bold text-center">Statut Noest</th>
                                        <th className="px-4 py-3 font-bold text-center w-20">Msg</th>
                                        <th className="px-4 py-3 font-bold text-center w-20">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {displayedOrders.map((order, idx) => (
                                        <OrderTableRow
                                            key={order.tracking || order.reference}
                                            order={order}
                                            index={idx}
                                            onClick={() => setSelectedOrder(order)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onMessageSent={handleMessageSent}
                />
            )}
        </section >
    );
}

function OrderTableRow({ order, index, onClick }) {
    const getStatusColor = (status, statusClass) => {
        if (statusClass) {
            if (statusClass.includes('success')) return 'text-green-700 bg-green-50 border-green-200';
            if (statusClass.includes('danger')) return 'text-red-700 bg-red-50 border-red-200';
            if (statusClass.includes('warning')) return 'text-orange-700 bg-orange-50 border-orange-200';
            if (statusClass.includes('info') || statusClass.includes('primary')) return 'text-blue-700 bg-blue-50 border-blue-200';
        }
        const s = (status || '').toLowerCase();
        if (s.includes('livré') || s.includes('delivered')) return 'text-green-700 bg-green-50 border-green-200';
        if (s.includes('retour') || s.includes('returned') || s.includes('echoué')) return 'text-red-700 bg-red-50 border-red-200';
        if (s.includes('cours') || s.includes('livraison')) return 'text-orange-700 bg-orange-50 border-orange-200';
        return 'text-slate-700 bg-slate-100 border-slate-200';
    };

    const statusStyle = getStatusColor(order.status, order.status_class);

    return (
        <tr
            className="group hover:bg-slate-50 transition-colors border-b border-slate-50"
        >
            <td className="px-4 py-2 text-center text-xs text-slate-400">
                {index + 1}
            </td>
            <td className="px-4 py-2">
                <div className="font-bold text-slate-800 text-xs">{order.reference}</div>
                <div className="text-[10px] text-slate-400 font-mono">{order.created_at}</div>
            </td>
            <td className="px-4 py-2">
                <div className="text-[10px] font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block">
                    {order.tracking}
                </div>
            </td>
            <td className="px-4 py-2">
                <div className="text-xs font-bold text-slate-700 truncate max-w-[150px]" title={order.client}>{order.client}</div>
                <div className="text-[10px] text-slate-500 font-mono">{order.phone}</div>
            </td>
            <td className="px-4 py-2">
                <div className="text-[10px] text-slate-700">
                    <span className="font-semibold">{order.wilaya_name}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span>{order.commune}</span>
                </div>
            </td>
            <td className="px-4 py-2 text-right">
                <div className="text-xs font-bold text-slate-800">{order.montant} DA</div>
            </td>
            <td className="px-4 py-2 text-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm whitespace-nowrap ${statusStyle}`}>
                    {order.status}
                </span>
            </td>
            <td className="px-4 py-2 text-center">
                <div className={`w-3 h-3 rounded-full mx-auto ${order.isMessageSent ? 'bg-green-500 ring-4 ring-green-100' : 'bg-blue-200'}`} title={order.isMessageSent ? "Message Envoyé" : "Message Non Envoyé"}></div>
            </td>
            <td className="px-4 py-2 text-center">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick();
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Voir Détails"
                >
                    <Eye className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
}

function OrderDetailsModal({ order, onClose, onMessageSent }) {
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
                            <span className="font-mono bg-blue-50 text-blue-700 px-1.5 rounded border border-blue-100 italic">Exp: {order.stationExpedition || '-'}</span>
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
                                <div className="text-base font-bold text-slate-800 mt-0.5">{order.status}</div>
                            </div>
                            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                                <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Montant Total</div>
                                <div className="text-base font-bold text-emerald-700 mt-0.5">{order.montant} DA</div>
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
                                        <div className="font-medium text-slate-700">{order.wilaya_name}, {order.commune}</div>
                                        <div className="text-slate-500 text-xs">{order.adresse}</div>
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
                            {order.activities?.length === 0 && <div className="text-sm text-slate-400 italic">Aucune activité enregistrée</div>}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors"
                    >
                        Fermer
                    </button>
                    {!order.isMessageSent ? (
                        <button
                            onClick={() => { onMessageSent(order); onClose(); }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-200 transition-all transform active:scale-95 flex items-center gap-2"
                        >
                            <Phone className="w-4 h-4" /> Envoyer SMS
                        </button>
                    ) : (
                        <button
                            disabled
                            className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-bold flex items-center gap-2 cursor-default"
                        >
                            <div className="w-2 h-2 rounded-full bg-green-500"></div> Message Envoyé
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function OrderCard({ order, onMessageSent, onClick }) {
    const [expanded, setExpanded] = useState(false);
    const { toast } = useUI();

    const handleCopyDriver = (e) => {
        e.stopPropagation();
        const text = `${order.driver_name || ''} ${order.driver_phone || ''}`.trim();
        if (text) {
            navigator.clipboard.writeText(text);
            toast.success("Info livreur copiée !");
        }
    };

    const getStatusColor = (status, statusClass) => {
        if (statusClass) {
            if (statusClass.includes('success')) return 'text-green-600 bg-green-50 border-green-100';
            if (statusClass.includes('danger')) return 'text-red-600 bg-red-50 border-red-100';
            if (statusClass.includes('warning')) return 'text-orange-600 bg-orange-50 border-orange-100';
            if (statusClass.includes('info') || statusClass.includes('primary')) return 'text-blue-600 bg-blue-50 border-blue-100';
        }
        const s = (status || '').toLowerCase();
        if (s.includes('livré') || s.includes('delivered')) return 'text-green-600 bg-green-50 border-green-100';
        if (s.includes('retour') || s.includes('returned') || s.includes('echoué')) return 'text-red-600 bg-red-50 border-red-100';
        if (s.includes('cours') || s.includes('livraison')) return 'text-orange-600 bg-orange-50 border-orange-100';
        return 'text-slate-600 bg-slate-100 border-slate-200';
    };

    const statusStyle = getStatusColor(order.status, order.status_class);
    return (
        <div
            className={`
                bg-white border border-slate-200 rounded-lg shadow-sm transition-all duration-300 overflow-hidden break-inside-avoid
                ${expanded ? 'ring-2 ring-blue-500 shadow-md' : 'hover:border-blue-300 hover:shadow'}
            `}
        >
            <div className="p-3 flex flex-col gap-3 bg-white">
                <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${order.isMessageSent ? 'bg-green-500' : 'bg-blue-500'}`} title={order.isMessageSent ? "Message envoyé" : "Message non envoyé"}></div>
                        <span className="font-bold text-slate-800 text-sm truncate" title={order.reference}>
                            {order.reference || '-'}
                        </span>
                        <span className="text-slate-500 text-xs truncate max-w-[100px]" title={order.client}>
                            {order.client || '-'}
                        </span>
                    </div>

                    <div className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border ${statusStyle}`}>
                        {order.status}
                    </div>
                </div>

                <div className="flex items-start justify-between gap-2 w-full text-xs">
                    <span className="text-slate-600 font-medium line-clamp-2 leading-tight flex-1" title={typeof order.produit === 'string' ? order.produit : ''}>
                        {typeof order.produit === 'object' ? JSON.stringify(order.produit) : (order.produit || <span className="italic text-slate-400">Produit non spécifié</span>)}
                    </span>
                    <span className="text-slate-500 font-mono whitespace-nowrap shrink-0 bg-slate-100 px-1 rounded ml-1">
                        {order.phone || '-'}
                    </span>
                </div>
                {!expanded && (
                    <div className="flex items-center justify-end pt-2 border-t border-slate-100 mt-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpanded(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                        >
                            <Eye className="w-3.5 h-3.5" /> Détails
                        </button>
                    </div>
                )}
            </div>

            {expanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-sm animate-in fade-in slide-in-from-top-1 duration-200 cursor-default" onClick={e => e.stopPropagation()}>
                    {(order.driver_name || order.driver_phone) && (
                        <div
                            onClick={handleCopyDriver}
                            className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg p-2 mb-4 text-indigo-800 cursor-pointer hover:bg-indigo-100 transition-colors"
                        >
                            <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center shrink-0">
                                <Truck className="w-3 h-3 text-indigo-700" />
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-xs truncate">{order.driver_name}</div>
                                <div className="font-mono text-[10px]">{order.driver_phone}</div>
                            </div>
                        </div>
                    )}

                    <div className="mb-4 space-y-2">
                        <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded" title="Tracking">{order.tracking}</span>
                            <span className="text-xs font-bold text-blue-600 whitespace-nowrap">{order.montant} DA</span>
                        </div>


                        <div className="flex items-start gap-2 text-xs text-slate-600 px-1">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400" />
                            <div>
                                <div className="font-medium">{order.wilaya_name}</div>
                                <div className="text-slate-500 leading-tight">{order.commune}</div>
                                {order.remarque && (
                                    <div className="text-slate-500 italic mt-1 text-[10px] bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100 dark:text-slate-500">
                                        Note: {typeof order.remarque === 'object' ? JSON.stringify(order.remarque) : String(order.remarque || '')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Historique</h4>
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
                            {(!order.activities || order.activities.length === 0) && <div className="text-xs text-slate-400 italic">Aucune activité</div>}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                        <button
                            onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                            className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors"
                        >
                            Fermer
                        </button>
                        {!order.isMessageSent ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); onMessageSent(order); }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                                <Phone className="w-3 h-3" /> Envoyer
                            </button>
                        ) : (
                            <button disabled className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-default">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Envoyé
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NoestTrackingPage;
