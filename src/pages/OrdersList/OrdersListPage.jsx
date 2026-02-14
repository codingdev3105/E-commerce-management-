import { useState, useEffect, useMemo } from 'react';
import { getOrders, deleteOrder, updateOrder, sendToNoest, getValidationRules, getNoestTrackingInfo } from '../../services/api';
import { Search, Eye, Truck, Home, RefreshCw, Trash2, Pencil, Send, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Phone, FileDown, FileText, X, User, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import { useAppData } from '../../context/AppDataContext';
import { useStates } from '../../context/StatesContext';
import { exportToPDF } from '../../services/exportService';

import OrderDetailsPage from '../OrderDetailsPage';
import EditOrderPage from '../EditOrderPage';

import OrderDetailsModal from './components/OrderDetailsModal';
import MobileOrderCard from './components/MobileOrderCard';
import OrdersFilterBar from './components/OrdersFilterBar';
import OrdersBulkActions from './components/OrdersBulkActions';
import OrdersTable from './components/OrdersTable';
import { getCategoryFromEvent, parseNoestDate, formatNoestDate } from '../common/noestUtils';
import { safeString, getStateColor } from '../common/orderUtils';

function OrdersListPage() {
    const { orders, fetchOrders, setOrders, loading, wilayas } = useAppData();
    const [filterText, setFilterText] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tous');

    const { toast, confirm } = useUI();
    const { availableStates } = useStates();

    // View Navigation State (Internal)
    const [viewMode, setViewMode] = useState('list'); // 'list', 'details', 'edit'
    const [currentOrderId, setCurrentOrderId] = useState(null);

    const [selectedOrders, setSelectedOrders] = useState([]);
    const [bulkState, setBulkState] = useState('');
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    // Noest Details State
    const [selectedNoestOrder, setSelectedNoestOrder] = useState(null);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [noestData, setNoestData] = useState({});

    // --- Noest Tracking Logic ---
    const fetchNoestTracking = async () => {
        const trackedOrders = orders.filter(o => o.tracking && String(o.tracking).trim().length > 5);
        const trackingsToFetch = trackedOrders.map(o => o.tracking);

        if (trackingsToFetch.length === 0) {
            toast.info("Aucune commande avec tracking à mettre à jour.");
            return;
        }

        const loadingToast = toast.loading(`Actualisation du suivi Noest (${trackingsToFetch.length})...`);

        try {
            const result = await getNoestTrackingInfo(trackingsToFetch);

            const newMap = {};
            Object.values(result).forEach(item => {
                const info = item.OrderInfo || {};
                const activities = item.activity || [];

                const sortedActivities = activities.map(act => ({
                    ...act,
                    parsedDate: parseNoestDate(act.date)
                })).sort((a, b) => b.parsedDate - a.parsedDate);

                const latest = sortedActivities[0] || {};
                const isStopDesk = Number(info.stop_desk) === 1;
                const category = getCategoryFromEvent(latest.event_key, latest.event || info.current_status, isStopDesk);
                const wilayaName = (wilayas || []).find(w => w.code == info.wilaya_id)?.nom || '';

                newMap[info.tracking] = {
                    driver_name: info.driver_name,
                    driver_phone: info.driver_phone,
                    status: latest.event || info.current_status || 'En attente',
                    status_class: latest['badge-class'],
                    activities: sortedActivities.map(a => ({ ...a, date: formatNoestDate(a.parsedDate) })),
                    // Update other potentially changed fields
                    wilaya_name: wilayaName,
                    amount: info.montant, // Noest amount might differ
                };
            });

            setNoestData(prev => ({ ...prev, ...newMap }));
            toast.dismiss(loadingToast);
            toast.success("Suivi Noest actualisé !");
        } catch (error) {
            console.error(error);
            toast.dismiss(loadingToast);
            toast.error("Erreur lors de l'actualisation Noest");
        }
    };



    const handleBackToList = () => {
        setViewMode('list');
        setCurrentOrderId(null);
        fetchOrders(true); // Refresh data to show changes
    };

    useEffect(() => {
        // Initial fetch (lazy load)
        if (fetchOrders) fetchOrders();
    }, []);

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
                fetchOrders(true); // Refresh to show updated state
            } catch (error) {
                toast.error("Erreur lors de l'envoi vers Noest");
                console.error(error);
            }
        }
    };

    const wilayaMap = useMemo(() => {
        const map = {};
        (wilayas || []).forEach(w => {
            if (w && w.code) map[String(w.code)] = w.nom;
        });
        return map;
    }, [wilayas]);

    const filteredOrders = useMemo(() => {
        const query = (filterText || "").toLowerCase().trim();

        return (orders || []).filter(order => {
            // 1. Status Filter
            if (statusFilter !== 'Tous' && order.state !== statusFilter) {
                return false;
            }

            if (!query) return true;

            // 2. Special keywords
            if (query === "domicile") return !order.isStopDesk;
            if (query === "stopdesk") return order.isStopDesk;

            // 3. Multi-field search
            // Since data is normalized, we can safely use includes
            const productText = Array.isArray(order.product)
                ? order.product.map(p => safeString(p)).join(" ").toLowerCase()
                : safeString(order.product).toLowerCase();

            return (
                order.reference.toLowerCase().includes(query) ||
                order.client.toLowerCase().includes(query) ||
                order.phone.toLowerCase().includes(query) ||
                order.phone2.toLowerCase().includes(query) ||
                order.state.toLowerCase().includes(query) ||
                order.date.toLowerCase().includes(query) ||
                order.address.toLowerCase().includes(query) ||
                order.commune.toLowerCase().includes(query) ||
                order.wilaya.toLowerCase().includes(query) ||
                productText.includes(query)
            );
        });
    }, [orders, filterText, statusFilter]);

    const paginatedOrders = useMemo(() => {
        return filteredOrders.map(o => noestData[o.tracking] ? { ...o, ...noestData[o.tracking] } : o);
    }, [filteredOrders, noestData]);

    const statusCounts = useMemo(() => {
        const counts = { 'Tous': (orders || []).length };
        (orders || []).forEach(order => {
            const s = order.state || 'Inconnu';
            counts[s] = (counts[s] || 0) + 1;
        });
        return counts;
    }, [orders]);

    const availableStatuses = useMemo(() => {
        try {
            return ['Tous', ...Object.keys(statusCounts || {}).filter(s => s !== 'Tous')];
        } catch (e) {
            return ['Tous'];
        }
    }, [statusCounts]);

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
            fetchOrders(true);

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
            fetchOrders(true);

        } catch (error) {
            console.error("Bulk send failed", error);
            toast.error("Erreur lors de l'envoi groupé");
        } finally {
            setIsBulkUpdating(false);
        }
    };


    const handleSingleSendToNoest = async (id, ref) => {
        const confirmed = await confirm({
            title: "Confirmation d'envoi",
            message: `Envoyer la commande ${ref ? ref + ' ' : ''}vers Noest Express ?`,
            type: "confirm",
            confirmText: "Envoyer"
        });
        if (!confirmed) return;

        try {
            await sendToNoest(id);
            toast.success("Envoyé avec succès !");
            fetchOrders(true);
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de l'envoi.");
        }
    };

    const handleDeleteOrder = async (id, ref) => {
        const confirmed = await confirm({
            title: "Confirmation de suppression",
            message: `Êtes-vous sûr de vouloir supprimer la commande ${ref ? ref + ' ' : ''}?`,
            type: "danger",
            confirmText: "Supprimer"
        });
        if (!confirmed) return;

        try {
            await deleteOrder(id);
            toast.success("Commande supprimée !");
            fetchOrders(true);
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la suppression.");
        }
    };

    if (viewMode === 'details' && currentOrderId) {
        return <OrderDetailsPage orderId={currentOrderId} onBack={handleBackToList} />;
    }

    if (viewMode === 'edit' && currentOrderId) {
        return <EditOrderPage orderId={currentOrderId} onBack={handleBackToList} />;
    }

    return (
        <>
            <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <OrdersFilterBar
                    filteredCount={filteredOrders.length}
                    filterText={filterText}
                    setFilterText={setFilterText}
                    onRefreshNoest={fetchNoestTracking}
                    onRefreshOrders={async () => {
                        await fetchOrders(true);
                        toast.success("Liste actualisée");
                    }}
                    onExportPDF={handleExportFiltered}
                    availableStatuses={availableStatuses}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    statusCounts={statusCounts}
                />

                <OrdersBulkActions
                    selectedCount={selectedOrders.length}
                    bulkState={bulkState}
                    setBulkState={setBulkState}
                    availableStates={availableStates}
                    handleBulkUpdate={handleBulkUpdate}
                    isBulkUpdating={isBulkUpdating}
                    handleBulkSendToNoest={handleBulkSendToNoest}
                    handleExportSelection={handleExportSelection}
                />

                <OrdersTable
                    orders={paginatedOrders}
                    loading={loading}
                    selectedOrders={selectedOrders}
                    isAllSelected={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrders.includes(o.rowId))}
                    toggleSelectAll={toggleSelectAll}
                    toggleSelectRow={toggleSelectRow}
                    handleSingleSendToNoest={handleSingleSendToNoest}
                    handleDeleteOrder={handleDeleteOrder}
                    setSelectedNoestOrder={setSelectedNoestOrder}
                    setCurrentOrderId={setCurrentOrderId}
                    setViewMode={setViewMode}
                />

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
                                <MobileOrderCard
                                    key={order.rowId}
                                    order={order}
                                    isSelected={selectedOrders.includes(order.rowId)}
                                    toggleSelectRow={toggleSelectRow}
                                    handleSendToNoest={handleSingleSendToNoest}
                                    handleDelete={handleDeleteOrder}
                                    setCurrentOrderId={setCurrentOrderId}
                                    setViewMode={setViewMode}
                                    expandedOrderId={expandedOrderId}
                                    setExpandedOrderId={setExpandedOrderId}
                                />
                            ))}
                        </div>
                    )
                    }
                </div >


            </section >
            {selectedNoestOrder && (
                <OrderDetailsModal
                    order={selectedNoestOrder}
                    onClose={() => setSelectedNoestOrder(null)}
                />
            )}
        </>
    );
}



export default OrdersListPage;
