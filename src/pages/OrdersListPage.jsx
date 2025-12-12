import { useState, useEffect } from 'react';
import { getOrders, deleteOrder, updateOrder, sendToNoest, getValidationRules } from '../services/api';
import { Search, Eye, Truck, Home, RefreshCw, Trash2, Pencil, Send, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Phone, FileDown, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../context/UIContext';
import { useAppData } from '../context/AppDataContext';
import { useStates } from '../context/StatesContext';
import { exportToPDF } from '../services/exportService';
import { getNoestWilayas, getNoestCommunes, getNoestDesks } from '../services/api';

function OrdersListPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tous');
    const navigate = useNavigate();
    const { toast, confirm } = useUI();
    const { wilayas } = useAppData();
    const { availableStates } = useStates();

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
            message: `Êtes - vous sûr de vouloir supprimer la commande ${ref} ? Cette action est irréversible.`,
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

    const handleExportNewOrders = async () => {
        const newOrders = orders.filter(o => (o.state || '').includes('Nouvelle'));

        if (newOrders.length === 0) {
            toast.error("Aucune nouvelle commande à exporter.");
            return;
        }

        const role = localStorage.getItem('role') || 'Utilisateur';
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `commandes_nouvelles_${timestamp}.pdf`;

        // Export PDF
        await exportToPDF(newOrders, filename, role);
        toast.success(`Export PDF téléchargé!(${newOrders.length} nouvelles commandes)`);

        // Ask user if they want to update status to 'Atelier'
        const confirmed = await confirm({
            title: "Mise à jour des états",
            message: `${newOrders.length} nouvelles commandes ont été exportées.Voulez - vous changer leur état vers "Atelier" ? `,
            type: "confirm",
            confirmText: "Oui, passer à Atelier",
            cancelText: "Non, garder Nouvelle"
        });

        if (confirmed) {
            setIsBulkUpdating(true);
            try {
                const updates = newOrders.map(o => {
                    const payload = { ...o, state: 'Atelier' };
                    return updateOrder(o.rowId, payload);
                });
                await Promise.all(updates);
                toast.success(`${newOrders.length} commandes passées en 'Atelier'!`);
                fetchOrders();
            } catch (error) {
                console.error("State update failed", error);
                toast.error("Erreur lors de la mise à jour des états.");
            } finally {
                setIsBulkUpdating(false);
            }
        }
    };

    const handleExportSelection = () => {
        const selected = orders.filter(o => selectedOrders.includes(o.rowId));
        if (selected.length === 0) return;

        const role = localStorage.getItem('role') || 'Utilisateur';
        const timestamp = new Date().toISOString().slice(0, 10);
        exportToPDF(selected, `selection_commandes_${timestamp}.pdf`, role);
        toast.success("Sélection exportée en PDF !");
    };

    const handleSendToNoest = async (rowId, ref) => {
        const confirmed = await confirm({
            title: "Envoyer vers Noest ?",
            message: `Voulez - vous envoyer la commande ${ref} vers Noest Express ? Un numéro de tracking sera généré.`,
            type: "confirm",
            confirmText: "Oui, envoyer",
            cancelText: "Annuler"
        });

        if (confirmed) {
            try {
                console.log(rowId);
                const result = await sendToNoest(rowId);
                toast.success(`Commande envoyée! Tracking: ${result.tracking} `);
                fetchOrders(); // Refresh to show updated state
            } catch (error) {
                toast.error("Erreur lors de l'envoi vers Noest");
                console.error(error);
            }
        }
    };

    const filteredOrders = orders.filter(order => {
        if (statusFilter !== 'Tous' && (order.state || 'Inconnu') !== statusFilter) {
            return false;
        }

        if (!filterText) return true;

        const text = filterText.toLowerCase().trim();

        // ----- 1. CONDITIONS SPÉCIALES -----
        if (text === "domicile") {
            return order.isStopDesk === false;
        }

        if (text === "stopdesk") {
            return order.isStopDesk === true;
        }

        // ----- 2. NORMALISATION -----
        const reference = (order.reference || "").toLowerCase();
        const client = (order.client || "").toLowerCase();
        const phone = (order.phone || "").toLowerCase();
        const state = (order.state || "").toLowerCase();
        const date = (order.date || "").toLowerCase();
        const address = (order.address || "").toLowerCase();
        const commune = (order.commune || "").toLowerCase();
        const wilaya = (order.wilaya || "").toLowerCase();

        // ----- 3. PRODUITS -----
        let productText = "";

        if (Array.isArray(order.product)) {
            // Liste → on convertit en texte
            productText = order.product
                .map(p => (typeof p === "string" ? p : JSON.stringify(p)))
                .join(" ")
                .toLowerCase();
        } else if (typeof order.product === "string") {
            productText = order.product.toLowerCase();
        } else if (typeof order.product === "object" && order.product !== null) {
            productText = JSON.stringify(order.product).toLowerCase();
        }

        // ----- 4. FILTRAGE -----
        return (
            reference.includes(text) ||
            client.includes(text) ||
            phone.includes(text) ||
            state.includes(text) ||
            date.includes(text) ||
            address.includes(text) ||
            commune.includes(text) ||
            wilaya.includes(text) ||
            productText.includes(text)
        );
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

    // Reset to page 1 if filter changes
    useEffect(() => {
        setCurrentPage(1);
        setCurrentPage(1);
    }, [filterText, itemsPerPage, statusFilter]);

    // Status counts
    const statusCounts = orders.reduce((acc, order) => {
        const s = order.state || 'Inconnu';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, { 'Tous': orders.length });

    const availableStatuses = ['Tous', ...Object.keys(statusCounts).filter(s => s !== 'Tous')];

    // Selection Logic
    const toggleSelectAll = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();

        const allFilteredSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrders.includes(o.rowId));

        if (allFilteredSelected) {
            setSelectedOrders(prev => prev.filter(id => !filteredOrders.find(o => o.rowId === id)));
        } else {
            const newIds = filteredOrders.map(o => o.rowId);
            setSelectedOrders(prev => [...new Set([...prev, ...newIds])]);
        }
    };

    const toggleSelectRow = (id, e) => {
        if (e && e.stopPropagation) e.stopPropagation();

        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Bulk Update Logic
    const handleBulkUpdate = async () => {
        if (!bulkState) return;

        const selectedOrderObjects = orders.filter(o => selectedOrders.includes(o.rowId));
        if (selectedOrderObjects.length === 0) return;

        const distinctStates = [...new Set(selectedOrderObjects.map(o => (o.state || '')))];

        if (distinctStates.length > 1) {
            toast.error("Action refusée : Vous ne pouvez modifier groupement que des commandes ayant le même état actuel.");
            return;
        }

        const currentState = distinctStates[0];
        const targetState = bulkState;

        let isAllowed = false;
        const isStandardState = (s) => s.includes('Nouvelle') || s.includes('Atelier');
        const isSystemState = (s) => s.includes('System') || s.includes('Envoyer');
        const isCancelledState = (s) => s.includes('Annuler');

        if (isSystemState(currentState)) {
            if (targetState === 'Annuler') {
                isAllowed = true;
            } else {
                toast.error("Action refusée : Les commandes 'System' ne peuvent être changées qu'en 'Annuler'.");
                return;
            }
        } else if (isCancelledState(currentState)) {
            if (targetState === 'Nouvelle') {
                isAllowed = true;
            } else {
                toast.error("Action refusée : Les commandes annulées ne peuvent être rétablies qu'en 'Nouvelle'.");
                return;
            }
        } else if (isStandardState(currentState)) {
            isAllowed = true;
        } else {
            isAllowed = false;
        }

        if (!isAllowed) {
            toast.error("Transition d'état non autorisée.");
            return;
        }

        const confirmed = await confirm({
            title: "Confirmation de mise à jour",
            message: `Voulez - vous passer ${selectedOrders.length} commandes de "${currentState}" vers "${bulkState}" ? `,
            type: "confirm",
            confirmText: "Appliquer",
        });

        if (!confirmed) return;

        setIsBulkUpdating(true);
        try {
            const updates = selectedOrders.map(id => {
                const originalOrder = orders.find(o => o.rowId === id);
                if (!originalOrder) return Promise.resolve();
                const payload = {
                    ...originalOrder,
                    state: bulkState,
                };
                return updateOrder(id, payload);
            });

            await Promise.all(updates);

            toast.success(`${selectedOrders.length} commandes mises à jour!`);
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
        if (s.includes('System') || s.includes('Envoyer')) return 'bg-orange-100 text-orange-700 border border-orange-200';
        if (s.includes('Atelier')) return 'bg-purple-100 text-purple-700 border border-purple-200';
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    };

    return (
        <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Historique des Commandes</h2>
                        <div className="text-sm text-slate-400 mt-1">{filteredOrders.length} commandes trouvées</div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center w-full md:w-auto">

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500 font-medium whitespace-nowrap">Afficher :</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="border-slate-200 rounded-lg text-sm py-2 px-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 w-full md:w-auto"
                                title="Lignes par page"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={filteredOrders.length}>ALL</option>
                            </select>
                        </div>

                        <div className="relative group w-full md:w-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
                            <input
                                type="text"
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                placeholder="Rechercher une commande..."
                                className="pl-12 pr-4 py-3 w-full md:w-80 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm hover:shadow-md"
                            />
                            {filterText && (
                                <button
                                    onClick={() => setFilterText('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Global Export Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportNewOrders}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors shadow-sm text-sm font-bold whitespace-nowrap"
                                title="Exporter les nouvelles commandes en PDF"
                            >
                                <FileText className="w-4 h-4" />
                                <span className="inline">Exporter Nouvelles (PDF)</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Status Filter Tabs */}
                <div className="flex items-center gap-2 flex-wrap px-1">
                    {availableStatuses.map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`group relative px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 border-2 ${statusFilter === status
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/30 scale-105'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                {status}
                                <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-bold rounded-full transition-all ${statusFilter === status
                                    ? 'bg-white/20 text-white backdrop-blur-sm'
                                    : 'bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700'
                                    }`}>
                                    {statusCounts[status]}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>


                {/* Bulk Actions Bar */}
                {selectedOrders.length > 0 && (
                    <div className="flex flex-col md:flex-row md:items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between md:justify-start gap-4">
                            <span className="text-sm font-bold text-blue-800 whitespace-nowrap">{selectedOrders.length} sélectionnée(s)</span>
                            <div className="hidden md:block h-4 w-px bg-blue-200"></div>
                        </div>

                        <select
                            value={bulkState}
                            onChange={(e) => setBulkState(e.target.value)}
                            className="w-full md:w-auto text-sm border-slate-200 rounded-md focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="">Modifier l'état...</option>
                            {availableStates.map(state => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>

                        <button
                            onClick={handleBulkUpdate}
                            disabled={!bulkState || isBulkUpdating}
                            className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {isBulkUpdating ? '...' : 'Appliquer'}
                        </button>

                        <div className="h-6 w-px bg-blue-200 mx-1 hidden md:block"></div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleExportSelection}
                                className="p-2 bg-white text-red-500 rounded border border-blue-100 hover:bg-red-50 transition-colors"
                                title="Exporter la sélection en PDF"
                            >
                                <FileText className="w-4 h-4" />
                            </button>
                        </div>
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
                            <th className="px-6 py-4">Produit</th>
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
                                <tr key={order.rowId} className={`hover: bg - blue - 50 / 30 transition - colors group ${selectedOrders.includes(order.rowId) ? 'bg-blue-50/50' : ''} `}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.includes(order.rowId)}
                                            onChange={(e) => toggleSelectRow(order.rowId, e)}
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
                                        <div className="text-sm text-slate-700 max-w-[200px] whitespace-normal break-words" title={typeof order.product === 'string' ? order.product : ''}>
                                            <strong>{order.product || <span className="text-slate-400 italic">Non spécifié</span>}</strong>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col text-sm">
                                            <span className="font-medium text-slate-700">{wilayas.find(w => w.code == order.wilaya)?.nom || ''} {order.wilaya}</span>
                                            {order.commune && <span className="text-slate-500 text-xs">{order.commune}</span>}
                                            {order.address && <span className="text-slate-400 text-xs truncate max-w-[150px]" title={order.address}>{order.address}</span>}
                                        </div>
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
                                                onClick={() => navigate(`/commandes/modifier/${order.rowId}`)}
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
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                Tout sélectionner
                            </label>
                        </div>

                        {paginatedOrders.map((order) => (
                            <div key={order.rowId} className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${selectedOrders.includes(order.rowId) ? 'ring-2 ring-blue-500 border-transparent' : ''} `}>
                                <div className="p-4 space-y-4">
                                    {/* Header: Checkbox + Ref + Date + Status + Amount */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrders.includes(order.rowId)}
                                                onChange={(e) => toggleSelectRow(order.rowId, e)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div>
                                                <div className="font-bold text-slate-800">{order.reference}</div>
                                                <div className="text-xs text-slate-400 font-mono">{order.date}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getStateColor(order.state)} `}>
                                                {order.state}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Middle: Client, Product & Price (Stacked) */}
                                    <div className="bg-slate-50 p-3 rounded-lg space-y-3">
                                        {/* Row 1: Client */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 font-bold shrink-0">
                                                {order.client?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-700">{order.client}</div>
                                                <div className="text-sm text-slate-500 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {order.phone}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-200 w-full"></div>

                                        {/* Row 2: Product & Price */}
                                        <div className="flex justify-between items-center">
                                            <div className="text-sm font-medium text-slate-600 truncate mr-2 flex-1" title={order.product}>
                                                {order.product || <span className="text-slate-400 italic">Produit non spécifié</span>}
                                            </div>
                                            <div className="font-bold text-slate-800 text-lg whitespace-nowrap">
                                                {order.amount} <span className="text-xs font-normal text-slate-500">DA</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer: Delivery Type & Actions */}
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="flex flex-col gap-1 items-start">
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

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/commandes/details/${order.rowId}`)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-100"
                                                title="Voir les détails"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => navigate(`/commandes/modifier/${order.rowId}`)}
                                                disabled={order.state.includes('System')}
                                                className={`p-2 rounded-lg transition-colors border border-slate-100 ${order.state.includes('System')
                                                    ? 'text-slate-200 cursor-not-allowed'
                                                    : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'
                                                    } `}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleSendToNoest(order.rowId, order.reference)}
                                                disabled={order.state !== 'Atelier'}
                                                className={`p-2 rounded-lg transition-colors border border-slate-100 ${order.state === 'Atelier'
                                                    ? 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                                                    : 'text-slate-200 cursor-not-allowed'
                                                    } `}
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleDelete(order.rowId, order.reference)}
                                                disabled={order.state.includes('System')}
                                                className={`p-2 rounded-lg transition-colors border border-slate-100 ${order.state.includes('System')
                                                    ? 'text-slate-200 cursor-not-allowed'
                                                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                    } `}
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
                <div className="text-sm text-slate-500">
                    Affichage de {Math.min(filteredOrders.length, (currentPage - 1) * itemsPerPage + 1)} à {Math.min(filteredOrders.length, currentPage * itemsPerPage)} sur {filteredOrders.length}
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
        </section >
    );
}

export default OrdersListPage;
