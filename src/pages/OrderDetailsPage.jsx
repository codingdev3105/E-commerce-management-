import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getOrders } from '../services/api';
import { ArrowLeft, Package, User, Phone, MapPin, Calendar, DollarSign, Truck, FileText, Info } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

function OrderDetailsPage({ orderId, onBack }) {
    const params = useParams();
    const id = orderId || params.id; // Support both prop and route param
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const { wilayas } = useAppData();

    useEffect(() => {
        const fetchOrder = async () => {
            if (!id) return; // Wait for ID
            try {
                // Fetch all and find (Temporary solution until backend supports GET /:id)
                const orders = await getOrders();
                // Find by Reference
                const found = orders.find(o => o.rowId === Number(id));
                setOrder(found);
            } catch (err) {
                console.error("Failed to fetch order", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Chargement...</div>;

    if (!order) {
        return (
            <div className="p-8 text-center">
                <p className="text-slate-500 mb-4">Commande introuvable.</p>
                <button onClick={onBack || (() => navigate('/commandes'))} className="text-blue-600 hover:underline">Retour à la liste</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <button onClick={onBack || (() => navigate('/commandes'))} className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-700 -ml-2">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex flex-wrap items-center gap-3">
                            Commande <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-xl">{order.reference}</span>
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Crée le {order.date}</p>
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-50">
                    <span className={`inline-block text-center w-full md:w-auto px-4 py-1.5 rounded-full text-sm font-bold shadow-sm
                      ${(order.state || '').toLowerCase().includes('nouvelle') ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            (order.state || '').toLowerCase().includes('atelier') ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                (order.state || '').toLowerCase().includes('system') ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                    (order.state || '').toLowerCase().includes('annuler') ? 'bg-red-100 text-red-700 border border-red-200' :
                                        'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                        {order.state}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Client Info */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <User className="w-4 h-4" /> Client
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <div className="text-xs text-slate-400">Nom Complet</div>
                            <div className="font-medium text-slate-800 text-lg">{order.client}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400">Téléphone{order.phone2 ? 's' : ''}</div>
                            <div className="font-medium text-slate-800 flex flex-wrap items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{order.phone}</span>
                                {order.phone2 && (
                                    <>
                                        <span className="text-slate-400">-</span>
                                        <span>{order.phone2}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delivery Info */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Livraison
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <div className="text-xs text-slate-400">Wilaya</div>
                            <div className="font-medium text-slate-800">{wilayas.find(w => w.code == order.wilaya)?.nom || ''} {order.wilaya}</div>
                        </div>
                        {order.isStopDesk ? (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <div className="text-xs font-bold text-blue-600 flex items-center gap-1 mb-1">
                                    <Truck className="w-3 h-3" /> STOP DESK
                                </div>
                                <div className="text-sm text-blue-800 font-medium">{order.address}</div>
                                {order.stationCode && <div className="text-xs text-blue-600 font-mono mt-1">Code: {order.stationCode}</div>}
                            </div>
                        ) : (
                            <div>
                                <div className="text-xs text-slate-400">Adresse Domicile</div>
                                <div className="font-medium text-slate-800">{order.address}</div>
                                {order.commune && <div className="text-sm text-slate-500">{order.commune}</div>}
                            </div>
                        )}
                        {order.note && (
                            <div className="pt-2 border-t border-slate-100">
                                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Remarque</div>
                                <div className="text-sm text-slate-600 italic">"{order.note}"</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Product & Financial */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Package className="w-4 h-4" /> Commande
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <div className="text-xs text-slate-400">Produit</div>
                            <div className="font-medium text-slate-800">{order.product || '-'}</div>
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                            <div className="text-xs text-slate-400">Montant Total</div>
                            <div className="font-bold text-emerald-600 text-2xl flex items-center gap-1">
                                {order.amount} <span className="text-sm font-normal text-emerald-500">DA</span>
                            </div>
                        </div>
                        {order.isExchange && (
                            <div className="bg-orange-50 text-orange-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-orange-100">
                                <Info className="w-4 h-4" /> Échange requis
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

export default OrderDetailsPage;
