// import { useState, useEffect, useMemo } from 'react';
// import { getOrders, getNoestTrackingInfo, updateMessageStatus, updateOrder } from '../services/api';
// import { Search, RefreshCw, Truck, MapPin, User, Calendar, X, History, Phone, Home, Eye } from 'lucide-react';
// import { useUI } from '../context/UIContext';
// import { useAppData } from '../context/AppDataContext';

// function NoestTrackingPage() {
//     const [orders, setOrders] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [filterText, setFilterText] = useState('');
//     const [selectedOrder, setSelectedOrder] = useState(null);
//     const { toast } = useUI();
//     const { wilayas } = useAppData();

//     useEffect(() => {
//         fetchNoestData();
//     }, [wilayas]);

//     const getCategoryFromEvent = (eventKey, eventLabel, isStopDesk) => {
//         const key = (eventKey || '').toLowerCase();
//         const label = (eventLabel || '').toLowerCase();

//         if (key.includes('livred') || key.includes('validation_reception_cash') || key.includes('verssement')) return 'Livré';
//         if (key.includes('return') || label.includes('retour')) return 'Retour';
//         if (key.includes('suspendu')) return 'Suspendu';
//         if (key === 'mise_a_jour' && label.includes('tentative')) return isStopDesk ? 'En Hub' : 'En Livraison';
//         if (key === 'fdr_activated' || key.includes('sent_to_redispatch') || label.includes('en livraison')) return 'En Livraison';
//         if (key === 'validation_reception') return isStopDesk ? 'En Hub' : 'En Livraison';
//         if (key === 'customer_validation') return 'Validé';
//         if (key === 'upload') return 'Uploadé';

//         return 'Autres';
//     };

//     const fetchNoestData = async () => {
//         setLoading(true);
//         try {
//             const sheetOrders = await getOrders();
//             // console.log("Sheet Orders fetched:", sheetOrders);

//             // Filter all orders that have a tracking number (ignoring 'System' state check)
//             const trackedOrders = sheetOrders.filter(o => o.tracking && String(o.tracking).trim().length > 5);
//             const trackingsToFetch = trackedOrders.map(o => o.tracking);

//             // console.log("Trackings to fetch from Noest:", trackingsToFetch.length);

//             if (trackingsToFetch.length === 0) {
//                 setOrders([]);
//                 setLoading(false);
//                 return;
//             }

//             const result = await getNoestTrackingInfo(trackingsToFetch);
//             // console.log("Noest results received:", Object.keys(result));

//             const parseCustomDate = (dateStr) => {
//                 if (!dateStr) return new Date(0);
//                 let cleanStr = dateStr;
//                 if (typeof dateStr === 'string' && dateStr.includes('.000000Z')) {
//                     cleanStr = dateStr.replace(' ', 'T').replace('.000000Z', 'Z');
//                 }
//                 const d = new Date(cleanStr);
//                 return !isNaN(d.getTime()) ? d : new Date(0);
//             };

//             const formatDate = (dateObj) => {
//                 if (!dateObj || isNaN(dateObj.getTime()) || dateObj.getTime() === 0) return '-';
//                 const pad = (n) => n.toString().padStart(2, '0');
//                 return `${pad(dateObj.getDate())}-${pad(dateObj.getMonth() + 1)}-${dateObj.getFullYear()} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
//             };

//             // Prepare list for synchronization
//             const updatesToSync = [];

//             const noestData = Object.values(result).map(item => {
//                 const info = item.OrderInfo || {};
//                 const activities = item.activity || [];
//                 const deliveryAttempts = item.deliveryAttempts || [];

//                 const sortedActivities = activities.map(act => ({
//                     ...act,
//                     parsedDate: parseCustomDate(act.date)
//                 })).sort((a, b) => b.parsedDate - a.parsedDate);

//                 const latest = sortedActivities[0] || {};
//                 const wilayaName = (wilayas || []).find(w => w.code == info.wilaya_id)?.nom || '';
//                 const isStopDesk = Number(info.stop_desk) === 1;

//                 const category = getCategoryFromEvent(latest.event_key, latest.event || info.current_status, isStopDesk);

//                 const localOrder = sheetOrders.find(o =>
//                     String(o.tracking).trim() === String(info.tracking).trim()
//                 );

//                 if (!localOrder) {
//                     console.warn("Orphaned tracking info:", info.tracking);
//                 }

//                 const remarque = localOrder?.remarque || info.remarque || '';
//                 const isMessageSent = localOrder ? (localOrder.isMessageSent === true) : false;
//                 const rowId = localOrder?.rowId;

//                 // Synchronization Logic: Check if state needs update
//                 if (localOrder && rowId && category && localOrder.state !== category) {
//                     // Avoid updating if state is already 'Livré' or 'Retour' in sheet to prevent overwrites if needed,
//                     // BUT user asked to sync, so we overwrite.
//                     updatesToSync.push({
//                         rowId: rowId,
//                         orderAtIndex: localOrder,
//                         newState: category
//                     });
//                 }

//                 return {
//                     tracking: info.tracking,
//                     reference: info.reference,
//                     client: info.client,
//                     phone: info.phone,
//                     wilaya_id: info.wilaya_id,
//                     wilaya_name: wilayaName,
//                     commune: info.commune,
//                     adresse: info.adresse,
//                     montant: info.montant,
//                     created_at: formatDate(parseCustomDate(info.created_at)),
//                     status: latest.event || info.current_status || 'En attente',
//                     category: category,
//                     status_class: latest['badge-class'],
//                     activities: sortedActivities.map(a => ({
//                         ...a,
//                         date: formatDate(a.parsedDate)
//                     })),
//                     deliveryAttempts: deliveryAttempts,
//                     driver_name: info.driver_name,
//                     driver_phone: info.driver_phone,
//                     produit: info.produit,
//                     remarque: remarque,
//                     is_stopdesk: isStopDesk,
//                     isMessageSent: isMessageSent,
//                     rowId: rowId,
//                     stationExpedition: localOrder?.stationExpedition
//                 };
//             });

//             setOrders(noestData);

//             // Execute Synchronization
//             if (updatesToSync.length > 0) {
//                 // console.log(`Synchronizing ${updatesToSync.length} orders...`);
//                 // Process updates in parallel
//                 try {
//                     const updatePromises = updatesToSync.map(update => {
//                         // Construct payload with updated state
//                         // Ensure we don't lose other fields, although updateOrder might be partial or full depending on backend.
//                         // Assuming full object update as in OrdersListPage
//                         const payload = { ...update.orderAtIndex, state: update.newState };
//                         return updateOrder(update.rowId, payload); // Using exported updateOrder from api.js
//                     });

//                     await Promise.all(updatePromises);
//                     toast.success(`${updatesToSync.length} commandes synchronisées avec succès !`);
//                 } catch (syncError) {
//                     console.error("Synchronization failed", syncError);
//                     toast.error("Erreur lors de la synchronisation des états.");
//                 }
//             } else {
//                 //console.log("No orders to synchronize.");
//             }

//         } catch (error) {
//             console.error("Failed to fetch Noest info", error);
//             toast.error("Erreur lors de la récupération des données");
//         } finally {
//             setLoading(false);
//         }
//     };



//     const handleMessageSent = async (order) => {
//         // console.log("handleMessageSent clicked for order:", order);

//         if (!order.rowId) {
//             console.error("Missing rowId for order", order);
//             toast.error("Impossible de mettre à jour : ID manquant (Commande introuvable dans le sheet)");
//             return;
//         }

//         try {
//             // Optimistic update
//             setOrders(prev => prev.map(o =>
//                 o.tracking === order.tracking ? { ...o, isMessageSent: true } : o
//             ));

//             await updateMessageStatus(order.rowId, 'OUI');
//             toast.success("Statut mis à jour !");
//         } catch (error) {
//             console.error("Failed to update message status", error);
//             toast.error("Erreur lors de la mise à jour");
//             // Revert on failure
//             setOrders(prev => prev.map(o =>
//                 o.tracking === order.tracking ? { ...o, isMessageSent: false } : o
//             ));
//         }
//     };

//     const [activeTab, setActiveTab] = useState('all');

//     const ORDERED_CATEGORIES = ['all', 'Uploadé', 'Validé', 'En Hub', 'En Livraison', 'Suspendu', 'Livré', 'Retour', 'Encaissé', 'Autres'];

//     const displayedOrders = useMemo(() => {
//         const filtered = (orders || []).filter(order => {
//             const text = String(filterText || "").toLowerCase();
//             return (
//                 String(order.reference || "").toLowerCase().includes(text) ||
//                 String(order.tracking || "").toLowerCase().includes(text) ||
//                 String(order.client || "").toLowerCase().includes(text) ||
//                 String(order.phone || "").toLowerCase().includes(text) ||
//                 String(order.wilaya_name || "").toLowerCase().includes(text)
//             );
//         });

//         if (activeTab === 'all') return filtered;
//         return filtered.filter(order => order.category === activeTab);
//     }, [orders, filterText, activeTab]);

//     const tabCounts = useMemo(() => {
//         return (orders || []).reduce((acc, order) => {
//             const cat = order.category || 'Autres';
//             acc[cat] = (acc[cat] || 0) + 1;
//             acc.all = (acc.all || 0) + 1;
//             return acc;
//         }, { all: 0 });
//     }, [orders]);

//     const visibleTabs = useMemo(() => {
//         return ORDERED_CATEGORIES
//             .filter(cat => tabCounts[cat] > 0 || cat === 'all')
//             .map(cat => ({
//                 id: cat,
//                 label: cat === 'all' ? 'Tous' : cat,
//                 count: tabCounts[cat] || 0
//             }));
//     }, [tabCounts]);

//     useEffect(() => {
//         if (activeTab !== 'all' && (tabCounts[activeTab] || 0) === 0 && !loading && (orders || []).length > 0) {
//             setActiveTab('all');
//         }
//     }, [tabCounts, activeTab, loading, (orders || []).length]);

//     const [numColumns, setNumColumns] = useState(4);

//     useEffect(() => {
//         const handleResize = () => {
//             const width = window.innerWidth;
//             if (width < 640) setNumColumns(1);
//             else if (width < 768) setNumColumns(2);
//             else if (width < 1024) setNumColumns(3);
//             else setNumColumns(4);
//         };

//         handleResize();
//         window.addEventListener('resize', handleResize);
//         return () => window.removeEventListener('resize', handleResize);
//     }, []);

//     const getDistributedOrders = () => {
//         if (!displayedOrders.length) return [];
//         const perColumn = Math.ceil(displayedOrders.length / numColumns);
//         return Array.from({ length: numColumns }, (_, i) => {
//             return displayedOrders.slice(i * perColumn, (i + 1) * perColumn);
//         });
//     };

//     const columnsData = getDistributedOrders();

//     return (
//         <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
//             <div className="px-4 py-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
//                 <div>
//                     <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
//                         <Truck className="w-5 h-5 text-green-600" />
//                         Suivi Noest Express
//                     </h2>
//                 </div>

//                 <div className="flex items-center gap-2">
//                     <button onClick={fetchNoestData} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Actualiser">
//                         <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
//                     </button>
//                     <div className="relative group">
//                         <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
//                         <input
//                             type="text"
//                             value={filterText}
//                             onChange={(e) => setFilterText(e.target.value)}
//                             placeholder="Recherche..."
//                             className="pl-9 pr-3 py-1.5 w-full md:w-64 bg-slate-50 border border-slate-200 rounded-md text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
//                         />
//                     </div>
//                 </div>
//             </div>

//             <div className="border-b border-slate-100 bg-slate-50/50">
//                 <div className="flex overflow-x-auto hide-scrollbar px-2 gap-1">
//                     {visibleTabs.map(tab => {
//                         const count = tabCounts[tab.id] || 0;
//                         const isActive = activeTab === tab.id;
//                         return (
//                             <button
//                                 key={tab.id}
//                                 onClick={() => setActiveTab(tab.id)}
//                                 className={`
//                                     whitespace-nowrap px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2
//                                     ${isActive
//                                         ? 'border-blue-500 text-blue-600 bg-blue-50/50'
//                                         : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
//                                     }
//                                 `}
//                             >
//                                 {tab.label}
//                                 <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
//                                     {count}
//                                 </span>
//                             </button>
//                         );
//                     })}
//                 </div>
//             </div>

//             <div className="flex-1 bg-slate-50/30 overflow-y-auto">
//                 {loading ? (
//                     <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
//                         <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//                         <span className="text-sm">Chargement...</span>
//                     </div>
//                 ) : displayedOrders.length === 0 ? (
//                     <div className="text-center py-10 text-slate-400 italic">Aucune commande dans cet onglet.</div>
//                 ) : (
//                     <>
//                         {/* Mobile Grid View */}
//                         <div className="md:hidden flex gap-2 items-start p-4 pb-20">
//                             {columnsData.map((colOrders, colIndex) => (
//                                 <div key={colIndex} className="flex-1 flex flex-col gap-2 min-w-0">
//                                     {colOrders.map((o) => (
//                                         <OrderCard key={o.tracking || o.reference} order={o} onMessageSent={handleMessageSent} />
//                                     ))}
//                                 </div>
//                             ))}
//                         </div>

//                         {/* Desktop Table View */}
//                         <div className="hidden md:block pb-20 bg-white">
//                             <table className="w-full text-left border-collapse">
//                                 <thead>
//                                     <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100">
//                                         <th className="px-6 py-3 font-bold text-center w-12">#</th>
//                                         <th className="px-4 py-3 font-bold">Référence</th>
//                                         <th className="px-4 py-3 font-bold">Tracking</th>
//                                         <th className="px-4 py-3 font-bold">Client</th>
//                                         <th className="px-4 py-3 font-bold">Localisation</th>
//                                         <th className="px-4 py-3 font-bold text-right">Montant</th>
//                                         <th className="px-4 py-3 font-bold text-center">Statut Noest</th>
//                                         <th className="px-4 py-3 font-bold text-center w-20">Msg</th>
//                                         <th className="px-4 py-3 font-bold text-center w-20">Action</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-slate-100">
//                                     {displayedOrders.map((order, idx) => (
//                                         <OrderTableRow
//                                             key={order.tracking || order.reference}
//                                             order={order}
//                                             index={idx}
//                                             onClick={() => setSelectedOrder(order)}
//                                         />
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </>
//                 )}
//             </div>

//             {/* Modal for Order Details */}
//             {selectedOrder && (
//                 <OrderDetailsModal
//                     order={selectedOrder}
//                     onClose={() => setSelectedOrder(null)}
//                     onMessageSent={handleMessageSent}
//                 />
//             )}
//         </section >
//     );
// }

// function OrderTableRow({ order, index, onClick }) {
//     const getStatusColor = (status, statusClass) => {
//         if (statusClass) {
//             if (statusClass.includes('success')) return 'text-green-700 bg-green-50 border-green-200';
//             if (statusClass.includes('danger')) return 'text-red-700 bg-red-50 border-red-200';
//             if (statusClass.includes('warning')) return 'text-orange-700 bg-orange-50 border-orange-200';
//             if (statusClass.includes('info') || statusClass.includes('primary')) return 'text-blue-700 bg-blue-50 border-blue-200';
//         }
//         const s = (status || '').toLowerCase();
//         if (s.includes('livré') || s.includes('delivered')) return 'text-green-700 bg-green-50 border-green-200';
//         if (s.includes('retour') || s.includes('returned') || s.includes('echoué')) return 'text-red-700 bg-red-50 border-red-200';
//         if (s.includes('cours') || s.includes('livraison')) return 'text-orange-700 bg-orange-50 border-orange-200';
//         return 'text-slate-700 bg-slate-100 border-slate-200';
//     };

//     const statusStyle = getStatusColor(order.status, order.status_class);

//     return (
//         <tr
//             className="group hover:bg-slate-50 transition-colors border-b border-slate-50"
//         >
//             <td className="px-4 py-2 text-center text-xs text-slate-400">
//                 {index + 1}
//             </td>
//             <td className="px-4 py-2">
//                 <div className="font-bold text-slate-800 text-xs">{order.reference}</div>
//                 <div className="text-[10px] text-slate-400 font-mono">{order.created_at}</div>
//             </td>
//             <td className="px-4 py-2">
//                 <div className="text-[10px] font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block">
//                     {order.tracking}
//                 </div>
//             </td>
//             <td className="px-4 py-2">
//                 <div className="text-xs font-bold text-slate-700 truncate max-w-[150px]" title={order.client}>{order.client}</div>
//                 <div className="text-[10px] text-slate-500 font-mono">{order.phone}</div>
//             </td>
//             <td className="px-4 py-2">
//                 <div className="text-[10px] text-slate-700">
//                     <span className="font-semibold">{order.wilaya_name}</span>
//                     <span className="text-slate-400 mx-1">/</span>
//                     <span>{order.commune}</span>
//                 </div>
//             </td>
//             <td className="px-4 py-2 text-right">
//                 <div className="text-xs font-bold text-slate-800">{order.montant} DA</div>
//             </td>
//             <td className="px-4 py-2 text-center">
//                 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm whitespace-nowrap ${statusStyle}`}>
//                     {order.status}
//                 </span>
//             </td>
//             <td className="px-4 py-2 text-center">
//                 <div className={`w-3 h-3 rounded-full mx-auto ${order.isMessageSent ? 'bg-green-500 ring-4 ring-green-100' : 'bg-blue-200'}`} title={order.isMessageSent ? "Message Envoyé" : "Message Non Envoyé"}></div>
//             </td>
//             <td className="px-4 py-2 text-center">
//                 <button
//                     onClick={(e) => {
//                         e.stopPropagation();
//                         onClick();
//                     }}
//                     className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
//                     title="Voir Détails"
//                 >
//                     <Eye className="w-4 h-4" />
//                 </button>
//             </td>
//         </tr>
//     );
// }

// function OrderDetailsModal({ order, onClose, onMessageSent }) {
//     const { toast } = useUI();

//     const handleCopyDriver = (e) => {
//         e.stopPropagation();
//         const text = `${order.driver_name || ''} ${order.driver_phone || ''}`.trim();
//         if (text) {
//             navigator.clipboard.writeText(text);
//             toast.success("Info livreur copiée !");
//         }
//     };

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
//             <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
//                 {/* Header */}
//                 <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//                     <div>
//                         <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
//                             <Truck className="w-5 h-5 text-blue-600" />
//                             Détails de la commande
//                         </h3>
//                         <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
//                             <span className="font-mono bg-white px-1.5 rounded border border-slate-200">Ref: {order.reference}</span>
//                             <span className="font-mono bg-white px-1.5 rounded border border-slate-200">Track: {order.tracking}</span>
//                             <span className="font-mono bg-blue-50 text-blue-700 px-1.5 rounded border border-blue-100 italic">Exp: {order.stationExpedition || '-'}</span>
//                         </div>
//                     </div>
//                     <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
//                         <X className="w-5 h-5" />
//                     </button>
//                 </div>

//                 <div className="p-6 flex flex-col md:flex-row gap-6 max-h-[70vh] overflow-y-auto">
//                     {/* Left Column */}
//                     <div className="flex-1 space-y-4">
//                         {/* Status & Price Cards */}
//                         <div className="grid grid-cols-2 gap-3">
//                             <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
//                                 <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Statut Actuel</div>
//                                 <div className="text-base font-bold text-slate-800 mt-0.5">{order.status}</div>
//                             </div>
//                             <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
//                                 <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Montant Total</div>
//                                 <div className="text-base font-bold text-emerald-700 mt-0.5">{order.montant} DA</div>
//                             </div>
//                         </div>

//                         {/* Customer Info */}
//                         <div className="space-y-3">
//                             <h4 className="text-xs font-bold text-slate-400 uppercase">Client</h4>
//                             <div className="bg-white p-3 rounded-xl border border-slate-200 text-sm space-y-2">
//                                 <div className="flex items-center gap-2">
//                                     <User className="w-4 h-4 text-slate-400" />
//                                     <span className="font-bold text-slate-700">{order.client}</span>
//                                 </div>
//                                 <div className="flex items-center gap-2">
//                                     <Phone className="w-4 h-4 text-slate-400" />
//                                     <span className="font-mono">{order.phone}</span>
//                                 </div>
//                                 <div className="flex items-start gap-2 pt-2 border-t border-slate-50">
//                                     <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
//                                     <div>
//                                         <div className="font-medium text-slate-700">{order.wilaya_name}, {order.commune}</div>
//                                         <div className="text-slate-500 text-xs">{order.adresse}</div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Driver Info */}
//                         <div>
//                             <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Livreur</h4>
//                             {(order.driver_name || order.driver_phone) ? (
//                                 <div
//                                     onClick={handleCopyDriver}
//                                     className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-indigo-800 cursor-pointer hover:bg-indigo-100 transition-colors"
//                                 >
//                                     <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center">
//                                         <Truck className="w-4 h-4 text-indigo-700" />
//                                     </div>
//                                     <div>
//                                         <div className="font-bold text-sm">{order.driver_name}</div>
//                                         <div className="font-mono text-xs">{order.driver_phone}</div>
//                                     </div>
//                                 </div>
//                             ) : (
//                                 <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
//                                     Pas de livreur assigné pour le moment.
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     {/* Right Column: Timeline */}
//                     <div className="flex-1">
//                         <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Historique de suivi</h4>
//                         <div className="relative pl-4 border-l-2 border-slate-100 space-y-6">
//                             {(order.activities || []).map((act, idx) => (
//                                 <div key={idx} className="relative">
//                                     <div className={`absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${idx === 0 ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-slate-300'}`}></div>
//                                     <div className="flex flex-col gap-1">
//                                         <div className="flex items-center justify-between">
//                                             <span className={`text-sm font-bold ${idx === 0 ? 'text-blue-700' : 'text-slate-700'}`}>{act.event}</span>
//                                         </div>
//                                         <span className="text-[10px] font-bold text-slate-400 font-mono">{act.date}</span>
//                                         {act.content && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-1 italic">"{act.content}"</p>}
//                                     </div>
//                                 </div>
//                             ))}
//                             {order.activities?.length === 0 && <div className="text-sm text-slate-400 italic">Aucune activité enregistrée</div>}
//                         </div>
//                     </div>
//                 </div>

//                 {/* Footer Actions */}
//                 <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
//                     <button
//                         onClick={onClose}
//                         className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors"
//                     >
//                         Fermer
//                     </button>
//                     {!order.isMessageSent ? (
//                         <button
//                             onClick={() => { onMessageSent(order); onClose(); }}
//                             className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-200 transition-all transform active:scale-95 flex items-center gap-2"
//                         >
//                             <Phone className="w-4 h-4" /> Envoyer SMS
//                         </button>
//                     ) : (
//                         <button
//                             disabled
//                             className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-bold flex items-center gap-2 cursor-default"
//                         >
//                             <div className="w-2 h-2 rounded-full bg-green-500"></div> Message Envoyé
//                         </button>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// }

// function OrderCard({ order, onMessageSent }) {
//     const [expanded, setExpanded] = useState(false);
//     const { toast } = useUI();

//     const handleCopyDriver = (e) => {
//         e.stopPropagation();
//         const text = `${order.driver_name || ''} ${order.driver_phone || ''}`.trim();
//         if (text) {
//             navigator.clipboard.writeText(text);
//             toast.success("Info livreur copiée !");
//         }
//     };

//     const getStatusColor = (status, statusClass) => {
//         if (statusClass) {
//             if (statusClass.includes('success')) return 'text-green-600 bg-green-50 border-green-100';
//             if (statusClass.includes('danger')) return 'text-red-600 bg-red-50 border-red-100';
//             if (statusClass.includes('warning')) return 'text-orange-600 bg-orange-50 border-orange-100';
//             if (statusClass.includes('info') || statusClass.includes('primary')) return 'text-blue-600 bg-blue-50 border-blue-100';
//         }
//         const s = (status || '').toLowerCase();
//         if (s.includes('livré') || s.includes('delivered')) return 'text-green-600 bg-green-50 border-green-100';
//         if (s.includes('retour') || s.includes('returned') || s.includes('echoué')) return 'text-red-600 bg-red-50 border-red-100';
//         if (s.includes('cours') || s.includes('livraison')) return 'text-orange-600 bg-orange-50 border-orange-100';
//         return 'text-slate-600 bg-slate-100 border-slate-200';
//     };

//     const statusStyle = getStatusColor(order.status, order.status_class);
//     // console.log(order);
//     return (
//         <div
//             className={`
//                 bg-white border border-slate-200 rounded-lg shadow-sm transition-all duration-300 overflow-hidden break-inside-avoid
//                 ${expanded ? 'ring-2 ring-blue-500 shadow-md' : 'hover:border-blue-300 hover:shadow'}
//             `}
//         >
//             <div
//                 className="p-3 flex flex-col gap-3 bg-white"
//             >
//                 {/* Ligne 1 : Reference - Client - Etat */}
//                 <div className="flex items-center justify-between gap-2 w-full">
//                     <div className="flex items-center gap-2 min-w-0">
//                         <div className={`w-2 h-2 rounded-full shrink-0 ${order.isMessageSent ? 'bg-green-500' : 'bg-blue-500'}`} title={order.isMessageSent ? "Message envoyé" : "Message non envoyé"}></div>
//                         <span className="font-bold text-slate-800 text-sm truncate" title={order.reference}>
//                             {order.reference || '-'}
//                         </span>
//                         <span className="text-slate-500 text-xs truncate max-w-[100px]" title={order.client}>
//                             {order.client || '-'}
//                         </span>
//                     </div>

//                     <div className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border ${statusStyle}`}>
//                         {order.status}
//                     </div>
//                 </div>

//                 {/* Ligne 2 : Produit - Téléphone */}
//                 <div className="flex items-start justify-between gap-2 w-full text-xs">
//                     <span className="text-slate-600 font-medium line-clamp-2 leading-tight flex-1" title={typeof order.produit === 'string' ? order.produit : ''}>
//                         {typeof order.produit === 'object' ? JSON.stringify(order.produit) : (order.produit || <span className="italic text-slate-400">Produit non spécifié</span>)}
//                     </span>
//                     <span className="text-slate-500 font-mono whitespace-nowrap shrink-0 bg-slate-100 px-1 rounded ml-1">
//                         {order.phone || '-'}
//                     </span>
//                 </div>
//                 {/* Action Row */}
//                 <div className="flex items-center justify-end pt-2 border-t border-slate-100 mt-1">
//                     <button
//                         onClick={(e) => {
//                             e.stopPropagation();
//                             setExpanded(!expanded);
//                         }}
//                         className={`
//                             flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all
//                             ${expanded
//                                 ? 'bg-slate-100 text-slate-600'
//                                 : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
//                             }
//                         `}
//                     >
//                         {expanded ? (
//                             <>
//                                 <X className="w-3.5 h-3.5" /> Fermer
//                             </>
//                         ) : (
//                             <>
//                                 <Eye className="w-3.5 h-3.5" /> Détails
//                             </>
//                         )}
//                     </button>
//                 </div>
//             </div>

//             {expanded && (
//                 <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-sm animate-in fade-in slide-in-from-top-1 duration-200 cursor-default" onClick={e => e.stopPropagation()}>
//                     <div className="mb-4 space-y-2">
//                         {/* Row 1: Tracking & Price */}
//                         <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
//                             <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded" title="Tracking">{order.tracking}</span>
//                             <span className="text-xs font-bold text-blue-600 whitespace-nowrap">{order.montant} DA</span>
//                         </div>


//                         {/* Address Info (MapPin) */}
//                         <div className="flex items-start gap-2 text-xs text-slate-600 px-1">
//                             <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400" />
//                             <div>
//                                 <div className="font-medium">{order.wilaya_name}</div>
//                                 <div className="text-slate-500 leading-tight">{order.commune}</div>
//                                 {order.remarque && (
//                                     <div className="text-slate-500 italic mt-1 text-[10px] bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100 dark:text-slate-500">
//                                         Note: {typeof order.remarque === 'object' ? JSON.stringify(order.remarque) : String(order.remarque || '')}
//                                     </div>
//                                 )}
//                             </div>
//                         </div>

//                         {/* Driver Info */}
//                         {(order.driver_name || order.driver_phone) && (
//                             <div
//                                 onClick={handleCopyDriver}
//                                 className="flex items-center gap-2 text-xs bg-blue-50/50 border border-blue-100 rounded p-2 text-blue-800 cursor-pointer hover:bg-blue-100 transition-colors"
//                                 title="Cliquer pour copier"
//                             >
//                                 <Truck className="w-3 h-3" />
//                                 <span>{order.driver_name} {order.driver_phone}</span>
//                             </div>
//                         )}
//                     </div>

//                     <div className="space-y-0 relative pl-2">
//                         <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200"></div>
//                         {(order.activities || []).map((act, idx) => (
//                             <div key={idx} className="relative pl-6 pb-6 last:pb-0 h-full">
//                                 <div className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${idx === 0 ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
//                                 <div className="flex flex-col gap-0.5">
//                                     <span className="text-[10px] font-bold text-slate-400 font-mono leading-none">{act.date}</span>
//                                     <span className={`text-xs font-bold leading-tight ${idx === 0 ? 'text-blue-700' : 'text-slate-700'}`}>{act.event}</span>
//                                     {act.content && <p className="text-[10px] text-slate-500 bg-white p-1.5 rounded border border-slate-100 mt-1 italic leading-tight">"{act.content}"</p>}
//                                 </div>
//                             </div>
//                         ))}
//                     </div>

//                     <div className="mt-4 flex flex-col gap-2">
//                         {!order.isMessageSent && (
//                             <button
//                                 type="button"
//                                 onClick={(e) => {
//                                     e.stopPropagation();
//                                     if (onMessageSent) onMessageSent(order);
//                                 }}
//                                 className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2"
//                             >
//                                 <Phone className="w-3 h-3" /> Envoyer Message
//                             </button>
//                         )}
//                         <button
//                             type="button"
//                             onClick={() => setExpanded(false)}
//                             className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-bold rounded transition-colors flex items-center justify-center gap-1"
//                         >
//                             <X className="w-3 h-3" /> Fermer
//                         </button>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

// export default NoestTrackingPage;


const s = {
    "N5J-35C-14456661": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456661",
            "reference": "207924",
            "client": "medani selalf",
            "phone": "0655524537",
            "phone_2": null,
            "adresse": "tesbsbt",
            "wilaya_id": 55,
            "commune": "Tebesbest",
            "montant": "5900.00",
            "remarque": "",
            "produit": "maissa vert clair 2",
            "driver_name": "YAGOUB Mohammed Yacine",
            "driver_phone": "0793807552",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T11:21:20.000000Z"
        },
        "recipientName": "medani selalf",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 55,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:20"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "55-Boudaoud Youcef",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 08:57:45"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "55-Boudaoud Youcef",
                "name": "",
                "driver": "YAGOUB Mohammed Yacine",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 10:36:16"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Touggourt",
                "name": "",
                "driver": "YAGOUB Mohammed Yacine",
                "content": "Client ne répond pas",
                "fdr": "",
                "date": "2026-02-09 14:37:21"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Touggourt",
                "name": "",
                "driver": "YAGOUB Mohammed Yacine",
                "content": "Client ne répond pas",
                "fdr": "",
                "date": "2026-02-10 14:23:51"
            },
            {
                "event_key": "sent_to_redispatch",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "55-Boudaoud Youcef",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 08:49:34"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "55-Boudaoud Youcef",
                "name": "",
                "driver": "YAGOUB Mohammed Yacine",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 09:59:52"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Touggourt",
                "name": "",
                "driver": "YAGOUB Mohammed Yacine",
                "content": "Client ne répond pas",
                "fdr": "",
                "date": "2026-02-12 14:14:38"
            },
            {
                "event_key": "sent_to_redispatch",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "55-Radia BOUDAOUD",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-12 16:40:47"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "55-Boudaoud Youcef",
                "name": "",
                "driver": "YAGOUB Mohammed Yacine",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 21:26:04"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "YAGOUB Mohammed Yacine",
                "content": "Client ne répond pas",
                "created_at": "2026-02-12 14:14:38"
            },
            {
                "causer": "HUB",
                "driver": "YAGOUB Mohammed Yacine",
                "content": "Client ne répond pas",
                "created_at": "2026-02-10 14:23:51"
            },
            {
                "causer": "HUB",
                "driver": "YAGOUB Mohammed Yacine",
                "content": "Client ne répond pas",
                "created_at": "2026-02-09 14:37:21"
            }
        ]
    },
    "N5J-35C-14456689": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456689",
            "reference": "207931",
            "client": "ben abde slam fatma",
            "phone": "0666638231",
            "phone_2": null,
            "adresse": "In Salah",
            "wilaya_id": 53,
            "commune": "Ain Salah",
            "montant": "9750.00",
            "remarque": "",
            "produit": "amina rose bebe 40 + amina mauve clair + amina noir 3838",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T11:21:32.000000Z"
        },
        "recipientName": "ben abde slam fatma",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 53,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:32"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "53-Slimane DJOUALIL",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-12 09:01:22"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Bousbaa Amina",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-12 11:09:16"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client contacté",
                "created_at": "2026-02-12 11:09:16"
            }
        ]
    },
    "N5J-35C-14456692": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456692",
            "reference": "207932",
            "client": "bouhani fatima",
            "phone": "0558107479",
            "phone_2": null,
            "adresse": "Gambita",
            "wilaya_id": 31,
            "commune": "Oran",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina noir 1",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T11:21:32.000000Z"
        },
        "recipientName": "bouhani fatima",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 31,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:32"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "31C - ADDA ABBOU MOHAMED",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 13:29:41"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Mechche Safia",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-08 15:50:33"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Mechche Safia",
                "name": "",
                "driver": "",
                "content": "Client injoignable",
                "fdr": "",
                "date": "2026-02-10 15:41:51"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Mechche Safia",
                "name": "",
                "driver": "",
                "content": "fin d'appel",
                "fdr": "",
                "date": "2026-02-11 12:20:45"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Mechche Safia",
                "name": "",
                "driver": "",
                "content": "sus",
                "fdr": "",
                "date": "2026-02-12 12:11:06"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "sus",
                "created_at": "2026-02-12 12:11:06"
            },
            {
                "causer": "HUB",
                "driver": "",
                "content": "fin d'appel",
                "created_at": "2026-02-11 12:20:45"
            },
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client injoignable",
                "created_at": "2026-02-10 15:41:51"
            },
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client contacté",
                "created_at": "2026-02-08 15:50:33"
            }
        ]
    },
    "N5J-35C-14456697": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456697",
            "reference": "207925",
            "client": "elk",
            "phone": "0665969374",
            "phone_2": null,
            "adresse": "cite universitaire ouled fayet 3",
            "wilaya_id": 16,
            "commune": "Ouled Fayet",
            "montant": "3500.00",
            "remarque": "",
            "produit": "amina noir 42",
            "driver_name": "Fateh belkacemi",
            "driver_phone": "0560775051",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T11:21:32.000000Z"
        },
        "recipientName": "elk",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:32"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16F- Amine Kaidi",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 08:17:20"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16F- Ouameur Akli",
                "name": "",
                "driver": "Fateh belkacemi",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 13:59:37"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Baba Hassen",
                "name": "",
                "driver": "Fateh belkacemi",
                "content": "Refusé (sans motif)",
                "fdr": "",
                "date": "2026-02-08 14:12:08"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Cliznt ne refuse pas , reportat la livraison mardi inchlh",
                "fdr": "",
                "date": "2026-02-09 00:19:02"
            },
            {
                "event_key": "colis_suspendu",
                "event": "Suspendu",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16F- Ouameur Akli",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 09:43:10"
            },
            {
                "event_key": "return_asked_by_hub",
                "event": "Retour En transit",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16F- Ouameur Akli",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 12:01:22"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "Customer",
                "driver": "",
                "content": "Cliznt ne refuse pas , reportat la livraison mardi inchlh",
                "created_at": "2026-02-09 00:19:02"
            },
            {
                "causer": "HUB",
                "driver": "Fateh belkacemi",
                "content": "Refusé (sans motif)",
                "created_at": "2026-02-08 14:12:08"
            }
        ]
    },
    "N5J-35C-14478912": {
        "OrderInfo": {
            "tracking": "N5J-35C-14478912",
            "reference": "207934",
            "client": "mounira gessoum",
            "phone": "0666351998",
            "phone_2": null,
            "adresse": "El Oued",
            "wilaya_id": 39,
            "commune": "El Oued",
            "montant": "3400.00",
            "remarque": "livraison rapide",
            "produit": "amina grenat 36",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T19:27:40.000000Z"
        },
        "recipientName": "mounira gessoum",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 39,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 20:27:40"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-08 13:04:01"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "39-MERABET BOUDJEMA",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 16:32:14"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Nacer asma",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-10 09:00:57"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "39-MERABET BOUDJEMA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 11:18:14"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client contacté",
                "created_at": "2026-02-10 09:00:57"
            }
        ]
    },
    "N5J-35C-14480909": {
        "OrderInfo": {
            "tracking": "N5J-35C-14480909",
            "reference": "207988",
            "client": "fadia remide",
            "phone": "0794474737",
            "phone_2": null,
            "adresse": "Blida",
            "wilaya_id": 9,
            "commune": "Blida",
            "montant": "3200.00",
            "remarque": "",
            "produit": "amina vert clair 44",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T20:06:09.000000Z"
        },
        "recipientName": "fadia remide",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 9,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 21:06:09"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-08 13:04:01"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "abdelmalk belahmar",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 07:42:30"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "benaziz manel",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-09 10:53:22"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "benaziz manel",
                "name": "",
                "driver": "",
                "content": "Client demande de reporter la livraison",
                "fdr": "",
                "date": "2026-02-11 12:49:07"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "benaziz manel",
                "name": "",
                "driver": "",
                "content": "Client ne répond pas",
                "fdr": "",
                "date": "2026-02-12 13:59:30"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "09A-Hassina labsi",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 14:27:33"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client ne répond pas",
                "created_at": "2026-02-12 13:59:30"
            },
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client demande de reporter la livraison",
                "created_at": "2026-02-11 12:49:07"
            },
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client contacté",
                "created_at": "2026-02-09 10:53:22"
            }
        ]
    },
    "N5J-35C-14481464": {
        "OrderInfo": {
            "tracking": "N5J-35C-14481464",
            "reference": "207989",
            "client": "maria safa lebir",
            "phone": "0654261277",
            "phone_2": "null",
            "adresse": "Adrar",
            "wilaya_id": 1,
            "commune": "Adrar",
            "montant": "6500.00",
            "remarque": "livr men 14 fevr jusqua 19 fevr",
            "produit": "amina vert clair M + amina mauve clair L",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T20:23:42.000000Z"
        },
        "recipientName": "maria safa lebir",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 1,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 21:23:42"
            },
            {
                "event_key": "edited_informations",
                "event": "Informations modifiées",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 10:45:29"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-08 13:04:01"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "01-Youcef Maikhaf",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-12 10:46:49"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Boutraa racha",
                "name": "",
                "driver": "",
                "content": "Client ne répond pas",
                "fdr": "",
                "date": "2026-02-12 15:59:57"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client ne répond pas",
                "created_at": "2026-02-12 15:59:57"
            }
        ]
    },
    "N5J-35C-14515012": {
        "OrderInfo": {
            "tracking": "N5J-35C-14515012",
            "reference": "207946",
            "client": "nour el houda",
            "phone": "0540823718",
            "phone_2": null,
            "adresse": "hey 3216 maskan chaabia ouled chebl",
            "wilaya_id": 16,
            "commune": "Birtouta",
            "montant": "3500.00",
            "remarque": "livraison liom lundi",
            "produit": "amina grenat 36",
            "driver_name": "Ben Slimane Amine",
            "driver_phone": "0555279053",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-09T09:46:34.000000Z"
        },
        "recipientName": "nour el houda",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 10:46:34"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 12:55:18"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16G-ALI CHOUIHA",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-10 07:57:31"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16G-Karima  Lachachi",
                "name": "",
                "driver": "Ben Slimane Amine",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 09:51:28"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Baraki",
                "name": "",
                "driver": "Ben Slimane Amine",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-10 15:51:01"
            },
            {
                "event_key": "sent_to_redispatch",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16G-ALI CHOUIHA",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 09:07:26"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16G-Karima  Lachachi",
                "name": "",
                "driver": "Ben Slimane Amine",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 09:50:10"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Baraki",
                "name": "",
                "driver": "Ben Slimane Amine",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-11 14:31:12"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Ben Slimane Amine",
                "name": "",
                "driver": "Ben Slimane Amine",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 18:58:35"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "Ben Slimane Amine",
                "content": "Client contacté",
                "created_at": "2026-02-11 14:31:12"
            },
            {
                "causer": "HUB",
                "driver": "Ben Slimane Amine",
                "content": "Client contacté",
                "created_at": "2026-02-10 15:51:01"
            }
        ]
    },
    "N5J-35C-14519926": {
        "OrderInfo": {
            "tracking": "N5J-35C-14519926",
            "reference": "207950",
            "client": "selhaoui youssra",
            "phone": "0675995733",
            "phone_2": null,
            "adresse": "ksabi",
            "wilaya_id": 52,
            "commune": "Ksabi",
            "montant": "7000.00",
            "remarque": "",
            "produit": "amina moutarde 36/38 + amina bleu ciel xxl",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-09T11:55:29.000000Z"
        },
        "recipientName": "selhaoui youssra",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 52,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:55:29"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 13:39:03"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14519928": {
        "OrderInfo": {
            "tracking": "N5J-35C-14519928",
            "reference": "207953",
            "client": "soulimani imane",
            "phone": "0699585727",
            "phone_2": null,
            "adresse": "Adrar",
            "wilaya_id": 1,
            "commune": "Adrar",
            "montant": "3600.00",
            "remarque": "",
            "produit": "amina bleu ciel 2",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-09T11:55:29.000000Z"
        },
        "recipientName": "soulimani imane",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 1,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:55:29"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 13:39:07"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "01-Youcef Maikhaf",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-12 10:47:02"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Boutraa racha",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-12 15:58:58"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "01-Youcef Maikhaf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 16:03:33"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client contacté",
                "created_at": "2026-02-12 15:58:58"
            }
        ]
    },
    "N5J-35C-14519929": {
        "OrderInfo": {
            "tracking": "N5J-35C-14519929",
            "reference": "207937",
            "client": "nouha",
            "phone": "0657971428",
            "phone_2": null,
            "adresse": "ouenza",
            "wilaya_id": 12,
            "commune": "Ouenza",
            "montant": "3800.00",
            "remarque": "",
            "produit": "amina vert bouteille 40",
            "driver_name": "Gouassmia Zohir",
            "driver_phone": "0560639749",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-09T11:55:29.000000Z"
        },
        "recipientName": "nouha",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 12,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:55:29"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 13:39:07"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "12-Hazem SAOUANE",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 11:13:46"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "12-Hazem SAOUANE",
                "name": "",
                "driver": "Gouassmia Zohir",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 11:39:45"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Tebessa",
                "name": "",
                "driver": "Gouassmia Zohir",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-11 17:41:22"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Gouassmia Zohir",
                "name": "",
                "driver": "Gouassmia Zohir",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:51:57"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "Gouassmia Zohir",
                "content": "Client contacté",
                "created_at": "2026-02-11 17:41:22"
            }
        ]
    },
    "N5J-35C-14519930": {
        "OrderInfo": {
            "tracking": "N5J-35C-14519930",
            "reference": "207939",
            "client": "chaima saim",
            "phone": "0673205942",
            "phone_2": null,
            "adresse": "Saïda",
            "wilaya_id": 20,
            "commune": "Saida",
            "montant": "6200.00",
            "remarque": "",
            "produit": "amina vert clair 40 + amina bordeaux 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-09T11:55:31.000000Z"
        },
        "recipientName": "chaima saim",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 20,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:55:31"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 13:39:03"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "20-Mimoun SEDIRI",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 12:43:21"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Chelihi imane",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-11 15:53:23"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "DIS 20- BENNEDJADI NESRINE",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 10:14:51"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client contacté",
                "created_at": "2026-02-11 15:53:23"
            }
        ]
    },
    "N5J-35C-14519932": {
        "OrderInfo": {
            "tracking": "N5J-35C-14519932",
            "reference": "207936",
            "client": "rouabhia rahma",
            "phone": "0663076247",
            "phone_2": null,
            "adresse": "khmisti",
            "wilaya_id": 42,
            "commune": "Khemisti",
            "montant": "3500.00",
            "remarque": "",
            "produit": "amina bordeaux xl",
            "driver_name": "Yous abdelkader",
            "driver_phone": "0553988086",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-09T11:55:31.000000Z"
        },
        "recipientName": "rouabhia rahma",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 42,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:55:31"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 13:39:03"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "42B-Bouhmidi Djawed",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 08:06:52"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "42B-Bouhmidi Djawed",
                "name": "",
                "driver": "Yous abdelkader",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 10:45:53"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Yous abdelkader",
                "name": "",
                "driver": "Yous abdelkader",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 18:53:05"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14519933": {
        "OrderInfo": {
            "tracking": "N5J-35C-14519933",
            "reference": "207944",
            "client": "zoud asia",
            "phone": "0776947836",
            "phone_2": null,
            "adresse": "Mostaganem",
            "wilaya_id": 27,
            "commune": "Mostaganem",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina bleu ciel 2",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-09T11:55:31.000000Z"
        },
        "recipientName": "zoud asia",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 27,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:55:31"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 13:39:03"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "27-SOUIDI MOHAMED",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 09:59:39"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "ghrib Sara",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-11 12:54:09"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "ghrib Sara",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-12 10:19:18"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "27-SOUIDI MOHAMED",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 15:06:25"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client contacté",
                "created_at": "2026-02-12 10:19:18"
            },
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client contacté",
                "created_at": "2026-02-11 12:54:09"
            }
        ]
    },
    "N5J-35C-14519934": {
        "OrderInfo": {
            "tracking": "N5J-35C-14519934",
            "reference": "207949",
            "client": "its_mima",
            "phone": "0668221662",
            "phone_2": null,
            "adresse": "collo",
            "wilaya_id": 21,
            "commune": "Collo",
            "montant": "3700.00",
            "remarque": "",
            "produit": "amina bleu ciel 36",
            "driver_name": "Djaber  Abdellah",
            "driver_phone": "0662264455",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-09T11:55:31.000000Z"
        },
        "recipientName": "its_mima",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 21,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:55:31"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 13:39:03"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "21- Malek boukikaz",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 10:14:08"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "21- Malek boukikaz",
                "name": "",
                "driver": "Djaber  Abdellah",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 11:09:21"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Skikda",
                "name": "",
                "driver": "Djaber  Abdellah",
                "content": "Client ne répond pas",
                "fdr": "",
                "date": "2026-02-11 14:08:59"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Skikda",
                "name": "",
                "driver": "Djaber  Abdellah",
                "content": "Client injoignable",
                "fdr": "",
                "date": "2026-02-11 16:29:20"
            },
            {
                "event_key": "sent_to_redispatch",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "21- Malek boukikaz",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-12 08:42:37"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "21- Malek boukikaz",
                "name": "",
                "driver": "Djaber  Abdellah",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 11:13:59"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Skikda",
                "name": "",
                "driver": "Djaber  Abdellah",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-12 13:52:18"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Djaber  Abdellah",
                "name": "",
                "driver": "Djaber  Abdellah",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 17:15:01"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "Djaber  Abdellah",
                "content": "Client contacté",
                "created_at": "2026-02-12 13:52:18"
            },
            {
                "causer": "HUB",
                "driver": "Djaber  Abdellah",
                "content": "Client injoignable",
                "created_at": "2026-02-11 16:29:20"
            },
            {
                "causer": "HUB",
                "driver": "Djaber  Abdellah",
                "content": "Client ne répond pas",
                "created_at": "2026-02-11 14:08:59"
            }
        ]
    },
    "N5J-35C-14519935": {
        "OrderInfo": {
            "tracking": "N5J-35C-14519935",
            "reference": "207938",
            "client": "ghouchi oumeima",
            "phone": "0667671770",
            "phone_2": null,
            "adresse": "zelfana",
            "wilaya_id": 47,
            "commune": "Zelfana",
            "montant": "3900.00",
            "remarque": "",
            "produit": "amina beige 38",
            "driver_name": "Zelfana",
            "driver_phone": "0665449369",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-09T11:55:31.000000Z"
        },
        "recipientName": "ghouchi oumeima",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 47,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:55:31"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 13:39:03"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "47- azeddine malaoui",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 13:04:30"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "47- azeddine malaoui",
                "name": "",
                "driver": "Zelfana",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 15:13:17"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Zelfana",
                "name": "",
                "driver": "Zelfana",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 20:30:21"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14519937": {
        "OrderInfo": {
            "tracking": "N5J-35C-14519937",
            "reference": "207945",
            "client": "fatima ghorma",
            "phone": "0673450804",
            "phone_2": null,
            "adresse": "Tamanrasset",
            "wilaya_id": 11,
            "commune": "Tamanghasset",
            "montant": "11600.00",
            "remarque": "livraison rapide",
            "produit": "maissa grenat 38/ 174 + sabrine jean  38 / 174",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-09T11:55:31.000000Z"
        },
        "recipientName": "fatima ghorma",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 11,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:55:31"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 13:39:03"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14519938": {
        "OrderInfo": {
            "tracking": "N5J-35C-14519938",
            "reference": "207957",
            "client": "djelloul belkacem",
            "phone": "0668989870",
            "phone_2": null,
            "adresse": "In Salah",
            "wilaya_id": 53,
            "commune": "Ain Salah",
            "montant": "8750.00",
            "remarque": "",
            "produit": "maissa vert clair 40 + disney moutarde 40",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-09T11:55:31.000000Z"
        },
        "recipientName": "djelloul belkacem",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 53,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:55:31"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 13:39:03"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "53-Slimane DJOUALIL",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-12 09:28:04"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Bousbaa Amina",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-12 11:07:59"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client contacté",
                "created_at": "2026-02-12 11:07:59"
            }
        ]
    },
    "N5J-35C-14544574": {
        "OrderInfo": {
            "tracking": "N5J-35C-14544574",
            "reference": "207958",
            "client": "riham",
            "phone": "0554282708",
            "phone_2": null,
            "adresse": "draria",
            "wilaya_id": 16,
            "commune": "Draria",
            "montant": "3500.00",
            "remarque": "",
            "produit": "amina noir 38",
            "driver_name": "Zeroual mohamed",
            "driver_phone": "0542856862",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-10T10:58:49.000000Z"
        },
        "recipientName": "riham",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 11:58:49"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-10 13:18:30"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16F- Amine Kaidi",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 08:42:28"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16F- Ould Imam Imen",
                "name": "",
                "driver": "Zeroual mohamed",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 10:02:18"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Baba Hassen",
                "name": "",
                "driver": "Zeroual mohamed",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-11 10:26:36"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Zeroual mohamed",
                "name": "",
                "driver": "Zeroual mohamed",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 12:13:31"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "Zeroual mohamed",
                "content": "Client contacté",
                "created_at": "2026-02-11 10:26:36"
            }
        ]
    },
    "N5J-35C-14544585": {
        "OrderInfo": {
            "tracking": "N5J-35C-14544585",
            "reference": "207970",
            "client": "its_riker",
            "phone": "0781504005",
            "phone_2": null,
            "adresse": "Sétif",
            "wilaya_id": 19,
            "commune": "Setif",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina noir 1",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-10T10:59:04.000000Z"
        },
        "recipientName": "its_riker",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 19,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 11:59:04"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-10 13:18:30"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14544589": {
        "OrderInfo": {
            "tracking": "N5J-35C-14544589",
            "reference": "207959",
            "client": "malak filali",
            "phone": "0784510797",
            "phone_2": null,
            "adresse": "ain ben sbaa",
            "wilaya_id": 25,
            "commune": "Hamma Bouziane",
            "montant": "3700.00",
            "remarque": "",
            "produit": "disney gris 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-10T10:59:04.000000Z"
        },
        "recipientName": "malak filali",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 25,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 11:59:04"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-10 13:18:30"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14544590": {
        "OrderInfo": {
            "tracking": "N5J-35C-14544590",
            "reference": "207971",
            "client": "amani bousbia",
            "phone": "0559208262",
            "phone_2": null,
            "adresse": "Skikda",
            "wilaya_id": 21,
            "commune": "Skikda",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina bleu ciel 1",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-10T10:59:05.000000Z"
        },
        "recipientName": "amani bousbia",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 21,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 11:59:05"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-10 13:18:30"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "21- Malek boukikaz",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 10:14:10"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Mouhab serine",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-11 13:11:39"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "21A- Rania Daoud",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:40:23"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client contacté",
                "created_at": "2026-02-11 13:11:39"
            }
        ]
    },
    "N5J-35C-14544591": {
        "OrderInfo": {
            "tracking": "N5J-35C-14544591",
            "reference": "207975",
            "client": "meriem bouzrbia",
            "phone": "0675421473",
            "phone_2": null,
            "adresse": "ain berda",
            "wilaya_id": 23,
            "commune": "Ain Berda",
            "montant": "3700.00",
            "remarque": "",
            "produit": "amina marron 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-10T10:59:06.000000Z"
        },
        "recipientName": "meriem bouzrbia",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 23,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 11:59:06"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-10 13:18:30"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14544594": {
        "OrderInfo": {
            "tracking": "N5J-35C-14544594",
            "reference": "207980",
            "client": "samia mihoubi",
            "phone": "0789841450",
            "phone_2": null,
            "adresse": "Bordj Bou Arreridj",
            "wilaya_id": 34,
            "commune": "Bordj Bou Arreridj",
            "montant": "3700.00",
            "remarque": "",
            "produit": "amina vert clair 44",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-10T10:59:06.000000Z"
        },
        "recipientName": "samia mihoubi",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 34,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 11:59:06"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-10 13:18:30"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "SUP 34A- MEHARGA ALLAEDDDINE",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 09:07:18"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Belkebir Nessrine",
                "name": "",
                "driver": "",
                "content": "Client injoignable",
                "fdr": "",
                "date": "2026-02-11 11:44:53"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Belkebir Nessrine",
                "name": "",
                "driver": "",
                "content": "Client injoignable",
                "fdr": "",
                "date": "2026-02-12 10:44:12"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Colis a domicile \nدائرة منصورة في باطيمات عيشاوي",
                "fdr": "",
                "date": "2026-02-12 12:48:25"
            },
            {
                "event_key": "edited_informations",
                "event": "Informations modifiées",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "SUP 34A- MEHARGA ALLAEDDDINE",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 17:33:25"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "Customer",
                "driver": "",
                "content": "Colis a domicile \nدائرة منصورة في باطيمات عيشاوي",
                "created_at": "2026-02-12 12:48:25"
            },
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client injoignable",
                "created_at": "2026-02-12 10:44:12"
            },
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client injoignable",
                "created_at": "2026-02-11 11:44:53"
            }
        ]
    },
    "N5J-35C-14544595": {
        "OrderInfo": {
            "tracking": "N5J-35C-14544595",
            "reference": "207973",
            "client": "ouafa ben hamza",
            "phone": "0665714638",
            "phone_2": null,
            "adresse": "Ouargla",
            "wilaya_id": 30,
            "commune": "Ouargla",
            "montant": "3400.00",
            "remarque": "",
            "produit": "amina bleu ciel 38/173",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-10T10:59:06.000000Z"
        },
        "recipientName": "ouafa ben hamza",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 30,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 11:59:06"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-10 13:18:30"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "30- ABD EL KADER DJOUHRI",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-12 09:22:59"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "boussa lilya",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-12 11:55:28"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client contacté",
                "created_at": "2026-02-12 11:55:28"
            }
        ]
    },
    "N5J-35C-14544599": {
        "OrderInfo": {
            "tracking": "N5J-35C-14544599",
            "reference": "207961",
            "client": "lassoug lyna",
            "phone": "0667268881",
            "phone_2": null,
            "adresse": "bab el oued",
            "wilaya_id": 16,
            "commune": "Bab El Oued",
            "montant": "3500.00",
            "remarque": "",
            "produit": "amina bleu ciel 38",
            "driver_name": "Djelfi sid Ali M",
            "driver_phone": "0560169968",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-10T10:59:06.000000Z"
        },
        "recipientName": "lassoug lyna",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 11:59:06"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-10 13:18:30"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16E-Issam Diab",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 07:13:49"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16E-Issam Diab",
                "name": "",
                "driver": "Djelfi sid Ali M",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 09:16:42"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Alger centre",
                "name": "",
                "driver": "Djelfi sid Ali M",
                "content": "Client ne répond pas",
                "fdr": "",
                "date": "2026-02-11 09:49:50"
            },
            {
                "event_key": "sent_to_redispatch",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16E-Feriel Oukherfellah",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-12 08:15:48"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16E-Feriel Oukherfellah",
                "name": "",
                "driver": "Djelfi sid Ali M",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 09:09:19"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Alger centre",
                "name": "",
                "driver": "Djelfi sid Ali M",
                "content": "Client absent",
                "fdr": "",
                "date": "2026-02-12 09:46:34"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "Djelfi sid Ali M",
                "content": "Client absent",
                "created_at": "2026-02-12 09:46:34"
            },
            {
                "causer": "HUB",
                "driver": "Djelfi sid Ali M",
                "content": "Client ne répond pas",
                "created_at": "2026-02-11 09:49:50"
            }
        ]
    },
    "N5J-35C-14544604": {
        "OrderInfo": {
            "tracking": "N5J-35C-14544604",
            "reference": "207972",
            "client": "genfod ilham",
            "phone": "0549752813",
            "phone_2": null,
            "adresse": "setif ville",
            "wilaya_id": 19,
            "commune": "Setif",
            "montant": "3700.00",
            "remarque": "livr max mardi",
            "produit": "amina noir 38",
            "driver_name": "Yakoub Meftah",
            "driver_phone": "0794440054",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-10T10:59:06.000000Z"
        },
        "recipientName": "genfod ilham",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 19,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 11:59:06"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-10 13:18:30"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "19A- SAID HARBOUCHE",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 09:15:26"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "19A- SAID HARBOUCHE",
                "name": "",
                "driver": "Yakoub Meftah",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 11:46:31"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Setif",
                "name": "",
                "driver": "Yakoub Meftah",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-11 12:11:43"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Yakoub Meftah",
                "name": "",
                "driver": "Yakoub Meftah",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 12:27:46"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "Yakoub Meftah",
                "content": "Client contacté",
                "created_at": "2026-02-11 12:11:43"
            }
        ]
    },
    "N5J-35C-14544608": {
        "OrderInfo": {
            "tracking": "N5J-35C-14544608",
            "reference": "207966",
            "client": "ismahane",
            "phone": "0672951308",
            "phone_2": null,
            "adresse": "Annaba",
            "wilaya_id": 23,
            "commune": "Annaba",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina grey38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-10T10:59:06.000000Z"
        },
        "recipientName": "ismahane",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 23,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 11:59:06"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-10 13:18:30"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "23A- Celia Ait Djebbara",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 10:55:06"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Taftist Nessrine",
                "name": "",
                "driver": "",
                "content": "linge occupé",
                "fdr": "",
                "date": "2026-02-11 14:57:42"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Taftist Nessrine",
                "name": "",
                "driver": "",
                "content": "linge occupé",
                "fdr": "",
                "date": "2026-02-12 15:35:29"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "linge occupé",
                "created_at": "2026-02-12 15:35:29"
            },
            {
                "causer": "HUB",
                "driver": "",
                "content": "linge occupé",
                "created_at": "2026-02-11 14:57:42"
            }
        ]
    },
    "N5J-35C-14552235": {
        "OrderInfo": {
            "tracking": "N5J-35C-14552235",
            "reference": "208060",
            "client": "soulef bouaoud",
            "phone": "0664219639",
            "phone_2": null,
            "adresse": "Sétif",
            "wilaya_id": 19,
            "commune": "Setif",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina noir 1",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-10T14:01:37.000000Z"
        },
        "recipientName": "soulef bouaoud",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 19,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:01:37"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-10 15:41:01"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "19A- SAID HARBOUCHE",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 09:19:32"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Boubabouri Linda",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-11 12:22:35"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "19A-Kheloufi Houdaifa",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:18:18"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client contacté",
                "created_at": "2026-02-11 12:22:35"
            }
        ]
    },
    "N5J-35C-14552236": {
        "OrderInfo": {
            "tracking": "N5J-35C-14552236",
            "reference": "208010",
            "client": "soltan rawnek",
            "phone": "0670484475",
            "phone_2": null,
            "adresse": "Biskra",
            "wilaya_id": 7,
            "commune": "Biskra",
            "montant": "3400.00",
            "remarque": "",
            "produit": "amina noir 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-10T14:01:37.000000Z"
        },
        "recipientName": "soltan rawnek",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 7,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:01:37"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-10 15:41:01"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "07-Rabeh MARZOUG",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-11 10:00:26"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "07-Merzoug Zine Elabidine",
                "name": "",
                "driver": "",
                "content": "Client ne répond pas",
                "fdr": "",
                "date": "2026-02-11 10:21:53"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "07-Haddi Aymen Sabri",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-12 12:12:03"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "07-Rahal Dounia",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:30:01"
            }
        ],
        "deliveryAttempts": [
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client contacté",
                "created_at": "2026-02-12 12:12:03"
            },
            {
                "causer": "HUB",
                "driver": "",
                "content": "Client ne répond pas",
                "created_at": "2026-02-11 10:21:53"
            }
        ]
    },
    "N5J-35C-14585263": {
        "OrderInfo": {
            "tracking": "N5J-35C-14585263",
            "reference": "208011",
            "client": "dimli khir edin",
            "phone": "0557007782",
            "phone_2": "0",
            "adresse": "berhoum",
            "wilaya_id": 28,
            "commune": "Berhoum",
            "montant": "5250.00",
            "remarque": "35",
            "produit": "maissa vert clair 3 / 172",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "dimli khir edin",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 28,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585229": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585229",
            "reference": "207960",
            "client": "lilia sasa ",
            "phone": "0797394003",
            "phone_2": "0",
            "adresse": "khemis elkhechna",
            "wilaya_id": 35,
            "commune": "Khemis El Khechna",
            "montant": "3400.00",
            "remarque": "1",
            "produit": "amina vert bouteille 1",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "lilia sasa ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 35,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585230": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585230",
            "reference": "207962",
            "client": "chorfi norhane ",
            "phone": "0782661057",
            "phone_2": "0",
            "adresse": "Chlef",
            "wilaya_id": 2,
            "commune": "Chlef",
            "montant": "3250.00",
            "remarque": "2",
            "produit": "amina grenat 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "chorfi norhane ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 2,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585231": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585231",
            "reference": "207964",
            "client": "mous manel ",
            "phone": "0669291125",
            "phone_2": "0",
            "adresse": "bab el assa",
            "wilaya_id": 13,
            "commune": "Bab El Assa",
            "montant": "5700.00",
            "remarque": "3",
            "produit": "maissa bleu roi 40",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "mous manel ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 13,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585232": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585232",
            "reference": "207965",
            "client": "nesrine akrouf ",
            "phone": "0560280363",
            "phone_2": "0",
            "adresse": "bab el oued norvali",
            "wilaya_id": 16,
            "commune": "Bab El Oued",
            "montant": "3500.00",
            "remarque": "4",
            "produit": "disney grey 48",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "nesrine akrouf ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585234": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585234",
            "reference": "207974",
            "client": "chetouh wiam ",
            "phone": "0697693612",
            "phone_2": "0",
            "adresse": "ain el berda",
            "wilaya_id": 23,
            "commune": "Ain Berda",
            "montant": "3700.00",
            "remarque": "6",
            "produit": "amina marron 38 ",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "chetouh wiam ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 23,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585236": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585236",
            "reference": "207976",
            "client": "anfel belmadi",
            "phone": "0792130209",
            "phone_2": "0",
            "adresse": "hey sidi bennor 23",
            "wilaya_id": 16,
            "commune": "Mahelma",
            "montant": "3500.00",
            "remarque": "8",
            "produit": "amina bordeaux 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "anfel belmadi",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585237": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585237",
            "reference": "207977",
            "client": "lina difallah ",
            "phone": "0657387222",
            "phone_2": "0",
            "adresse": "el bouni",
            "wilaya_id": 23,
            "commune": "El Bouni",
            "montant": "3700.00",
            "remarque": "9",
            "produit": "amina vert bouteille ",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "lina difallah ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 23,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585238": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585238",
            "reference": "207978",
            "client": "zarzi yara ",
            "phone": "0674095580",
            "phone_2": "0",
            "adresse": "Sétif",
            "wilaya_id": 19,
            "commune": "Setif",
            "montant": "3250.00",
            "remarque": "10",
            "produit": "amina vert clair 1 / 173",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "zarzi yara ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 19,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585239": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585239",
            "reference": "207979",
            "client": "bouchra ",
            "phone": "0665774226",
            "phone_2": "0",
            "adresse": "Maraval",
            "wilaya_id": 31,
            "commune": "Es Senia",
            "montant": "5250.00",
            "remarque": "11",
            "produit": "maissa vert bouteille 2",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "bouchra ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 31,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585240": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585240",
            "reference": "207981",
            "client": "halima bechaoui",
            "phone": "0795661697",
            "phone_2": "0",
            "adresse": "ammi mousaoui",
            "wilaya_id": 48,
            "commune": "Ammi Moussa",
            "montant": "3700.00",
            "remarque": "12",
            "produit": "amina noir 3",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "halima bechaoui",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 48,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585241": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585241",
            "reference": "207982",
            "client": "abidat merzaka ",
            "phone": "0657196889",
            "phone_2": "0",
            "adresse": "harat el oued",
            "wilaya_id": 7,
            "commune": "Biskra",
            "montant": "3900.00",
            "remarque": "13",
            "produit": "amina beige 36",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "abidat merzaka ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 7,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585242": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585242",
            "reference": "207983",
            "client": "nariman",
            "phone": "0559413607",
            "phone_2": "0",
            "adresse": "Bousaada",
            "wilaya_id": 28,
            "commune": "Bou Saada",
            "montant": "3250.00",
            "remarque": "14",
            "produit": "amina grenat 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "nariman",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 28,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585243": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585243",
            "reference": "207985",
            "client": "atmania nour el houda",
            "phone": "0664834392",
            "phone_2": "0",
            "adresse": "Souk ahres",
            "wilaya_id": 41,
            "commune": "Souk Ahras",
            "montant": "3300.00",
            "remarque": "15",
            "produit": "amina rose bebe 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "atmania nour el houda",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 41,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585244": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585244",
            "reference": "207986",
            "client": "hakima",
            "phone": "0778660803",
            "phone_2": "0",
            "adresse": "105 chemin sifnja , hadika tiverti",
            "wilaya_id": 16,
            "commune": "El Biar",
            "montant": "3500.00",
            "remarque": "16",
            "produit": "amina  grenat 40",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "hakima",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585245": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585245",
            "reference": "207987",
            "client": "riheb ben yahia",
            "phone": "0654908965",
            "phone_2": "0",
            "adresse": "1310 log batiment b11 ",
            "wilaya_id": 16,
            "commune": "Tassala El Merdja",
            "montant": "6400.00",
            "remarque": "17",
            "produit": "amin grenat 1 + amina noir 1",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "riheb ben yahia",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585246": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585246",
            "reference": "207991",
            "client": "arya allah rokaia",
            "phone": "0698824144",
            "phone_2": "0",
            "adresse": "In Salah",
            "wilaya_id": 53,
            "commune": "Ain Salah",
            "montant": "3850.00",
            "remarque": "18",
            "produit": "amina rose bebe 40",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "arya allah rokaia",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 53,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585247": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585247",
            "reference": "207992",
            "client": "gayed sajda ",
            "phone": "0781720311",
            "phone_2": "0",
            "adresse": "Ouargla",
            "wilaya_id": 30,
            "commune": "Ouargla",
            "montant": "3400.00",
            "remarque": "19",
            "produit": "amina grenat 40",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "gayed sajda ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 30,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585248": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585248",
            "reference": "207993",
            "client": "deriouiche hadjer ",
            "phone": "0673969991",
            "phone_2": "0",
            "adresse": "Tlemcen",
            "wilaya_id": 13,
            "commune": "Tlemcen",
            "montant": "6150.00",
            "remarque": "20",
            "produit": "amina marron 40 + amina vert clair 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "deriouiche hadjer ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 13,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585249": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585249",
            "reference": "207995",
            "client": "krache nabil ",
            "phone": "0696211054",
            "phone_2": "0",
            "adresse": "hamamat",
            "wilaya_id": 16,
            "commune": "Cheraga",
            "montant": "3500.00",
            "remarque": "21",
            "produit": "amina vert bouteille 1",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "krache nabil ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585250": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585250",
            "reference": "207996",
            "client": "allam ouissam",
            "phone": "0674932186",
            "phone_2": "0",
            "adresse": "hey ben boulaid batiment J la porte 15",
            "wilaya_id": 9,
            "commune": "Blida",
            "montant": "3500.00",
            "remarque": "22",
            "produit": "amina grenat 1",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "allam ouissam",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 9,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585251": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585251",
            "reference": "207997",
            "client": "feelahi chaima ",
            "phone": "0777366070",
            "phone_2": "0",
            "adresse": "Bir El Djir",
            "wilaya_id": 31,
            "commune": "Bir El Djir",
            "montant": "3250.00",
            "remarque": "23",
            "produit": "amina grenat 2",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "feelahi chaima ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 31,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585252": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585252",
            "reference": "207998",
            "client": "hmidato sara ",
            "phone": "0782838305",
            "phone_2": "0",
            "adresse": "bni messous ",
            "wilaya_id": 16,
            "commune": "Beni Messous",
            "montant": "6300.00",
            "remarque": "24",
            "produit": "amina noir L + amina grenat L",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "hmidato sara ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585253": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585253",
            "reference": "207999",
            "client": "boualami feriel",
            "phone": "0652695372",
            "phone_2": "0",
            "adresse": "Médéa",
            "wilaya_id": 26,
            "commune": "Medea",
            "montant": "3200.00",
            "remarque": "25",
            "produit": "amina rose bebe 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "boualami feriel",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 26,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "26A- Djelili Islam",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-13 20:08:02"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585254": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585254",
            "reference": "208000",
            "client": "nihal touati ",
            "phone": "0672451794",
            "phone_2": "0",
            "adresse": "Boumerdès ",
            "wilaya_id": 35,
            "commune": "Boumerdes",
            "montant": "3150.00",
            "remarque": "26",
            "produit": "amina rose bebe 42",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "nihal touati ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 35,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585255": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585255",
            "reference": "208001",
            "client": "khadidja ",
            "phone": "0559953639",
            "phone_2": "0",
            "adresse": "dergana",
            "wilaya_id": 16,
            "commune": "Bordj El Kiffan",
            "montant": "3500.00",
            "remarque": "27",
            "produit": "amina marron 1",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "khadidja ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585256": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585256",
            "reference": "208002",
            "client": "said guerni loubna ",
            "phone": "0552477992",
            "phone_2": "0",
            "adresse": "Centre - Sacré-Cœur",
            "wilaya_id": 16,
            "commune": "Alger Centre",
            "montant": "3200.00",
            "remarque": "28",
            "produit": "amina bordeaux 40",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "said guerni loubna ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585257": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585257",
            "reference": "208003",
            "client": "abbassa kenza ",
            "phone": "0696751982",
            "phone_2": "0",
            "adresse": "Mostaganem",
            "wilaya_id": 27,
            "commune": "Mostaganem",
            "montant": "3250.00",
            "remarque": "29",
            "produit": "amina bordeaux 36",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "abbassa kenza ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 27,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585258": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585258",
            "reference": "208004",
            "client": "malaoui dounia",
            "phone": "0559738411",
            "phone_2": "0",
            "adresse": "ain legraj",
            "wilaya_id": 19,
            "commune": "Ain Legraj",
            "montant": "3700.00",
            "remarque": "30",
            "produit": "amina bordeaux 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "malaoui dounia",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 19,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585259": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585259",
            "reference": "208005",
            "client": "loubna boulghobra",
            "phone": "0555609794",
            "phone_2": "0",
            "adresse": "Ali Mendjeli",
            "wilaya_id": 25,
            "commune": "El Khroub",
            "montant": "3250.00",
            "remarque": "31",
            "produit": "disney vert bouteille xl",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "loubna boulghobra",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 25,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585260": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585260",
            "reference": "208006",
            "client": "malek khaoula",
            "phone": "0670801152",
            "phone_2": "0",
            "adresse": "sidi amr",
            "wilaya_id": 42,
            "commune": "Sidi Amar",
            "montant": "5100.00",
            "remarque": "32",
            "produit": "zahra haut balnc et la jupe vert clair 36",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "malek khaoula",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 42,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585261": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585261",
            "reference": "208007",
            "client": "benamara racha ",
            "phone": "0660533195",
            "phone_2": "0",
            "adresse": "Béchar",
            "wilaya_id": 8,
            "commune": "Bechar",
            "montant": "3500.00",
            "remarque": "33",
            "produit": "amina rose bebe1",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "benamara racha ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 8,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14585262": {
        "OrderInfo": {
            "tracking": "N5J-35D-14585262",
            "reference": "208009",
            "client": "atallah malika ",
            "phone": "0699690211",
            "phone_2": "0",
            "adresse": "El eulma",
            "wilaya_id": 19,
            "commune": "El Eulma",
            "montant": "3250.00",
            "remarque": "34",
            "produit": "disney vert clair 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T16:44:18.000000Z"
        },
        "recipientName": "atallah malika ",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 19,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 17:44:18"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14586304": {
        "OrderInfo": {
            "tracking": "N5J-35D-14586304",
            "reference": "",
            "client": "refoufi sofia",
            "phone": "0668945923",
            "phone_2": "0",
            "adresse": "O",
            "wilaya_id": 19,
            "commune": "Setif",
            "montant": "3250.00",
            "remarque": "",
            "produit": "Amina vert clair 44",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-11T17:16:19.000000Z"
        },
        "recipientName": "refoufi sofia",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 19,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 18:16:19"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-11 18:30:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14611149": {
        "OrderInfo": {
            "tracking": "N5J-35D-14611149",
            "reference": "",
            "client": "kamilia yahiaoui",
            "phone": "0666456857",
            "phone_2": "0",
            "adresse": "i",
            "wilaya_id": 6,
            "commune": "Bejaia",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina grenat 1",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-12T16:57:21.000000Z"
        },
        "recipientName": "kamilia yahiaoui",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 6,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 17:57:21"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-12 19:17:53"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14611173": {
        "OrderInfo": {
            "tracking": "N5J-35D-14611173",
            "reference": "",
            "client": "malak bouckelf",
            "phone": "0659902280",
            "phone_2": "0",
            "adresse": "o",
            "wilaya_id": 16,
            "commune": "Baraki",
            "montant": "3500.00",
            "remarque": "",
            "produit": "amina grenat 40",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-12T16:58:21.000000Z"
        },
        "recipientName": "malak bouckelf",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 17:58:21"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-12 19:17:53"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14611195": {
        "OrderInfo": {
            "tracking": "N5J-35D-14611195",
            "reference": "",
            "client": "benalia sara",
            "phone": "0658234675",
            "phone_2": "0",
            "adresse": "o",
            "wilaya_id": 30,
            "commune": "Ouargla",
            "montant": "3400.00",
            "remarque": "",
            "produit": "amina grenat 40",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-12T16:59:38.000000Z"
        },
        "recipientName": "benalia sara",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 30,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 17:59:38"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-12 19:17:53"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35D-14614735": {
        "OrderInfo": {
            "tracking": "N5J-35D-14614735",
            "reference": "",
            "client": "ROUMAISSA",
            "phone": "0796632699",
            "phone_2": "0",
            "adresse": "O",
            "wilaya_id": 31,
            "commune": "Es Senia",
            "montant": "5700.00",
            "remarque": "",
            "produit": "maissa bleu nuit 36",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-12T19:07:58.000000Z"
        },
        "recipientName": "ROUMAISSA",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 31,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 20:07:58"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-13 16:06:12"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14344908": {
        "OrderInfo": {
            "tracking": "N5J-35C-14344908",
            "reference": "207911",
            "client": "abderahmane roumaissa",
            "phone": "0777002566",
            "phone_2": null,
            "adresse": "Médéa",
            "wilaya_id": 26,
            "commune": "Medea",
            "montant": "3200.00",
            "remarque": "",
            "produit": "amina beige 2",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-02T11:51:45.000000Z"
        },
        "recipientName": "abderahmane roumaissa",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 26,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-02 12:51:45"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-02 15:49:38"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "26A- Sidahmed Ferhat",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-03 07:30:27"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Sahli Lina",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-03 11:26:28"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "26A-Meheni Ouldhamadouche",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-04 10:10:13"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 15:40:44"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 16:19:51"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14416378": {
        "OrderInfo": {
            "tracking": "N5J-35C-14416378",
            "reference": "207914",
            "client": "ysamda hanane",
            "phone": "0674033986",
            "phone_2": null,
            "adresse": "cite ahmed chaou",
            "wilaya_id": 9,
            "commune": "Blida",
            "montant": "7000.00",
            "remarque": "",
            "produit": "kaho vert bouteille 36 + kaho grenat 40",
            "driver_name": "benredjem omar",
            "driver_phone": "0560878594",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-04T23:04:33.000000Z"
        },
        "recipientName": "ysamda hanane",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 9,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-05 00:04:33"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-05 12:12:24"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "abdelmalk belahmar",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-07 07:51:23"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "abdelmalk belahmar",
                "name": "",
                "driver": "benredjem omar",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 10:37:20"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Blida",
                "name": "",
                "driver": "benredjem omar",
                "content": "Client ne répond pas",
                "fdr": "",
                "date": "2026-02-07 12:07:28"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "benredjem omar",
                "name": "",
                "driver": "benredjem omar",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 13:32:26"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:22:41"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:24:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14416384": {
        "OrderInfo": {
            "tracking": "N5J-35C-14416384",
            "reference": "207963",
            "client": "mebroki anes",
            "phone": "0562890866",
            "phone_2": null,
            "adresse": "bouchagroun",
            "wilaya_id": 7,
            "commune": "Bouchagroun",
            "montant": "3900.00",
            "remarque": "",
            "produit": "amina vert clair 42",
            "driver_name": "Soukeur Abdelmounem",
            "driver_phone": "0698772039",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-04T23:05:48.000000Z"
        },
        "recipientName": "mebroki anes",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 7,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-05 00:05:48"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-05 12:12:24"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "07-Kadjoudj Younes",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-07 10:26:28"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "07-Kadjoudj Younes",
                "name": "",
                "driver": "Soukeur Abdelmounem",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 13:19:43"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Soukeur Abdelmounem",
                "name": "",
                "driver": "Soukeur Abdelmounem",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 21:44:52"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:22:41"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:24:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14416396": {
        "OrderInfo": {
            "tracking": "N5J-35C-14416396",
            "reference": "207940",
            "client": "fatima zohra gemache",
            "phone": "0559630951",
            "phone_2": null,
            "adresse": "ksar el abtal",
            "wilaya_id": 19,
            "commune": "Ksar El Abtal",
            "montant": "5700.00",
            "remarque": "",
            "produit": "maissa noir 38/173",
            "driver_name": "Oussama Ouchene",
            "driver_phone": "0775765242",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-04T23:09:16.000000Z"
        },
        "recipientName": "fatima zohra gemache",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 19,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-05 00:09:16"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-05 12:12:24"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "19C-Dahman Abd el ilah",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-07 08:40:03"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "19C-Dhib imad",
                "name": "",
                "driver": "Oussama Ouchene",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 09:49:20"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Oussama Ouchene",
                "name": "",
                "driver": "Oussama Ouchene",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 10:23:17"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:22:41"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:24:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14421928": {
        "OrderInfo": {
            "tracking": "N5J-35C-14421928",
            "reference": "207917",
            "client": "chaima djelouli",
            "phone": "0796981922",
            "phone_2": null,
            "adresse": "sid mhammed ben ali",
            "wilaya_id": 48,
            "commune": "Sidi Mhamed Ben Ali",
            "montant": "3700.00",
            "remarque": "",
            "produit": "amina bleu ciel 1",
            "driver_name": "Boutaiba Mohamed",
            "driver_phone": "0770894940",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-05T11:12:56.000000Z"
        },
        "recipientName": "chaima djelouli",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 48,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-05 12:12:56"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-05 16:07:05"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "SAFA AMEL",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-06 12:56:21"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "48-Meriem SAFA",
                "name": "",
                "driver": "Boutaiba Mohamed",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 10:54:17"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Boutaiba Mohamed",
                "name": "",
                "driver": "Boutaiba Mohamed",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 11:54:47"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:22:41"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:24:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14426593": {
        "OrderInfo": {
            "tracking": "N5J-35C-14426593",
            "reference": "207909",
            "client": "boukara hadjer",
            "phone": "0656751726",
            "phone_2": null,
            "adresse": "el milia",
            "wilaya_id": 18,
            "commune": "El Milia",
            "montant": "3700.00",
            "remarque": "",
            "produit": "amina bleu ciel 38",
            "driver_name": "Boulamaach Aziz",
            "driver_phone": "0550429216",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-05T13:14:01.000000Z"
        },
        "recipientName": "boukara hadjer",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 18,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-05 14:14:01"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-05 16:07:05"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "18 MANEL BROUK",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-07 08:39:31"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "18-Dounia DJEBBAR",
                "name": "",
                "driver": "Boulamaach Aziz",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 10:53:55"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Jijel",
                "name": "",
                "driver": "Boulamaach Aziz",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-07 17:45:37"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Boulamaach Aziz",
                "name": "",
                "driver": "Boulamaach Aziz",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 21:27:42"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:22:41"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:24:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14440416": {
        "OrderInfo": {
            "tracking": "N5J-35C-14440416",
            "reference": "207990",
            "client": "ben sassa roza",
            "phone": "0799828271",
            "phone_2": null,
            "adresse": "Médéa",
            "wilaya_id": 26,
            "commune": "Medea",
            "montant": "3200.00",
            "remarque": "livr le dimanche max",
            "produit": "amina grenat 36",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-05T23:32:01.000000Z"
        },
        "recipientName": "ben sassa roza",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 26,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-06 00:32:01"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 12:17:51"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "26A- Sidahmed Ferhat",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 07:41:14"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Sahli Lina",
                "name": "",
                "driver": "",
                "content": "Client injoignable",
                "fdr": "",
                "date": "2026-02-08 10:53:36"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "26A-Meheni Ouldhamadouche",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 13:56:16"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:22:41"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:24:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456662": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456662",
            "reference": "207930",
            "client": "gouidri asma",
            "phone": "0551845745",
            "phone_2": null,
            "adresse": "Reghaia",
            "wilaya_id": 16,
            "commune": "Reghaia",
            "montant": "5200.00",
            "remarque": "",
            "produit": "maissa vert clair 2 / 172",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T11:21:20.000000Z"
        },
        "recipientName": "gouidri asma",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:20"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "REG - MUNIZ MAHMOUD",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 08:14:01"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Chelihi imane",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-08 10:01:13"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16D- Badaoui Faiza",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 16:08:16"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456681": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456681",
            "reference": "207921",
            "client": "kouther meddahi",
            "phone": "0778369880",
            "phone_2": null,
            "adresse": "leghata hey ouled hilel",
            "wilaya_id": 35,
            "commune": "Bordj Menaiel",
            "montant": "3400.00",
            "remarque": "",
            "produit": "amina vert clair M",
            "driver_name": "Abd El kbir Hichem",
            "driver_phone": "0560934199",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T11:21:30.000000Z"
        },
        "recipientName": "kouther meddahi",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 35,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:30"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C - NEKMOUCHE HICHEM",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:12:50"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C - NEKMOUCHE HICHEM",
                "name": "",
                "driver": "Abd El kbir Hichem",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 09:49:36"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Abd El kbir Hichem",
                "name": "",
                "driver": "Abd El kbir Hichem",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 17:48:21"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:22:41"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:24:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456682": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456682",
            "reference": "207916",
            "client": "hala yachi",
            "phone": "0781333760",
            "phone_2": null,
            "adresse": "Chlef",
            "wilaya_id": 2,
            "commune": "Chlef",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina vert clair 1",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T11:21:30.000000Z"
        },
        "recipientName": "hala yachi",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 2,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:30"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "02A - Tourigui Hemza",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 10:34:24"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "hammou assala",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-08 14:46:44"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "hammou assala",
                "name": "",
                "driver": "",
                "content": "Client ne répond pas",
                "fdr": "",
                "date": "2026-02-10 12:08:24"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "02A Bettaher abdenour",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 12:59:46"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456683": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456683",
            "reference": "207918",
            "client": "samah behclaghem",
            "phone": "0793961984",
            "phone_2": null,
            "adresse": "boudjlida",
            "wilaya_id": 13,
            "commune": "Chetouane",
            "montant": "3700.00",
            "remarque": "",
            "produit": "amina rose bebe 36",
            "driver_name": "Sediki Walid",
            "driver_phone": "0780250256",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T11:21:30.000000Z"
        },
        "recipientName": "samah behclaghem",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 13,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:30"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "13A-Mohamed Bendaoudi",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-10 13:25:56"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "13A-Benameur Mohammed",
                "name": "",
                "driver": "Sediki Walid",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:34:33"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Tlemcen",
                "name": "",
                "driver": "Sediki Walid",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-10 16:10:01"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Sediki Walid",
                "name": "",
                "driver": "Sediki Walid",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 17:01:27"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456684": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456684",
            "reference": "207933",
            "client": "tlanbout marwa",
            "phone": "0540736831",
            "phone_2": null,
            "adresse": "marsa ben mhidi",
            "wilaya_id": 13,
            "commune": "Marsa Ben Mhidi",
            "montant": "3700.00",
            "remarque": "",
            "produit": "amina vert clair 1",
            "driver_name": "Guerd Aissam",
            "driver_phone": "0770820624",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T11:21:30.000000Z"
        },
        "recipientName": "tlanbout marwa",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 13,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:30"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "13B- GUITOUNI NOURDDINE",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 14:20:12"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "13B- FARDEHEB AMEL",
                "name": "",
                "driver": "Guerd Aissam",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 15:01:19"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Guerd Aissam",
                "name": "",
                "driver": "Guerd Aissam",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 18:43:47"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:22:41"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:24:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456685": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456685",
            "reference": "207922",
            "client": "nouari yasmine",
            "phone": "0672317657",
            "phone_2": null,
            "adresse": "hadjout",
            "wilaya_id": 42,
            "commune": "Hadjout",
            "montant": "3500.00",
            "remarque": "",
            "produit": "amina noir 3",
            "driver_name": "Mahmoud Neddjar",
            "driver_phone": "0554652587",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T11:21:30.000000Z"
        },
        "recipientName": "nouari yasmine",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 42,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:30"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "42-Neddjar Youssra",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 07:17:50"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "42-Neddjar Youssra",
                "name": "",
                "driver": "Mahmoud Neddjar",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 08:08:17"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "42-Neddjar Youssra",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 07:55:06"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:22:41"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:24:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456686": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456686",
            "reference": "207915",
            "client": "chahinaz",
            "phone": "0657612026",
            "phone_2": null,
            "adresse": "Saïda",
            "wilaya_id": 20,
            "commune": "Saida",
            "montant": "3300.00",
            "remarque": "",
            "produit": "amina mauve clair 38/40",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T11:21:31.000000Z"
        },
        "recipientName": "chahinaz",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 20,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:31"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "20-Mimoun SEDIRI",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 12:26:23"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Chelihi imane",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-09 14:51:08"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "KHEMICI Nacera",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 16:19:59"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456687": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456687",
            "reference": "207912",
            "client": "fidal amhemed",
            "phone": "0658923923",
            "phone_2": null,
            "adresse": "karia sidi aissa",
            "wilaya_id": 2,
            "commune": "Taougrite",
            "montant": "3700.00",
            "remarque": "",
            "produit": "amina bleu ciel 44",
            "driver_name": "benziane yassine",
            "driver_phone": "0655726897",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T11:21:31.000000Z"
        },
        "recipientName": "fidal amhemed",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 2,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:31"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "02A - BOUKORT HAMZA",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 10:39:35"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "02A - BOUKORT HAMZA",
                "name": "",
                "driver": "benziane yassine",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 11:32:28"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Chlef",
                "name": "",
                "driver": "benziane yassine",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-08 13:06:41"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Chlef",
                "name": "",
                "driver": "benziane yassine",
                "content": "Client injoignable",
                "fdr": "",
                "date": "2026-02-08 14:10:15"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Chlef",
                "name": "",
                "driver": "benziane yassine",
                "content": "Client injoignable",
                "fdr": "",
                "date": "2026-02-08 14:14:44"
            },
            {
                "event_key": "sent_to_redispatch",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "02A - BOUKORT HAMZA",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 10:10:51"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "02A - BOUKORT HAMZA",
                "name": "",
                "driver": "benziane yassine",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 10:28:50"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "benziane yassine",
                "name": "",
                "driver": "benziane yassine",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:32:51"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456688": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456688",
            "reference": "207927",
            "client": "dehmon amira",
            "phone": "0659626169",
            "phone_2": null,
            "adresse": "M'sila",
            "wilaya_id": 28,
            "commune": "Msila",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina mauve 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T11:21:31.000000Z"
        },
        "recipientName": "dehmon amira",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 28,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:31"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "28-SAID FERRAH",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 08:49:42"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "28A - OUMAIMA BENYETOU",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 11:27:51"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Hamadache f/zohra",
                "name": "",
                "driver": "",
                "content": "vx",
                "fdr": "",
                "date": "2026-02-09 11:31:26"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:22:41"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:24:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456690": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456690",
            "reference": "207928",
            "client": "sirine chennoufi",
            "phone": "0552798073",
            "phone_2": null,
            "adresse": "mohammedia",
            "wilaya_id": 16,
            "commune": "Mohammadia",
            "montant": "3500.00",
            "remarque": "",
            "produit": "amina grenat 3",
            "driver_name": "DEBIEB Mohamed",
            "driver_phone": "0560758602",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T11:21:32.000000Z"
        },
        "recipientName": "sirine chennoufi",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:32"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16B- Bousri Anis",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-10 07:25:02"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16B-Oubaiche Fayçal",
                "name": "",
                "driver": "DEBIEB Mohamed",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 09:27:04"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "DEBIEB Mohamed",
                "name": "",
                "driver": "DEBIEB Mohamed",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 12:34:20"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456691": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456691",
            "reference": "207913",
            "client": "yasmine bencharef",
            "phone": "0776742685",
            "phone_2": null,
            "adresse": "tagdamet",
            "wilaya_id": 35,
            "commune": "Dellys",
            "montant": "3400.00",
            "remarque": "",
            "produit": "amina vert clair 40",
            "driver_name": "Ouakil rafik",
            "driver_phone": "0560964435",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T11:21:32.000000Z"
        },
        "recipientName": "yasmine bencharef",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 35,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:32"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35D-Ferhoum Khaled",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 08:39:35"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35D-Ganoun Nesrine",
                "name": "",
                "driver": "Ouakil rafik",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 10:06:16"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Ouakil rafik",
                "name": "",
                "driver": "Ouakil rafik",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 17:26:34"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:22:41"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:24:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456693": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456693",
            "reference": "207910",
            "client": "mebarki randa",
            "phone": "0665164282",
            "phone_2": null,
            "adresse": "Sidi bel abbès",
            "wilaya_id": 22,
            "commune": "Sidi Bel Abbes",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina noir 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T11:21:32.000000Z"
        },
        "recipientName": "mebarki randa",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 22,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:32"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "22-Adel BACHIR BOUAIDJIRA",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 13:36:14"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "22-Adel BACHIR BOUAIDJIRA",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-08 17:08:02"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "22-Adel BACHIR BOUAIDJIRA",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-09 16:44:03"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "22-Adel BACHIR BOUAIDJIRA",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-10 09:45:42"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Bouaidjra sara",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 17:29:00"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456694": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456694",
            "reference": "207919",
            "client": "bettaher khoula",
            "phone": "0797329700",
            "phone_2": null,
            "adresse": "Mostaganem",
            "wilaya_id": 27,
            "commune": "Mostaganem",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina grenat 40",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T11:21:32.000000Z"
        },
        "recipientName": "bettaher khoula",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 27,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:32"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "27-Ahlem MOULAI",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 10:59:34"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "ghrib Sara",
                "name": "",
                "driver": "",
                "content": "sonne puis fin d'appel",
                "fdr": "",
                "date": "2026-02-09 14:17:00"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "ghrib Sara",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-10 10:08:08"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "27-SOUIDI MOHAMED",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 10:28:41"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456695": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456695",
            "reference": "207926",
            "client": "djemiat imen",
            "phone": "0773768210",
            "phone_2": null,
            "adresse": "Sétif",
            "wilaya_id": 19,
            "commune": "Setif",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina bleu ciel 36",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T11:21:32.000000Z"
        },
        "recipientName": "djemiat imen",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 19,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:32"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "19A- SAID HARBOUCHE",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 10:01:54"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "19A-Kheloufi Houdaifa",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 12:43:42"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:22:41"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:24:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456696": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456696",
            "reference": "207923",
            "client": "maaamri fatima",
            "phone": "0658648032",
            "phone_2": null,
            "adresse": "oued el djamaa",
            "wilaya_id": 48,
            "commune": "Oued El Djemaa",
            "montant": "3700.00",
            "remarque": "",
            "produit": "amina vert bouteille 44",
            "driver_name": "Chelef  Nasreddine",
            "driver_phone": "0770896629",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T11:21:32.000000Z"
        },
        "recipientName": "maaamri fatima",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 48,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:32"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "48-Meriem SAFA",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-10 09:14:50"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "48-Chibani abdessamed",
                "name": "",
                "driver": "Chelef  Nasreddine",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 10:44:57"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Relizane",
                "name": "",
                "driver": "Chelef  Nasreddine",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-10 13:42:40"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Chelef  Nasreddine",
                "name": "",
                "driver": "Chelef  Nasreddine",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 13:42:46"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456698": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456698",
            "reference": "207920",
            "client": "belabed sirine",
            "phone": "0781953350",
            "phone_2": null,
            "adresse": "El eulma",
            "wilaya_id": 19,
            "commune": "El Eulma",
            "montant": "3700.00",
            "remarque": "",
            "produit": "",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T11:21:32.000000Z"
        },
        "recipientName": "belabed sirine",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 19,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:32"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "19B-ElBachek Ferdi",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-10 08:50:20"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Livraison a domicile , el eulma",
                "fdr": "",
                "date": "2026-02-10 09:32:56"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Faoussi Hanane",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-10 09:42:05"
            },
            {
                "event_key": "edited_informations",
                "event": "Informations modifiées",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "19B-Boukhalfa Nour el Houda",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 13:42:32"
            },
            {
                "event_key": "edited_informations",
                "event": "Informations modifiées",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "19B-Boukhalfa Nour el Houda",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 13:44:25"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "19B-Boukhalfa Nour el Houda",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 13:45:05"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14456699": {
        "OrderInfo": {
            "tracking": "N5J-35C-14456699",
            "reference": "207929",
            "client": "yasmine oukrid",
            "phone": "0676000417",
            "phone_2": null,
            "adresse": "Boumerdès",
            "wilaya_id": 35,
            "commune": "Boumerdes",
            "montant": "3150.00",
            "remarque": "",
            "produit": "amina vert clair 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T11:21:32.000000Z"
        },
        "recipientName": "yasmine oukrid",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 35,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 12:21:32"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:00:27"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Marouane BELLIL",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 07:31:30"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "selmani sabrine",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-08 12:02:14"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "selmani sabrine",
                "name": "",
                "driver": "",
                "content": "vx",
                "fdr": "",
                "date": "2026-02-10 15:24:10"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Marouane BELLIL",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 12:20:28"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14468443": {
        "OrderInfo": {
            "tracking": "N5J-35C-14468443",
            "reference": "207935",
            "client": "kettab maissa",
            "phone": "0773857279",
            "phone_2": null,
            "adresse": "mostghanem",
            "wilaya_id": 27,
            "commune": "Mostaganem",
            "montant": "3700.00",
            "remarque": "",
            "produit": "amina marron M",
            "driver_name": "BOUADJEMI YACINE ABDELDJALIL",
            "driver_phone": "0560366368",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T15:10:39.000000Z"
        },
        "recipientName": "kettab maissa",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 27,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 16:10:39"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:11:21"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "27-SOUIDI MOHAMED",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 12:31:15"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "27-Ahlem MOULAI",
                "name": "",
                "driver": "BOUADJEMI YACINE ABDELDJALIL",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 13:22:19"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "BOUADJEMI YACINE ABDELDJALIL",
                "name": "",
                "driver": "BOUADJEMI YACINE ABDELDJALIL",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 17:26:39"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35b-hanine raouf",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:22:41"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:24:15"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14468452": {
        "OrderInfo": {
            "tracking": "N5J-35C-14468452",
            "reference": "207984",
            "client": "hadjer bn",
            "phone": "0664212946",
            "phone_2": null,
            "adresse": "metlili",
            "wilaya_id": 47,
            "commune": "Metlili",
            "montant": "3900.00",
            "remarque": "",
            "produit": "amina vert clair 1",
            "driver_name": "Benguetta METLILI",
            "driver_phone": "0655722829",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T15:11:05.000000Z"
        },
        "recipientName": "hadjer bn",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 47,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 16:11:05"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-07 16:11:20"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "47- azeddine malaoui",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-08 13:47:03"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "47- abd allah atiallah",
                "name": "",
                "driver": "Benguetta METLILI",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 16:11:12"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Benguetta METLILI",
                "name": "",
                "driver": "Benguetta METLILI",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 16:14:49"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14478920": {
        "OrderInfo": {
            "tracking": "N5J-35C-14478920",
            "reference": "207947",
            "client": "zahra gaouaoui",
            "phone": "0670057460",
            "phone_2": null,
            "adresse": "a cote de la poste d'el afroune",
            "wilaya_id": 9,
            "commune": "El Affroun",
            "montant": "3500.00",
            "remarque": "livraison rapide  , dimanche",
            "produit": "amina beige 38",
            "driver_name": "echiker abdelhak",
            "driver_phone": "0561680247",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T19:28:10.000000Z"
        },
        "recipientName": "zahra gaouaoui",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 9,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 20:28:10"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-08 13:04:01"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "abdelmalk belahmar",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 08:24:24"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "abdelmalk belahmar",
                "name": "",
                "driver": "echiker abdelhak",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 09:14:43"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Blida",
                "name": "",
                "driver": "echiker abdelhak",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-09 10:24:04"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "echiker abdelhak",
                "name": "",
                "driver": "echiker abdelhak",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:06:39"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14478925": {
        "OrderInfo": {
            "tracking": "N5J-35C-14478925",
            "reference": "207951",
            "client": "bedri",
            "phone": "0654930440",
            "phone_2": null,
            "adresse": "mchouneche",
            "wilaya_id": 7,
            "commune": "Mchouneche",
            "montant": "3900.00",
            "remarque": "Livr lundi",
            "produit": "amina grenat 38",
            "driver_name": "Boumaraf Hafnaoui",
            "driver_phone": "0781949470",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T19:28:41.000000Z"
        },
        "recipientName": "bedri",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 7,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 20:28:41"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-08 13:04:01"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "07-Kadjoudj Younes",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 10:12:52"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "07-Kadjoudj Younes",
                "name": "",
                "driver": "Boumaraf Hafnaoui",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 15:20:01"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Biskra",
                "name": "",
                "driver": "Boumaraf Hafnaoui",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-09 19:46:55"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Boumaraf Hafnaoui",
                "name": "",
                "driver": "Boumaraf Hafnaoui",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 21:39:21"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14478927": {
        "OrderInfo": {
            "tracking": "N5J-35C-14478927",
            "reference": "207954",
            "client": "bouchachi rayan",
            "phone": "0798191642",
            "phone_2": null,
            "adresse": "Mostaganem",
            "wilaya_id": 27,
            "commune": "Mostaganem",
            "montant": "3250.00",
            "remarque": "livraison rapide , urgent max ce lundi",
            "produit": "amina noir s",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T19:28:55.000000Z"
        },
        "recipientName": "bouchachi rayan",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 27,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 20:28:55"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-08 13:04:01"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "27-Ahlem MOULAI",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 11:00:11"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "ghrib Sara",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-09 14:16:14"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Karras aymen",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 15:28:38"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14478932": {
        "OrderInfo": {
            "tracking": "N5J-35C-14478932",
            "reference": "207968",
            "client": "metira ikram",
            "phone": "0674582692",
            "phone_2": null,
            "adresse": "Laghouat",
            "wilaya_id": 3,
            "commune": "Laghouat",
            "montant": "3400.00",
            "remarque": "livraison rapide , lundi/mardi",
            "produit": "amina gris 38",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T19:29:13.000000Z"
        },
        "recipientName": "metira ikram",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 3,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 20:29:13"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-08 13:04:01"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "03-Abdallah BENLAHBIB",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 12:21:03"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Allalou rayane",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-09 15:14:05"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "03-Abdallah BENLAHBIB",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 08:51:21"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14478950": {
        "OrderInfo": {
            "tracking": "N5J-35C-14478950",
            "reference": "207994",
            "client": "chaima",
            "phone": "0696786694",
            "phone_2": null,
            "adresse": "mdaourouche",
            "wilaya_id": 41,
            "commune": "Mdaourouche",
            "montant": "3800.00",
            "remarque": "livr max mardi/mercredi",
            "produit": "amina vert clair 38",
            "driver_name": "Guefassa Ilyas",
            "driver_phone": "0562667034",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-07T19:29:38.000000Z"
        },
        "recipientName": "chaima",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 41,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 20:29:38"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-08 13:04:01"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "41A- Gouasmia Idris",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 12:01:03"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "41A- Gouasmia Idris",
                "name": "",
                "driver": "Guefassa Ilyas",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 13:09:44"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Souk Ahras",
                "name": "",
                "driver": "Guefassa Ilyas",
                "content": "Client injoignable",
                "fdr": "",
                "date": "2026-02-09 14:31:29"
            },
            {
                "event_key": "sent_to_redispatch",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "41A- Gouasmia Idris",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-10 09:50:54"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "41 -Hamaza Rabiaa",
                "name": "",
                "driver": "Guefassa Ilyas",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 12:16:37"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Souk Ahras",
                "name": "",
                "driver": "Guefassa Ilyas",
                "content": "Client injoignable",
                "fdr": "",
                "date": "2026-02-10 16:30:35"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Souk Ahras",
                "name": "",
                "driver": "Guefassa Ilyas",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-10 16:45:26"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Guefassa Ilyas",
                "name": "",
                "driver": "Guefassa Ilyas",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 17:49:03"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14480910": {
        "OrderInfo": {
            "tracking": "N5J-35C-14480910",
            "reference": "207952",
            "client": "sabrina",
            "phone": "0675013355",
            "phone_2": null,
            "adresse": "Aïn El Béïda",
            "wilaya_id": 4,
            "commune": "Ain Beida",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina vert clair 48",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-07T20:06:09.000000Z"
        },
        "recipientName": "sabrina",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 4,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-07 21:06:09"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-08 13:04:01"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "04C-Ferroudj Lotfi",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 11:42:21"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "04C-Bougandoura Rania",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-09 12:27:01"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "04C-Bougandoura Rania",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-10 09:44:50"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "04C-Bougandoura Rania",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 15:44:45"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14492481": {
        "OrderInfo": {
            "tracking": "N5J-35C-14492481",
            "reference": "207942",
            "client": "chikh nour el houda",
            "phone": "0798561398",
            "phone_2": null,
            "adresse": "les annassers 2Bt D1 kouba",
            "wilaya_id": 16,
            "commune": "Kouba",
            "montant": "3500.00",
            "remarque": "livraison de samedi au jeudi",
            "produit": "amina noir 1",
            "driver_name": "Zendji Abed",
            "driver_phone": "0550429901",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-08T12:04:53.000000Z"
        },
        "recipientName": "chikh nour el houda",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 13:04:53"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-08 15:02:30"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16A-Achour Ismail",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-09 08:15:44"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16A-Mohamed islam",
                "name": "",
                "driver": "Zendji Abed",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 09:29:33"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Bir Mourad rais",
                "name": "",
                "driver": "Zendji Abed",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-09 10:28:10"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Bir Mourad rais",
                "name": "",
                "driver": "Zendji Abed",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-09 10:35:59"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Zendji Abed",
                "name": "",
                "driver": "Zendji Abed",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:10:59"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14510773": {
        "OrderInfo": {
            "tracking": "N5J-35C-14510773",
            "reference": "208012",
            "client": "mariam",
            "phone": "0553024896",
            "phone_2": null,
            "adresse": "cite universitaire de jeune fille m'douha",
            "wilaya_id": 15,
            "commune": "Tizi Ouzou",
            "montant": "5200.00",
            "remarque": "livraison avant le jeudi",
            "produit": "zahra haut blanc et la jue blanche S",
            "driver_name": "Ahcene Youva",
            "driver_phone": "0784262884",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-08T20:08:25.000000Z"
        },
        "recipientName": "mariam",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 15,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-08 21:08:25"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 12:55:18"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "15C-Ookal  Ahmed",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-10 05:24:22"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "15C-Ookal  Ahmed",
                "name": "",
                "driver": "Ahcene Youva",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 09:34:30"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Tizi Ouzou",
                "name": "",
                "driver": "Ahcene Youva",
                "content": "Client demande de reporter la livraison",
                "fdr": "",
                "date": "2026-02-10 10:32:10"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Ahcene Youva",
                "name": "",
                "driver": "Ahcene Youva",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 16:31:20"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14519927": {
        "OrderInfo": {
            "tracking": "N5J-35C-14519927",
            "reference": "207955",
            "client": "serar hanan",
            "phone": "0561367446",
            "phone_2": "0561367746",
            "adresse": "Baraki",
            "wilaya_id": 16,
            "commune": "Baraki",
            "montant": "3200.00",
            "remarque": "",
            "produit": "",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-09T11:55:29.000000Z"
        },
        "recipientName": "serar hanan",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:55:29"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 13:39:07"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16G-ALI CHOUIHA",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-10 07:57:06"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Modifier numeeo de tlf : 0561367746",
                "fdr": "",
                "date": "2026-02-10 09:38:26"
            },
            {
                "event_key": "edited_informations",
                "event": "Informations modifiées",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Rahmouni loubna",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 11:35:20"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Rahmouni loubna",
                "name": "",
                "driver": "",
                "content": "Client injoignable",
                "fdr": "",
                "date": "2026-02-10 11:35:51"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Rahmouni loubna",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-10 16:05:10"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Rahmouni loubna",
                "name": "",
                "driver": "",
                "content": "vx",
                "fdr": "",
                "date": "2026-02-10 16:10:58"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16G-Karima  Lachachi",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-11 10:34:07"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14519931": {
        "OrderInfo": {
            "tracking": "N5J-35C-14519931",
            "reference": "207941",
            "client": "bensaid amina",
            "phone": "0554528267",
            "phone_2": null,
            "adresse": "Sidi bel abbès",
            "wilaya_id": 22,
            "commune": "Sidi Bel Abbes",
            "montant": "3250.00",
            "remarque": "",
            "produit": "amina bordeaux 1",
            "driver_name": "",
            "driver_phone": "",
            "type_id": 1,
            "stop_desk": 1,
            "created_at": "2026-02-09T11:55:31.000000Z"
        },
        "recipientName": "bensaid amina",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 22,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:55:31"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 13:39:03"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "22-Adel BACHIR BOUAIDJIRA",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-10 12:16:15"
            },
            {
                "event_key": "mise_a_jour",
                "event": "Tentative de livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "22-Adel BACHIR BOUAIDJIRA",
                "name": "",
                "driver": "",
                "content": "Client contacté",
                "fdr": "",
                "date": "2026-02-10 12:46:46"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "Ridal douaa",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 16:29:32"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    },
    "N5J-35C-14519936": {
        "OrderInfo": {
            "tracking": "N5J-35C-14519936",
            "reference": "207943",
            "client": "rania leghouag",
            "phone": "0779659759",
            "phone_2": null,
            "adresse": "eucalyptus",
            "wilaya_id": 16,
            "commune": "Les Eucalyptus",
            "montant": "3500.00",
            "remarque": "",
            "produit": "amina rose 2",
            "driver_name": "Diop Oussama",
            "driver_phone": "0555212372",
            "type_id": 1,
            "stop_desk": 0,
            "created_at": "2026-02-09T11:55:31.000000Z"
        },
        "recipientName": "rania leghouag",
        "shippedBy": "hiya collection35",
        "originCity": 35,
        "destLocationCity": 16,
        "activity": [
            {
                "event_key": "upload",
                "event": "Uploadé sur le système",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "hiya collection35",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-09 12:55:31"
            },
            {
                "event_key": "customer_validation",
                "event": "Validé",
                "causer": "PARTENAIRE",
                "badge-class": "badge-success",
                "by": "arezki yasmine",
                "name": "",
                "driver": "",
                "content": "Manuel",
                "fdr": "",
                "date": "2026-02-09 13:39:03"
            },
            {
                "event_key": "validation_reception",
                "event": "Enlevé par le livreur",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16G-ALI CHOUIHA",
                "name": "",
                "driver": "",
                "content": "Scanné",
                "fdr": "",
                "date": "2026-02-10 07:58:42"
            },
            {
                "event_key": "fdr_activated",
                "event": "En livraison",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "16G-Karima  Lachachi",
                "name": "",
                "driver": "Diop Oussama",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 10:12:43"
            },
            {
                "event_key": "livred",
                "event": "Livré",
                "causer": "Livreur",
                "badge-class": "badge-default",
                "by": "Diop Oussama",
                "name": "",
                "driver": "Diop Oussama",
                "content": "",
                "fdr": "",
                "date": "2026-02-10 18:47:43"
            },
            {
                "event_key": "verssement_admin_cust",
                "event": "Montant transmis au partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:27"
            },
            {
                "event_key": "validation_reception_cash_by_partener",
                "event": "Montant reçu par le partenaire",
                "causer": "NOEST",
                "badge-class": "badge-primary",
                "by": "35C- NEKMOUCHE AMIRA",
                "name": "",
                "driver": "",
                "content": "",
                "fdr": "",
                "date": "2026-02-12 13:00:46"
            }
        ],
        "deliveryAttempts": []
    }
}