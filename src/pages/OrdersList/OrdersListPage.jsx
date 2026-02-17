import { useState, useEffect, useMemo } from 'react';
import { deleteOrder, updateOrder, sendToNoest, updateShippedStatus } from '../../services/api';
import { useUI } from '../../context/UIContext';
import { useAppData } from '../../context/AppDataContext';
import { useStates } from '../../context/StatesContext';
import { exportToPDF } from '../../services/exportService';

import OrderDetailsPage from '../OrderDetails/OrderDetailsPage';
import EditOrderPage from '../EditOrder/EditOrderPage';

import MobileOrderCard from './components/MobileOrderCard';
import OrdersFilterBar from './components/OrdersFilterBar';
import OrdersBulkActions from './components/OrdersBulkActions';
import OrdersTable from './components/OrdersTable';
import { safeString } from '../common/orderUtils';

function OrdersListPage() {
    const { orders, fetchOrders, setOrders, loading } = useAppData();
    const [filterText, setFilterText] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tous');
    const [remarkFilter, setRemarkFilter] = useState(false);
    const [shippedFilter, setShippedFilter] = useState(false);

    const { toast, confirm } = useUI();
    const { availableStates } = useStates();

    // View Navigation State (Internal)
    const [viewMode, setViewMode] = useState('list'); // 'list', 'details', 'edit'
    const [currentOrderId, setCurrentOrderId] = useState(null);

    const [selectedOrders, setSelectedOrders] = useState([]);
    const [bulkState, setBulkState] = useState('');
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    const [expandedOrderId, setExpandedOrderId] = useState(null);

    const handleBackToList = () => {
        setViewMode('list');
        setCurrentOrderId(null);
        fetchOrders(true);
    };

    useEffect(() => {
        if (fetchOrders) fetchOrders();
    }, []);



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
                order.note.toLowerCase().includes(query) ||
                productText.includes(query)
            );
        }).filter(order => {
            if (remarkFilter) {
                const note = (order.note || order.remarque || '').trim();
                if (note.length === 0) return false;
            }
            if (shippedFilter) {
                return order.isShipped === true;
            }
            return true;
        });
    }, [orders, filterText, statusFilter, remarkFilter, shippedFilter]);



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

        // Filter valid orders: Must be 'Nouvelle', 'Atelier' or 'Annul'
        const validOrders = selectedOrderObjects.filter(o => {
            const s = (o.state || '');
            return ['Nouvelle', 'Atelier', 'Annul'].some(keyword => s.includes(keyword));
        });

        if (validOrders.length === 0) {
            toast.error("Aucune commande éligible (seules 'Nouvelle', 'Atelier' ou 'Annul' peuvent être envoyées).");
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

    const handleBulkMarkShipped = async () => {
        const selectedOrderObjects = orders.filter(o => selectedOrders.includes(o.rowId));
        if (selectedOrderObjects.length === 0) return;

        // Filter valid orders: Must be 'En traitement'
        const validOrders = selectedOrderObjects.filter(o => o.state === 'En traitement' && !o.isShipped);

        if (validOrders.length === 0) {
            toast.error("Aucune commande éligible (seules les commandes 'En traitement' non envoyées peuvent être marquées).");
            return;
        }

        const confirmed = await confirm({
            title: "Marquer comme envoyé",
            message: `Voulez-vous marquer ${validOrders.length} commande(s) comme envoyée(s) à la société ?`,
            type: "confirm",
            confirmText: "Oui, tout marquer",
        });

        if (!confirmed) return;

        setIsBulkUpdating(true);
        let successCount = 0;
        let failCount = 0;

        try {
            const results = await Promise.allSettled(
                validOrders.map(o => updateShippedStatus(o.rowId, 'OUI'))
            );

            results.forEach(res => {
                if (res.status === 'fulfilled') successCount++;
                else failCount++;
            });

            if (successCount > 0) toast.success(`${successCount} commandes marquées envoyées !`);
            if (failCount > 0) toast.error(`${failCount} échecs.`);

            setSelectedOrders([]);
            fetchOrders(true);
        } catch (error) {
            console.error("Bulk mark shipped failed", error);
            toast.error("Erreur lors de l'action groupée");
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

    const handleUpdateShipped = async (id) => {
        const confirmed = await confirm({
            title: "Confirmation d'envoi société",
            message: "Marquer cette commande comme envoyée à la société de livraison ?",
            type: "confirm",
            confirmText: "Oui, marquer envoyé"
        });
        if (!confirmed) return;

        try {
            await updateShippedStatus(id, 'OUI');
            toast.success("Statut mis à jour !");
            fetchOrders(true);
        } catch (error) {
            console.error(error);
            toast.error("Erreur mise à jour.");
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
                    onRefreshOrders={async () => {
                        await fetchOrders(true);
                        toast.success("Liste actualisée");
                    }}
                    onExportPDF={handleExportFiltered}
                    availableStatuses={availableStatuses}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    statusCounts={statusCounts}
                    remarkFilter={remarkFilter}
                    setRemarkFilter={setRemarkFilter}
                    shippedFilter={shippedFilter}
                    setShippedFilter={setShippedFilter}
                />

                <OrdersBulkActions
                    selectedCount={selectedOrders.length}
                    bulkState={bulkState}
                    setBulkState={setBulkState}
                    availableStates={availableStates}
                    handleBulkUpdate={handleBulkUpdate}
                    isBulkUpdating={isBulkUpdating}
                    handleBulkSendToNoest={handleBulkSendToNoest}
                    handleBulkMarkShipped={handleBulkMarkShipped}
                    handleExportSelection={handleExportSelection}
                />

                <OrdersTable
                    orders={filteredOrders}
                    loading={loading}
                    selectedOrders={selectedOrders}
                    isAllSelected={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrders.includes(o.rowId))}
                    toggleSelectAll={toggleSelectAll}
                    toggleSelectRow={toggleSelectRow}
                    handleSingleSendToNoest={handleSingleSendToNoest}
                    handleDeleteOrder={handleDeleteOrder}
                    handleUpdateShipped={handleUpdateShipped}
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

                            {filteredOrders.map((order) => (
                                <MobileOrderCard
                                    key={order.rowId}
                                    order={order}
                                    isSelected={selectedOrders.includes(order.rowId)}
                                    toggleSelectRow={toggleSelectRow}
                                    handleSendToNoest={handleSingleSendToNoest}
                                    handleDelete={handleDeleteOrder}
                                    handleUpdateShipped={handleUpdateShipped}
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


            </section>
        </>
    );
}



export default OrdersListPage;
