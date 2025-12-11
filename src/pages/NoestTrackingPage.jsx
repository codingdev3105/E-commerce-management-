import { useState, useEffect } from 'react';
import { getOrders, getNoestTrackingInfo } from '../services/api';
import { Search, RefreshCw, Truck, MapPin, User, Calendar, X, History, Phone } from 'lucide-react';
import { useUI } from '../context/UIContext';

function NoestTrackingPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const { toast } = useUI();

    useEffect(() => {
        fetchNoestData();
    }, []);

    const fetchNoestData = async () => {
        setLoading(true);
        try {
            const sheetOrders = await getOrders();
            const systemTrackings = sheetOrders
                .filter(o => o.state && o.state.toLowerCase().includes('system'))
                .map(o => o.tracking)
                .filter(t => t);

            if (systemTrackings.length === 0) {
                setOrders([]);
                setLoading(false);
                return;
            }

            const result = await getNoestTrackingInfo(systemTrackings);
            console.log('result', result);

            const noestData = Object.values(result).map(item => {
                const info = item.OrderInfo || {};
                const activities = item.activity || [];
                const deliveryAttempts = item.deliveryAttempts || [];
                const sortedActivities = [...activities].sort((a, b) => new Date(b.date) - new Date(a.date));
                const latest = sortedActivities[0] || {};

                return {
                    tracking: info.tracking,
                    reference: info.reference,
                    client: info.client,
                    phone: info.phone,
                    wilaya: `Wilaya ${info.wilaya_id}`,
                    commune: info.commune,
                    montant: info.montant,
                    created_at: info.created_at,
                    status: latest.event || 'En attente',
                    status_class: latest['badge-class'],
                    activities: sortedActivities,
                    deliveryAttempts: deliveryAttempts,
                    driver_name: info.driver_name,
                    driver_phone: info.driver_phone
                };
            });

            setOrders(noestData);
        } catch (error) {
            console.error("Failed to fetch Noest info", error);
            toast.error("Erreur de synchronisation avec Noest");
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = orders.filter(order => {
        const text = filterText.toLowerCase();
        return (
            (order.reference?.toLowerCase() || '').includes(text) ||
            (order.tracking?.toLowerCase() || '').includes(text) ||
            (order.client?.toLowerCase() || '').includes(text) ||
            (order.phone?.toLowerCase() || '').includes(text) ||
            (order.wilaya?.toLowerCase() || '').includes(text)
        );
    });

    const getStatusColor = (order) => {
        if (order.status_class) {
            if (order.status_class.includes('success')) return 'bg-green-100 text-green-700 border border-green-200';
            if (order.status_class.includes('danger')) return 'bg-red-100 text-red-700 border border-red-200';
            if (order.status_class.includes('warning')) return 'bg-orange-100 text-orange-700 border border-orange-200';
            if (order.status_class.includes('info') || order.status_class.includes('primary')) return 'bg-blue-100 text-blue-700 border border-blue-200';
        }

        const s = (order.status || '').toLowerCase();
        if (s.includes('livré') || s.includes('delivered')) return 'bg-green-100 text-green-700 border border-green-200';
        if (s.includes('retour') || s.includes('returned') || s.includes('echoué')) return 'bg-red-100 text-red-700 border border-red-200';
        if (s.includes('centre') || s.includes('hub') || s.includes('ramassé') || s.includes('upload')) return 'bg-blue-100 text-blue-700 border border-blue-200';
        if (s.includes('livraison') || s.includes('cours')) return 'bg-orange-100 text-orange-700 border border-orange-200';
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    };

    // --- CATEGORIZATION LOGIC ---
    const TABS = [
        { id: 'all', label: 'Tous', count: 0 },
        { id: 'uploade', label: 'infos reçues', count: 0 },
        { id: 'valide', label: 'Validé', count: 0 },
        { id: 'vers_hub', label: 'Vers Hub', count: 0 }, // validation_reception, expedition
        { id: 'en_hub', label: 'En Hub', count: 0 }, // reception
        { id: 'en_livraison', label: 'En Livraison', count: 0 }, // sortie_livraison
        { id: 'suspendu', label: 'Suspendu', count: 0 }, // mise_a_jour (tentative)
        { id: 'livre', label: 'Livré', count: 0 },
        { id: 'retour', label: 'Retour', count: 0 },
    ];

    const [activeTab, setActiveTab] = useState('all');

    const getCategory = (order) => {
        const latest = order.activities && order.activities.length > 0 ? order.activities[0] : null;
        if (!latest) return 'uploade'; // Default

        const key = (latest.event_key || '').toLowerCase();
        const eventText = (latest.event || '').toLowerCase();

        if (key.includes('livre') || key === 'delivered') return 'livre';
        if (key.includes('retour') || key.includes('echoue') || eventText.includes('retour')) return 'retour';

        // Suspendu logic: mise_a_jour often means 'Tentative', or specific failure events
        if (key === 'mise_a_jour' || eventText.includes('tentative') || eventText.includes('report')) return 'suspendu';

        if (key === 'sortie_livraison' || eventText.includes('cours de livraison')) return 'en_livraison';

        // Hub logic
        if (key === 'reception' || key === 'entree_hub' || eventText.includes('hub') || eventText.includes('centre')) return 'en_hub';

        // Vers Hub (Moving)
        if (key === 'validation_reception' || key === 'expedition' || eventText.includes('enlevé') || eventText.includes('transfert')) return 'vers_hub';

        if (key === 'customer_validation' || eventText.includes('validé')) return 'valide';

        if (key === 'upload') return 'uploade';

        return 'uploade'; // Fallback
    };

    const categorizedOrders = () => {
        const filtered = orders.filter(order => {
            const text = filterText.toLowerCase();
            return (
                (order.reference?.toLowerCase() || '').includes(text) ||
                (order.tracking?.toLowerCase() || '').includes(text) ||
                (order.client?.toLowerCase() || '').includes(text) ||
                (order.phone?.toLowerCase() || '').includes(text) ||
                (order.wilaya?.toLowerCase() || '').includes(text)
            );
        });

        if (activeTab === 'all') return filtered;

        return filtered.filter(order => getCategory(order) === activeTab);
    };

    // Calculate counts for tabs
    const tabCounts = orders.reduce((acc, order) => {
        const cat = getCategory(order);
        acc[cat] = (acc[cat] || 0) + 1;
        acc.all = (acc.all || 0) + 1;
        return acc;
    }, { all: 0 });

    const displayedOrders = categorizedOrders();

    return (
        <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-green-600" />
                        Suivi Noest Express
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={fetchNoestData} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Actualiser">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="relative group">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder="Recherche..."
                            className="pl-10 pr-4 py-2 w-full md:w-64 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* TABS SCROLLABLE */}
            <div className="border-b border-slate-100 bg-slate-50/50">
                <div className="flex overflow-x-auto hide-scrollbar px-4 gap-1">
                    {TABS.map(tab => {
                        const count = tabCounts[tab.id] || 0;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2
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

            {/* CONTENT */}
            <div className="flex-1 bg-slate-50/30 p-0 relative overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto h-full">
                    <table className="w-full text-left">
                        <thead className="bg-white sticky top-0 z-10 shadow-sm">
                            <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="px-6 py-4">Tracking & Ref</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Destination</th>
                                <th className="px-6 py-4 text-center">État Détails</th>
                                <th className="px-6 py-4 text-right">Montant</th>
                                <th className="px-6 py-4">Date MAJ</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-slate-400 text-sm">Chargement...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : displayedOrders.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">Aucune commande dans cet onglet.</td></tr>
                            ) : (
                                displayedOrders.map((o, idx) => (
                                    <tr key={o.tracking || idx} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-start gap-1">
                                                {o.tracking && (
                                                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded tracking-wide">
                                                        {o.tracking}
                                                    </span>
                                                )}
                                                <span className="text-sm font-bold text-slate-800">{o.reference || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-700">{o.client || '-'}</div>
                                                    <div className="text-xs text-slate-400">{o.phone || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-slate-400" />
                                                <div>
                                                    <div className="text-sm text-slate-700 font-medium">{o.wilaya || '-'}</div>
                                                    <div className="text-xs text-slate-400">{o.commune || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm ${getStatusColor(o)}`}>
                                                {o.status || 'En attente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-slate-700">{o.montant} <span className="text-xs font-normal text-slate-400">DA</span></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-500 text-xs">
                                                <Calendar className="w-3 h-3" />
                                                {o.activities && o.activities.length > 0 ? o.activities[0].date : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => setSelectedOrder(o)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <History className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden overflow-y-auto h-full pb-20">
                    {loading ? (
                        <div className="p-8 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm">Chargement...</span>
                        </div>
                    ) : displayedOrders.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">Aucune commande dans cet onglet.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 p-4">
                            {displayedOrders.map((o, idx) => (
                                <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-4 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex flex-col items-start gap-1">
                                                {o.tracking && (
                                                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded tracking-wide">
                                                        {o.tracking}
                                                    </span>
                                                )}
                                                <div className="font-bold text-slate-800">{o.reference || '-'}</div>
                                            </div>
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase shadow-sm ${getStatusColor(o)}`}>
                                                {o.status || 'En attente'}
                                            </span>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg space-y-3">
                                            <div className="flex items-center gap-3">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <div>
                                                    <div className="font-bold text-slate-700">{o.client || '-'}</div>
                                                    <div className="text-sm text-slate-500">{o.phone || '-'}</div>
                                                </div>
                                            </div>
                                            <div className="h-px bg-slate-200 w-full"></div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <MapPin className="w-4 h-4 text-slate-400" />
                                                    {o.wilaya || '-'}
                                                </div>
                                                <div className="font-bold text-slate-800">{o.montant} DA</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end pt-2">
                                            <button onClick={() => setSelectedOrder(o)} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium w-full justify-center">
                                                <History className="w-4 h-4" /> Historique
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-800">Historique de suivi</h3>
                                <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-2">
                                    <span className="bg-slate-200 px-1.5 rounded text-slate-700">{selectedOrder.tracking}</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-slate-600">{selectedOrder.reference}</span>
                                </div>
                                {(selectedOrder.driver_name || selectedOrder.driver_phone) && (
                                    <div className="mt-3 flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                        <Truck className="w-4 h-4 text-blue-600" />
                                        <div className="flex items-center gap-3">
                                            {selectedOrder.driver_name && <span className="font-medium text-blue-700">{selectedOrder.driver_name}</span>}
                                            {selectedOrder.driver_phone && <span className="flex items-center gap-1 text-blue-600"><Phone className="w-3 h-3" />{selectedOrder.driver_phone}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            {(selectedOrder.deliveryAttempts || []).length > 0 && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <h4 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4" /> Tentatives de livraison
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedOrder.deliveryAttempts.map((attempt, idx) => (
                                            <div key={idx} className="bg-white rounded border border-orange-100 p-3 text-xs">
                                                <div className="font-medium text-slate-700 mb-1">{attempt.content}</div>
                                                <div className="text-slate-400 text-[10px]">{attempt.created_at}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-sm font-bold text-slate-700 mb-4">Chronologie</h4>
                                {(selectedOrder.activities || []).length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">Aucun historique disponible.</div>
                                ) : (
                                    (selectedOrder.activities || []).map((act, idx) => (
                                        <div key={idx} className="relative pl-8 border-l-2 border-slate-100 last:border-0 pb-8 last:pb-0 group">
                                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${idx === 0 ? 'bg-blue-500 ring-4 ring-blue-50' : 'bg-slate-300 group-hover:bg-slate-400'}`}></div>
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-xs font-bold text-slate-400 font-mono">{act.date}</span>
                                                <span className={`text-sm font-bold ${idx === 0 ? 'text-blue-700' : 'text-slate-700'}`}>{act.event}</span>
                                                {act.content && <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 italic">"{act.content}"</p>}
                                                <div className="flex flex-wrap gap-2 text-[10px] mt-1">
                                                    {act.by && <span className="flex items-center gap-1 text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"><User className="w-3 h-3" /> {act.by}</span>}
                                                    {act['badge-class'] && <span className={`px-1.5 py-0.5 rounded ${act['badge-class'].includes('success') ? 'bg-green-50 text-green-600' : act['badge-class'].includes('danger') ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{act.event_key}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default NoestTrackingPage;
