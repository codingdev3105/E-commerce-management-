import { useState, useEffect } from 'react';
import { getOrders, getNoestTrackingInfo, updateMessageStatus } from '../services/api';
import { Search, RefreshCw, Truck, MapPin, User, Calendar, X, History, Phone, Home } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useAppData } from '../context/AppDataContext';

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

    const getCategoryFromEvent = (eventKey, eventLabel, isStopDesk) => {
        const key = (eventKey || '').toLowerCase();
        const label = (eventLabel || '').toLowerCase();

        if (key.includes('livred') || key.includes('validation_reception_cash') || key.includes('verssement')) return 'Livré';
        if (key.includes('return') || label.includes('retour')) return 'Retour';
        if (key.includes('suspendu')) return 'Suspendu';
        if (key === 'mise_a_jour' && label.includes('tentative')) return isStopDesk ? 'En Hub' : 'En Livraison';
        if (key === 'fdr_activated' || key.includes('sent_to_redispatch') || label.includes('en livraison')) return 'En Livraison';
        if (key === 'validation_reception') return isStopDesk ? 'En Hub' : 'En Livraison';
        if (key === 'customer_validation') return 'Validé';
        if (key === 'upload') return 'Uploadé';

        return 'Autres';
    };

    const fetchNoestData = async () => {
        setLoading(true);
        try {
            const sheetOrders = await getOrders();
            console.log("Sheet Orders fetched:", sheetOrders.length);

            const systemTrackings = sheetOrders
                .filter(o => o.state && o.state.toLowerCase().includes('system') && o.tracking)
                .map(o => o.tracking);

            console.log("Trackings to fetch from Noest:", systemTrackings.length);

            if (systemTrackings.length === 0) {
                setOrders([]);
                setLoading(false);
                return;
            }

            const result = await getNoestTrackingInfo(systemTrackings);
            console.log("Noest results received:", Object.keys(result).length);

            const parseCustomDate = (dateStr) => {
                if (!dateStr) return new Date(0);
                let cleanStr = dateStr;
                if (typeof dateStr === 'string' && dateStr.includes('.000000Z')) {
                    cleanStr = dateStr.replace(' ', 'T').replace('.000000Z', 'Z');
                }
                const d = new Date(cleanStr);
                return !isNaN(d.getTime()) ? d : new Date(0);
            };

            const formatDate = (dateObj) => {
                if (!dateObj || isNaN(dateObj.getTime()) || dateObj.getTime() === 0) return '-';
                const pad = (n) => n.toString().padStart(2, '0');
                return `${pad(dateObj.getDate())}-${pad(dateObj.getMonth() + 1)}-${dateObj.getFullYear()} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
            };

            const noestData = Object.values(result).map(item => {
                const info = item.OrderInfo || {};
                const activities = item.activity || [];
                const deliveryAttempts = item.deliveryAttempts || [];

                const sortedActivities = activities.map(act => ({
                    ...act,
                    parsedDate: parseCustomDate(act.date)
                })).sort((a, b) => b.parsedDate - a.parsedDate);

                const latest = sortedActivities[0] || {};
                const wilayaName = wilayas.find(w => w.code == info.wilaya_id)?.nom || '';
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
                    created_at: formatDate(parseCustomDate(info.created_at)),
                    status: latest.event || info.current_status || 'En attente',
                    category: category,
                    status_class: latest['badge-class'],
                    activities: sortedActivities.map(a => ({
                        ...a,
                        date: formatDate(a.parsedDate)
                    })),
                    deliveryAttempts: deliveryAttempts,
                    driver_name: info.driver_name,
                    driver_phone: info.driver_phone,
                    produit: info.produit,
                    remarque: remarque,
                    is_stopdesk: isStopDesk,
                    isMessageSent: isMessageSent,
                    rowId: rowId
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

    const handleMessageSent = async (order) => {
        console.log("handleMessageSent clicked for order:", order);

        if (!order.rowId) {
            console.error("Missing rowId for order", order);
            toast.error("Impossible de mettre à jour : ID manquant (Commande introuvable dans le sheet)");
            return;
        }

        try {
            // Optimistic update
            setOrders(prev => prev.map(o =>
                o.tracking === order.tracking ? { ...o, isMessageSent: true } : o
            ));

            await updateMessageStatus(order.rowId, 'OUI');
            toast.success("Statut mis à jour !");
        } catch (error) {
            console.error("Failed to update message status", error);
            toast.error("Erreur lors de la mise à jour");
            // Revert on failure
            setOrders(prev => prev.map(o =>
                o.tracking === order.tracking ? { ...o, isMessageSent: false } : o
            ));
        }
    };

    const [activeTab, setActiveTab] = useState('all');

    const ORDERED_CATEGORIES = ['all', 'Uploadé', 'Validé', 'En Hub', 'En Livraison', 'Suspendu', 'Livré', 'Retour', 'Encaissé', 'Autres'];

    const categorizedOrders = () => {
        const filtered = orders.filter(order => {
            const text = filterText.toLowerCase();
            return (
                (order.reference?.toLowerCase() || '').includes(text) ||
                (order.tracking?.toLowerCase() || '').includes(text) ||
                (order.client?.toLowerCase() || '').includes(text) ||
                (order.phone?.toLowerCase() || '').includes(text) ||
                (order.wilaya_name?.toLowerCase() || '').includes(text)
            );
        });

        if (activeTab === 'all') return filtered;
        return filtered.filter(order => order.category === activeTab);
    };

    // Calculate counts for tabs based on CATEGORY
    const tabCounts = orders.reduce((acc, order) => {
        const cat = order.category || 'Autres';
        acc[cat] = (acc[cat] || 0) + 1;
        acc.all = (acc.all || 0) + 1;
        return acc;
    }, { all: 0 });

    const visibleTabs = ORDERED_CATEGORIES
        .filter(cat => tabCounts[cat] > 0 || cat === 'all')
        .map(cat => ({
            id: cat,
            label: cat === 'all' ? 'Tous' : cat,
            count: tabCounts[cat] || 0
        }));

    const displayedOrders = categorizedOrders();

    useEffect(() => {
        if (activeTab !== 'all' && (tabCounts[activeTab] || 0) === 0 && !loading && orders.length > 0) {
            setActiveTab('all');
        }
    }, [tabCounts, activeTab, loading, orders.length]);

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

            <div className="flex-1 bg-slate-50/30 p-4 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Chargement...</span>
                    </div>
                ) : displayedOrders.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 italic">Aucune commande dans cet onglet.</div>
                ) : (
                    <div className="flex gap-4 items-start pb-20">
                        {columnsData.map((colOrders, colIndex) => (
                            <div key={colIndex} className="flex-1 flex flex-col gap-4 min-w-0">
                                {colOrders.map((o) => (
                                    <OrderCard key={o.tracking || o.reference} order={o} onMessageSent={handleMessageSent} />
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

function OrderCard({ order, onMessageSent }) {
    const [expanded, setExpanded] = useState(false);

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
    console.log(order);
    return (
        <div
            className={`
                bg-white border border-slate-200 rounded-lg shadow-sm transition-all duration-300 overflow-hidden break-inside-avoid mb-4
                ${expanded ? 'ring-2 ring-blue-500 shadow-md' : 'hover:border-blue-300 hover:shadow'}
            `}
        >
            <div
                onClick={() => setExpanded(!expanded)}
                className="h-[40px] px-3 flex items-center justify-between gap-2 cursor-pointer bg-white hover:bg-slate-50 transition-colors"
                title="Cliquer pour voir les détails"
            >
                <div className="flex items-center w-1/3 truncate">
                    <div className={`w-2 h-2 rounded-full mr-2 shrink-0 ${order.isMessageSent ? 'bg-green-500' : 'bg-blue-500'}`} title={order.isMessageSent ? "Message envoyé" : "Message non envoyé"}></div>
                    <div className="font-bold text-slate-700 text-sm truncate text-left">
                        {order.reference || '-'}
                    </div>
                </div>
                <div className="text-black text-xs truncate w-1/3 text-center tracking-wide" title={order.client}>
                    {order.client || '-'}
                </div>
                <div className={`w-1/3 flex justify-end`}>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold border truncate max-w-full ${statusStyle}`}>
                        {order.status}
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-sm animate-in fade-in slide-in-from-top-1 duration-200 cursor-default" onClick={e => e.stopPropagation()}>
                    <div className="mb-4 space-y-2">
                        <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded">{order.tracking}</span>
                            <span className="text-xs font-bold text-blue-600">{order.montant} DA</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-slate-600">
                            <User className="w-3.5 h-3.5 mt-0.5 text-slate-400" />
                            <div>
                                <div className="font-bold text-slate-700">{order.client}</div>
                                <div>{order.phone}</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-slate-600">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400" />
                            <div>
                                <div className="font-medium">{order.wilaya_name}</div>
                                <div className="text-slate-500 leading-tight">{order.commune}</div>
                                {order.produit && (
                                    <div className="text-slate-600 mt-1 flex items-center gap-1 font-medium bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                        {order.produit}
                                    </div>
                                )}
                                {order.remarque && (
                                    <div className="text-slate-500 italic mt-1 text-[10px] bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100 dark:text-slate-500">
                                        Note: {order.remarque}
                                    </div>
                                )}
                            </div>
                        </div>
                        {(order.driver_name || order.driver_phone) && (
                            <div className="flex items-center gap-2 text-xs bg-blue-50/50 border border-blue-100 rounded p-2 text-blue-800">
                                <Truck className="w-3 h-3" />
                                <span>{order.driver_name} {order.driver_phone}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-0 relative pl-2">
                        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200"></div>
                        {(order.activities || []).map((act, idx) => (
                            <div key={idx} className="relative pl-6 pb-6 last:pb-0 h-full">
                                <div className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${idx === 0 ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 font-mono leading-none">{act.date}</span>
                                    <span className={`text-xs font-bold leading-tight ${idx === 0 ? 'text-blue-700' : 'text-slate-700'}`}>{act.event}</span>
                                    {act.content && <p className="text-[10px] text-slate-500 bg-white p-1.5 rounded border border-slate-100 mt-1 italic leading-tight">"{act.content}"</p>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                        {!order.isMessageSent && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onMessageSent) onMessageSent(order);
                                }}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2"
                            >
                                <Phone className="w-3 h-3" /> Envoyer Message
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setExpanded(false)}
                            className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-bold rounded transition-colors flex items-center justify-center gap-1"
                        >
                            <X className="w-3 h-3" /> Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NoestTrackingPage;
