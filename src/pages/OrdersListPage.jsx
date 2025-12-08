import { useState, useEffect } from 'react';
import { getOrders, deleteOrder, updateOrder, sendToNoest } from '../services/api';
import { Search, Eye, Truck, Home, RefreshCw, Trash2, Pencil, Send, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../context/UIContext';

function OrdersListPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const navigate = useNavigate();
    const { toast, confirm } = useUI();

    const [selectedOrders, setSelectedOrders] = useState([]);
    const [bulkState, setBulkState] = useState('');
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    // Pagination State
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const data = await getOrders();
            setOrders(data);
            setSelectedOrders([]); // Reset selection on refresh
        } catch (error) {
            console.error("Failed to fetch orders", error);
            toast.error("Erreur lors du chargement des commandes");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, ref) => {
        const confirmed = await confirm({
            title: "Supprimer la commande ?",
            message: `Êtes-vous sûr de vouloir supprimer la commande ${ref} ? Cette action est irréversible.`,
            type: "danger",
            confirmText: "Oui, supprimer",
            cancelText: "Annuler"
        });

        if (confirmed) {
            try {
                await deleteOrder(id);
                setOrders(current => current.filter(o => o.rowId !== id));
                setSelectedOrders(current => current.filter(sid => sid !== id));
                toast.success("Commande supprimée avec succès");
            } catch (error) {
                toast.error("Erreur lors de la suppression");
                console.error(error);
            }
        }
    };

    const handleSendToNoest = async (rowId, ref) => {
        const confirmed = await confirm({
            title: "Envoyer vers Noest ?",
            message: `Voulez-vous envoyer la commande ${ref} vers Noest Express ? Un numéro de tracking sera généré.`,
            type: "confirm",
            confirmText: "Oui, envoyer",
            cancelText: "Annuler"
        });

        if (confirmed) {
            try {
                const result = await sendToNoest(rowId);
                toast.success(`Commande envoyée ! Tracking: ${result.tracking}`);
                fetchOrders(); // Refresh to show updated state
            } catch (error) {
                toast.error("Erreur lors de l'envoi vers Noest");
                console.error(error);
            }
        }
    };

    const filteredOrders = orders.filter(order => {
        const text = filterText.toLowerCase();
        return (
            (order.reference?.toLowerCase() || '').includes(text) ||
            (order.client?.toLowerCase() || '').includes(text) ||
            (order.phone?.toLowerCase() || '').includes(text) ||
            (order.state?.toLowerCase() || '').includes(text)
        );
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

    // Reset to page 1 if filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filterText, itemsPerPage]);

    // Selection Logic
    const toggleSelectAll = () => {
        const allFilteredSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrders.includes(o.rowId));

        if (allFilteredSelected) {
            // Unselect only the visible/filtered ones
            setSelectedOrders(prev => prev.filter(id => !filteredOrders.find(o => o.rowId === id)));
        } else {
            // Select all visible ones (merge with existing)
            const newIds = filteredOrders.map(o => o.rowId);
            setSelectedOrders(prev => [...new Set([...prev, ...newIds])]);
        }
    };

    const toggleSelectRow = (id) => {
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Bulk Update Logic
    const handleBulkUpdate = async () => {
        if (!bulkState) return;

        // 1. Verify all selected orders have the same current state
        const selectedOrderObjects = orders.filter(o => selectedOrders.includes(o.rowId));
        if (selectedOrderObjects.length === 0) return;

        const distinctStates = [...new Set(selectedOrderObjects.map(o => (o.state || '')))];

        if (distinctStates.length > 1) {
            toast.error("Action refusée : Vous ne pouvez modifier groupement que des commandes ayant le même état actuel.");
            return;
        }

        const currentState = distinctStates[0];
        const targetState = bulkState;

        // 2. Enforce Transition Rules
        let isAllowed = false;
        if (currentState.includes('Nouvelle')) {
            // Nouvelle -> All
            isAllowed = true;
        } else if (currentState.includes('Atelier')) {
            // Atelier -> All
            isAllowed = true;
        } else if (currentState.includes('System')) {
            // System -> Only 'Annuler'
            if (targetState === 'Annuler') {
                isAllowed = true;
            } else {
                toast.error("Action refusée : Les commandes 'System/Envoyer' ne peuvent être changées qu'en 'Annuler'.");
                return;
            }
        } else if (currentState.includes('Annuler')) {
            // Annuler -> Nouvelle
            if (targetState === 'Nouvelle') {
                isAllowed = true;
            } else {
                toast.error("Action refusée : Les commandes annulées ne peuvent être rétablies qu'en 'Nouvelle'.");
                return;
            }
        } else {
            // Fallback
            isAllowed = true;
        }

        if (!isAllowed) {
            toast.error("Transition d'état non autorisée.");
            return;
        }

        const confirmed = await confirm({
            title: "Confirmation de mise à jour",
            message: `Voulez-vous passer ${selectedOrders.length} commandes de "${currentState}" vers "${bulkState}" ?`,
            type: "confirm",
            confirmText: "Appliquer",
        });

        if (!confirmed) return;

        setIsBulkUpdating(true);
        try {
            console.log("selectedOrders : ", selectedOrders);
            const updates = selectedOrders.map(id => {
                const originalOrder = orders.find(o => o.rowId === id);
                if (!originalOrder) return Promise.resolve();
                console.log("originalOrder : ", originalOrder);
                const payload = {
                    ...originalOrder,
                    state: bulkState,
                };
                console.log("payload : ", payload);
                return updateOrder(id, payload);
            });

            console.log("updates : ", updates);
            await Promise.all(updates);

            toast.success(`${selectedOrders.length} commandes mises à jour !`);
            setBulkState('');
            setSelectedOrders([]);
            fetchOrders();

        } catch (error) {
            console.error("Bulk update failed", error);
            toast.error("Une erreur est survenue lors de la mise à jour groupée.");
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const getStateColor = (state) => {
        const s = (state || '');
        if (s.includes('Nouvelle')) return 'bg-blue-100 text-blue-700 border border-blue-200';
        if (s.includes('Annuler')) return 'bg-red-100 text-red-700 border border-red-200';
        if (s.includes('System')) return 'bg-orange-100 text-orange-700 border border-orange-200';
        if (s.includes('Atelier')) return 'bg-purple-100 text-purple-700 border border-purple-200';
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    };

    return (
        <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Historique des Commandes</h2>
                        <div className="text-sm text-slate-400 mt-1">{orders.length} commandes trouvées</div>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder="Rechercher..."
                            className="pl-10 pr-4 py-2 w-full md:w-72 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedOrders.length > 0 && (
                    <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <span className="text-sm font-bold text-blue-800 whitespace-nowrap">{selectedOrders.length} sélectionnée(s)</span>
                        <div className="h-4 w-px bg-blue-200"></div>
                        <select
                            value={bulkState}
                            onChange={(e) => setBulkState(e.target.value)}
                            className="text-sm border-slate-200 rounded-md focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="">Modifier l'état...</option>
                            <option value="Nouvelle">Nouvelle</option>
                            <option value="Atelier">Atelier</option>
                            <option value="System">Envoyer (Système)</option>
                            <option value="Annuler">Annuler</option>
                        </select>
                        <button
                            onClick={handleBulkUpdate}
                            disabled={!bulkState || isBulkUpdating}
                            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {isBulkUpdating ? '...' : 'Appliquer'}
                        </button>
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="px-6 py-4 w-10">
                                <input
                                    type="checkbox"
                                    checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrders.includes(o.rowId))}
                                    onChange={toggleSelectAll}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>
                            <th className="px-6 py-4">Ref & Date</th>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4">Localisation</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4 text-right">Montant</th>
                            <th className="px-6 py-4 text-center">État</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-12 text-center text-slate-400 animate-pulse">Chargement des données...</td>
                            </tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-12 text-center text-slate-400">Aucune commande trouvée.</td>
                            </tr>
                        ) : (
                            paginatedOrders.map((order) => (
                                <tr key={order.rowId} className={`hover:bg-blue-50/30 transition-colors group ${selectedOrders.includes(order.rowId) ? 'bg-blue-50/50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.includes(order.rowId)}
                                            onChange={() => toggleSelectRow(order.rowId)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 text-sm">{order.reference}</div>
                                        <div className="text-xs text-slate-400 font-mono mt-0.5">{order.date}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                {order.client?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-700">{order.client}</div>
                                                <div className="text-xs text-slate-400">{order.phone}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600">{order.wilaya}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 items-start">
                                            {order.isStopDesk ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                                    <Truck className="w-3 h-3" /> Stop Desk
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                    <Home className="w-3 h-3" /> Domicile
                                                </span>
                                            )}
                                            {order.isExchange && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                                                    <RefreshCw className="w-3 h-3" /> Échange
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-sm font-bold text-slate-800">{order.amount} <span className="text-xs font-normal text-slate-500">DA</span></div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${getStateColor(order.state)}`}>
                                            {order.state}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => navigate(`/commandes/details/${order.rowId}`)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Voir les détails"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => navigate(`/modifier/${order.rowId}`)}
                                                disabled={order.state.includes('System')}
                                                className={`p-2 rounded-lg transition-colors ${order.state.includes('System')
                                                    ? 'text-slate-200 cursor-not-allowed'
                                                    : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'
                                                    }`}
                                                title={order.state.includes('System') ? "Modification interdite (System)" : "Modifier"}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleSendToNoest(order.rowId, order.reference)}
                                                disabled={order.state !== 'Atelier'}
                                                className={`p-2 rounded-lg transition-colors ${order.state === 'Atelier'
                                                    ? 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                                                    : 'text-slate-200 cursor-not-allowed'
                                                    }`}
                                                title={order.state === 'Atelier' ? "Envoyer vers Noest" : "Envoi disponible uniquement en 'Atelier'"}
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleDelete(order.rowId, order.reference)}
                                                disabled={order.state.includes('System')}
                                                className={`p-2 rounded-lg transition-colors ${order.state.includes('System')
                                                    ? 'text-slate-200 cursor-not-allowed'
                                                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                title={order.state.includes('System') ? "Suppression interdite (System)" : "Supprimer"}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400 animate-pulse">Chargement des données...</div>
                ) : filteredOrders.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">Aucune commande trouvée.</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 p-4">
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrders.includes(o.rowId))}
                                    onChange={toggleSelectAll}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                Tout sélectionner
                            </label>
                        </div>

                        {paginatedOrders.map((order) => (
                            <div key={order.rowId} className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${selectedOrders.includes(order.rowId) ? 'ring-2 ring-blue-500 border-transparent' : ''}`}>
                                <div className="p-4 space-y-4">
                                    {/* Header: Checkbox + Ref + Status */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrders.includes(order.rowId)}
                                                onChange={() => toggleSelectRow(order.rowId)}
                                                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div>
                                                <div className="font-bold text-slate-800">{order.reference}</div>
                                                <div className="text-xs text-slate-400 font-mono">{order.date}</div>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getStateColor(order.state)}`}>
                                            {order.state}
                                        </span>
                                    </div>

                                    {/* Client Info */}
                                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 font-bold">
                                            {order.client?.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-700">{order.client}</div>
                                            <div className="text-sm text-slate-500 flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {order.phone}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location & Type */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase">Localisation</div>
                                            <div className="font-medium text-slate-700">{order.wilaya}</div>
                                            {(order.commune || order.address) && (
                                                <div className="text-xs text-slate-500 truncate max-w-[120px]" title={order.isStopDesk ? order.address : order.commune}>
                                                    {order.isStopDesk ? order.address : order.commune}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase">Livraison</div>
                                            <div className="flex flex-col gap-1 items-start mt-0.5">
                                                {order.isStopDesk ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                                                        <Truck className="w-3 h-3" /> Stop Desk
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                                                        <Home className="w-3 h-3" /> Domicile
                                                    </span>
                                                )}
                                                {order.isExchange && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700">
                                                        <RefreshCw className="w-3 h-3" /> Échange
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer: Amount & Actions */}
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="font-bold text-lg text-slate-800">{order.amount} <span className="text-xs font-normal text-slate-500">DA</span></div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/commandes/details/${order.rowId}`)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-100"
                                                title="Voir les détails"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => navigate(`/modifier/${order.rowId}`)}
                                                disabled={order.state.includes('System')}
                                                className={`p-2 rounded-lg transition-colors border border-slate-100 ${order.state.includes('System')
                                                    ? 'text-slate-200 cursor-not-allowed'
                                                    : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'
                                                    }`}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleSendToNoest(order.rowId, order.reference)}
                                                disabled={order.state !== 'Atelier'}
                                                className={`p-2 rounded-lg transition-colors border border-slate-100 ${order.state === 'Atelier'
                                                    ? 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                                                    : 'text-slate-200 cursor-not-allowed'
                                                    }`}
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleDelete(order.rowId, order.reference)}
                                                disabled={order.state.includes('System')}
                                                className={`p-2 rounded-lg transition-colors border border-slate-100 ${order.state.includes('System')
                                                    ? 'text-slate-200 cursor-not-allowed'
                                                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Afficher</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="border-slate-200 rounded-md text-sm py-1 pl-2 pr-6 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span>par page</span>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">
                        Page <span className="font-bold text-slate-800">{currentPage}</span> sur <span className="font-bold text-slate-800">{totalPages || 1}</span>
                    </span>

                    <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-2 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border-r border-slate-200 transition-colors"
                            title="Première page"
                        >
                            <ChevronFirst className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border-r border-slate-200 transition-colors"
                            title="Page précédente"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border-r border-slate-200 transition-colors"
                            title="Page suivante"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Dernière page"
                        >
                            <ChevronLast className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default OrdersListPage;
