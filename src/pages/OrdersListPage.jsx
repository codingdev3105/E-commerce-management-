import { useState, useEffect } from 'react';
import { getOrders, deleteOrder, updateOrder, sendToNoest, getValidationRules } from '../services/api';
import { Search, Eye, Truck, Home, RefreshCw, Trash2, Pencil, Send, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Phone, FileDown, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../context/UIContext';
import { useAppData } from '../context/AppDataContext';
import { useStates } from '../context/StatesContext';
import { exportToPDF } from '../services/exportService';
import { getNoestWilayas, getNoestCommunes, getNoestDesks } from '../services/api';

import OrderDetailsPage from './OrderDetailsPage';
import EditOrderPage from './EditOrderPage';

function OrdersListPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tous');
    const navigate = useNavigate();
    const { toast, confirm } = useUI();
    const { wilayas } = useAppData();
    const { availableStates } = useStates();

    // View Navigation State (Internal)
    const [viewMode, setViewMode] = useState('list'); // 'list', 'details', 'edit'
    const [currentOrderId, setCurrentOrderId] = useState(null);

    const [selectedOrders, setSelectedOrders] = useState([]);
    const [bulkState, setBulkState] = useState('');
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);



    const handleBackToList = () => {
        setViewMode('list');
        setCurrentOrderId(null);
        fetchOrders(); // Refresh data to show changes
    };

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

    const handleExportFiltered = async () => {
        if (filteredOrders.length === 0) {
            toast.error("Aucune commande affichée à exporter.");
            return;
        }

        const role = localStorage.getItem('role') || 'Utilisateur';
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `commandes_export_${timestamp}.pdf`;

        // Export PDF
        await exportToPDF(filteredOrders, filename, role);
        toast.success(`Export PDF téléchargé! (${filteredOrders.length} commandes)`);
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
        const phone2 = (order.phone2 || "").toLowerCase();
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
            phone2.includes(text) ||
            state.includes(text) ||
            date.includes(text) ||
            address.includes(text) ||
            commune.includes(text) ||
            wilaya.includes(text) ||
            productText.includes(text)
        );
    });

    // No Pagination - Show All
    const paginatedOrders = filteredOrders;

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

        // 1. Restrict modification to 'Nouvelle' or 'Atelier' only
        const isEditable = ['Nouvelle', 'Atelier'].some(s => (currentState || '').includes(s));
        if (!isEditable) {
            toast.error("Modification refusée : Seules les commandes 'Nouvelle' ou 'Atelier' peuvent être modifiées.");
            return;
        }

        // 2. Interdire le passage MANUEL vers l'état 'Envoyer' ou 'System'
        if (targetState && (targetState.includes('System') || targetState.includes('Envoyer'))) {
            toast.error("Action refusée : Pour envoyer une commande, utilisez le bouton 'Envoyer' (Avion).");
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

    const handleBulkSendToNoest = async () => {
        const selectedOrderObjects = orders.filter(o => selectedOrders.includes(o.rowId));
        if (selectedOrderObjects.length === 0) return;

        // Filter valid orders: Must be 'Nouvelle' or 'Atelier'
        const validOrders = selectedOrderObjects.filter(o => {
            const s = (o.state || '');
            return ['Nouvelle', 'Atelier'].some(keyword => s.includes(keyword));
        });

        if (validOrders.length === 0) {
            toast.error("Aucune commande éligible à l'envoi (seules 'Nouvelle' ou 'Atelier' peuvent être envoyées).");
            return;
        }

        const confirmed = await confirm({
            title: "Envoi groupé vers Noest",
            message: `Voulez-vous envoyer ${validOrders.length} commande(s) vers Noest Express ?`,
            type: "confirm",
            confirmText: "Oui, envoyer tout",
        });

        if (!confirmed) return;

        setIsBulkUpdating(true);
        let successCount = 0;
        let failCount = 0;

        try {
            const results = await Promise.allSettled(
                validOrders.map(o => sendToNoest(o.rowId))
            );

            results.forEach(res => {
                if (res.status === 'fulfilled') successCount++;
                else failCount++;
            });

            if (successCount > 0) toast.success(`${successCount} commandes envoyées avec succès !`);
            if (failCount > 0) toast.error(`${failCount} échecs d'envoi.`);

            setSelectedOrders([]);
            fetchOrders();

        } catch (error) {
            console.error("Bulk send failed", error);
            toast.error("Erreur lors de l'envoi groupé");
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const getStateColor = (state) => {
        const s = (state || '');
        if (s.includes('Nouvelle')) return 'bg-blue-100 text-blue-700 border border-blue-200';
        if (s.includes('Annuler') || s.includes('Retour')) return 'bg-red-100 text-red-700 border border-red-200';
        if (s.includes('Livré') || s.includes('Encaissé')) return 'bg-green-100 text-green-700 border border-green-200';
        if (s.includes('En Livraison')) return 'bg-orange-100 text-orange-700 border border-orange-200';
        if (s.includes('En Hub') || s.includes('Validé') || s.includes('Uploadé')) return 'bg-cyan-100 text-cyan-700 border border-cyan-200';
        if (s.includes('System') || s.includes('Envoyer')) return 'bg-amber-100 text-amber-700 border border-amber-200'; // Changed to amber for distinction
        if (s.includes('Atelier')) return 'bg-purple-100 text-purple-700 border border-purple-200';
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    };

    if (viewMode === 'details' && currentOrderId) {
        return <OrderDetailsPage orderId={currentOrderId} onBack={handleBackToList} />;
    }

    if (viewMode === 'edit' && currentOrderId) {
        return <EditOrderPage orderId={currentOrderId} onBack={handleBackToList} />;
    }

    return (
        <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="px-4 py-4 md:px-8 md:py-6 border-b border-slate-100 flex flex-col gap-3 md:gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    <div>
                        <h2 className="text-base md:text-lg font-bold text-slate-800">Liste des commandes ({filteredOrders.length})</h2>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative group flex-1 md:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
                            <input
                                type="text"
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                placeholder="Rechercher..."
                                className="pl-9 pr-8 py-2 md:py-3 w-full md:w-80 bg-white border border-slate-200 rounded-lg md:rounded-xl text-xs md:text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 md:focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm"
                            />
                            {filterText && (
                                <button
                                    onClick={() => setFilterText('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-3 h-3 text-slate-400" />
                                </button>
                            )}
                        </div>

                        {/* Global Export Buttons */}
                        <button
                            onClick={handleExportFiltered}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors shadow-sm text-xs md:text-sm font-bold whitespace-nowrap"
                            title="Exporter PDF"
                        >
                            <FileText className="w-4 h-4" />
                            <span className="hidden md:inline">Exporter PDF</span>
                        </button>
                    </div>
                </div>

                {/* Status Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
                    {availableStatuses.map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`group relative px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-200 border ${statusFilter === status
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md md:shadow-lg shadow-blue-500/30'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                                }`}
                        >
                            <span className="flex items-center gap-1.5 md:gap-2">
                                {status}
                                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 md:min-w-[24px] md:h-6 px-1.5 text-[10px] md:text-xs font-bold rounded-full transition-all ${statusFilter === status
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

                        <button
                            onClick={handleBulkSendToNoest}
                            disabled={isBulkUpdating}
                            className="w-full md:w-auto px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            title="Envoyer la sélection vers Noest"
                        >
                            <Send className="w-4 h-4" />
                            {isBulkUpdating ? '...' : 'Envoyer vers Noest'}
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
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="px-3 py-3 w-8 text-center">
                                <input
                                    type="checkbox"
                                    checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrders.includes(o.rowId))}
                                    onChange={toggleSelectAll}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                />
                            </th>
                            <th className="px-3 py-3">Ref & Date</th>
                            <th className="px-3 py-3">Client</th>
                            <th className="px-3 py-3">Produit</th>
                            <th className="px-3 py-3">Localisation</th>
                            <th className="px-3 py-3">Type</th>
                            <th className="px-3 py-3 text-right">Montant</th>
                            <th className="px-3 py-3 text-center">État</th>
                            <th className="px-3 py-3 text-center">Actions</th>
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
                                    <td className="px-3 py-2 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.includes(order.rowId)}
                                            onChange={(e) => toggleSelectRow(order.rowId, e)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="font-bold text-slate-800 text-xs">{order.reference}</div>
                                        <div className="text-[10px] text-slate-400 font-mono leading-tight">{order.date}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                                                {order.client?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-700 truncate max-w-[120px]" title={order.client}>{order.client}</div>
                                                <div className="text-[10px] text-slate-400 leading-tight">
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
                                    <td className="px-3 py-2">
                                        <div className="text-xs text-slate-700 min-w-[200px] whitespace-normal" title={typeof order.product === 'string' ? order.product : ''}>
                                            <span className="font-medium">{order.product || <span className="text-slate-400 italic">Non spécifié</span>}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-col text-[11px] leading-tight">
                                            <span className="font-medium text-slate-700 truncate max-w-[120px]">{wilayas.find(w => w.code == order.wilaya)?.nom || ''} {order.wilaya}</span>
                                            {order.commune && <span className="text-slate-500 text-[10px]">{order.commune}</span>}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-col gap-0.5 items-start">
                                            {order.isStopDesk ? (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                    <Truck className="w-3 h-3" /> Stop
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-100">
                                                    <Home className="w-3 h-3" /> Dom
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="text-xs font-bold text-slate-800 whitespace-nowrap">{order.amount} <span className="text-[10px] font-normal text-slate-500">DA</span></div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm border ${getStateColor(order.state)}`}>
                                            {order.state}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => { setCurrentOrderId(order.rowId); setViewMode('details'); }}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Détails"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>

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
                                                onClick={() => handleSendToNoest(order.rowId, order.reference)}
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
                                                onClick={() => handleDelete(order.rowId, order.reference)}
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
                            <div key={order.rowId} className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden ${selectedOrders.includes(order.rowId) ? 'ring-1 ring-blue-500 border-transparent' : ''}`}>
                                <div className="p-3">
                                    {/* Top Row: Checkbox, Ref, Status */}
                                    <div className="flex items-center gap-3 mb-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.includes(order.rowId)}
                                            onChange={(e) => toggleSelectRow(order.rowId, e)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-800 text-sm truncate">{order.reference}</span>
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStateColor(order.state)}`}>
                                                    {order.state}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Grid: Compact Layout */}
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs mb-3">
                                        <div className="col-span-1 text-slate-500 font-mono">{order.date}</div>
                                        <div className="col-span-1 text-right font-bold text-slate-800">{order.amount} DA</div>

                                        <div className="col-span-2 border-t border-slate-100 my-1"></div>

                                        <div className="col-span-2 flex items-center justify-between">
                                            <div className="font-bold text-slate-700 truncate mr-2" title={order.client}>{order.client}</div>
                                            <div className="text-slate-500 flex items-center gap-1 shrink-0">
                                                <Phone className="w-3 h-3" />
                                                <span>{order.phone}</span>
                                            </div>
                                        </div>

                                        <div className="col-span-2 text-slate-600 truncate bg-slate-50 px-2 py-1 rounded" title={order.product}>
                                            {order.product || <span className="text-slate-400 italic">Non spécifié</span>}
                                        </div>
                                    </div>


                                    {/* Footer: Type & Actions */}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                        {/* Delivery Mode */}
                                        <div className="flex items-center gap-2">
                                            {order.isStopDesk ? (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                    <Truck className="w-3 h-3" /> Stop
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                    <Home className="w-3 h-3" /> Dom
                                                </span>
                                            )}
                                            {order.isExchange && (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                                    <RefreshCw className="w-3 h-3" /> Éch
                                                </span>
                                            )}
                                        </div>

                                        {/* Mini Action Buttons */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => { setCurrentOrderId(order.rowId); setViewMode('details'); }}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded border border-slate-200 transition-colors"
                                                title="Voir"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={() => { setCurrentOrderId(order.rowId); setViewMode('edit'); }}
                                                disabled={!['Nouvelle', 'Atelier'].some(s => (order.state || '').includes(s))}
                                                className={`p-1.5 rounded transition-colors ${!['Nouvelle', 'Atelier'].some(s => (order.state || '').includes(s))
                                                    ? 'text-slate-200 cursor-not-allowed bg-slate-50'
                                                    : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'
                                                    }`}
                                                title="Modifier"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={() => handleSendToNoest(order.rowId, order.reference)}
                                                disabled={!['Nouvelle', 'Atelier'].some(s => (order.state || '').includes(s))}
                                                className={`p-1.5 rounded transition-colors ${['Nouvelle', 'Atelier'].some(s => (order.state || '').includes(s))
                                                    ? 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                                                    : 'text-slate-200 cursor-not-allowed hidden'
                                                    }`}
                                                title="Noest"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={() => handleDelete(order.rowId, order.reference)}
                                                disabled={!['Nouvelle', 'Atelier'].some(s => (order.state || '').includes(s))}
                                                className={`p-1.5 rounded transition-colors ${!['Nouvelle', 'Atelier'].some(s => (order.state || '').includes(s))
                                                    ? 'text-slate-200 cursor-not-allowed bg-slate-50'
                                                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
                }
            </div >


        </section >
    );
}

export default OrdersListPage;
