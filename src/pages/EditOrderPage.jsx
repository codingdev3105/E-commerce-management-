import { useState, useEffect, useMemo } from 'react';
import { updateOrder, getOrders } from '../services/api';
import { Save, MapPin, Phone, User, DollarSign, Truck, ArrowLeft, Lock, AlertTriangle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUI } from '../context/UIContext';
import { useAppData } from '../context/AppDataContext';
import { useStates } from '../context/StatesContext';
import Combobox from '../components/Combobox';

function EditOrderPage({ orderId, onBack }) {
    const params = useParams();
    const id = orderId || params.id;
    const navigate = useNavigate();
    const { toast } = useUI();
    const { wilayas, communes, desks: stations, loading: loadingRef } = useAppData();
    const { availableStates } = useStates();

    const [loadingOrder, setLoadingOrder] = useState(true);

    const [orderData, setOrderData] = useState({
        reference: '',
        client: '',
        phone: '',
        phone2: '',
        address: '',
        wilaya: '',
        commune: '',
        amount: '',
        product: '',
        note: '',
        isStopDesk: false,
        stationCode: '',
        stationName: '',
        isExchange: false,
        state: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (id) fetchOrderDetails();
    }, [id]);

    const fetchOrderDetails = async () => {
        setLoadingOrder(true);
        try {
            const orders = await getOrders();
            const order = orders.find(o => o.rowId == id);
            if (order) {
                setOrderData({
                    reference: order.reference,
                    client: order.client,
                    phone: order.phone,
                    phone2: order.phone2 || '',
                    address: order.address,
                    wilaya: order.wilaya,
                    commune: order.isStopDesk ? '' : (order.commune || ''),
                    amount: order.amount,
                    product: order.product || '',
                    note: order.note || '',
                    isStopDesk: order.isStopDesk,
                    stationCode: order.isStopDesk ? (order.stationCode || '') : '',
                    stationName: order.isStopDesk ? order.address : '',
                    isExchange: order.isExchange,
                    state: order.state,
                    date: order.date
                });
            } else {
                toast.error("Commande introuvable");
                if (onBack) onBack();
                else navigate('/commandes');
            }
        } catch (error) {
            console.error("Failed to fetch order details", error);
            toast.error("Erreur de chargement de la commande");
        } finally {
            setLoadingOrder(false);
        }
    };

    const availableCommunes = useMemo(() => {
        if (!orderData.wilaya) return [];
        return communes.filter(c => c.wilaya_id === parseInt(orderData.wilaya));
    }, [orderData.wilaya, communes]);

    const availableStations = useMemo(() => {
        if (!orderData.wilaya) return [];
        return stations.filter(s => s.code.toString().startsWith(orderData.wilaya.toString()));
    }, [orderData.wilaya, stations]);

    // --- PERMISSIONS LOGIC ---
    const currentState = (orderData.state || '').toLowerCase();
    const isSystem = currentState.includes('envoyer') || currentState.includes('system');
    const isCancelled = currentState.includes('annuler');
    const isFreelyEditable = !isSystem && !isCancelled;
    const canEditFields = isFreelyEditable;
    const canEditState = isFreelyEditable || isCancelled || isSystem;

    // Helpers for Combobox updates
    const updateField = (name, value) => {
        handleInputChange({ target: { name, value, type: 'text' } }); // Mock event for existing handler
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        // Phone validation: only numbers, max 10 digits
        if ((name === 'phone' || name === 'phone2') && canEditFields) {
            if (!/^\d*$/.test(val)) return;
            if (val.length > 10) return;
        }

        setOrderData(prev => {
            const updated = { ...prev, [name]: val };

            if (name === 'isStopDesk') {
                // If switching to Domicile (unchecked), clear everything related to location/station
                if (val === false) {
                    updated.commune = '';
                    updated.address = '';
                    updated.stationCode = '';
                    updated.stationName = '';
                } else {
                    // If switching to Stop Desk, also clear address/commune to force selection
                    updated.commune = '';
                    updated.address = '';
                }
            }

            if (name === 'wilaya') {
                updated.commune = '';
                updated.stationCode = '';
                updated.stationName = '';
            }
            if (name === 'stationCode') {
                const station = stations.find(s => s.code === val);
                updated.stationName = station ? station.name : '';
            }
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (orderData.isStopDesk && !orderData.stationCode) {
            toast.error("Veuillez sélectionner un bureau Stop Desk");
            return;
        }

        if (!orderData.isStopDesk && !orderData.commune) {
            toast.error("Veuillez sélectionner une commune");
            return;
        }

        setSubmitting(true);
        try {
            await updateOrder(id, orderData);
            toast.success("Commande modifiée avec succès !");
            if (onBack) onBack();
            else navigate('/commandes');
        } catch (error) {
            console.error("Failed to update order", error);
            toast.error("Erreur lors de la modification");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingRef || loadingOrder) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Chargement...</div>;
    }

    return (
        <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack || (() => navigate('/commandes'))} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-700">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Save className="w-5 h-5 text-orange-600" /> Modifier Commande
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    {isSystem && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-200 text-slate-600 text-xs font-bold border border-slate-300">
                            <Lock className="w-3 h-3" /> Système (Champs Verrouillés)
                        </span>
                    )}
                    {isCancelled && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold border border-red-200">
                            <AlertTriangle className="w-3 h-3" /> Annulée (Restreint)
                        </span>
                    )}
                </div>
            </div>

            <div className="p-8">
                {isSystem && (
                    <div className="mb-6 p-4 bg-blue-50 text-blue-900 rounded-xl border border-blue-200 flex items-start gap-3">
                        <Lock className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <div className="font-bold text-sm">Modification Restreinte</div>
                            <div className="text-xs mt-1 text-blue-700 leading-relaxed">
                                Cette commande est en cours de traitement (État: Envoyer).
                                Les détails sont verrouillés. Vous pouvez uniquement <strong>Annuler</strong> cette commande si nécessaire.
                            </div>
                        </div>
                    </div>
                )}

                {isCancelled && (
                    <div className="mb-6 p-4 bg-orange-50 text-orange-900 rounded-xl border border-orange-200 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <div className="font-bold text-sm">Mode Restauration</div>
                            <div className="text-xs mt-1 text-orange-800 leading-relaxed">
                                Cette commande est annulée. Les détails sont verrouillés.
                                Vous pouvez uniquement changer l'état (ex: repasser en <strong>Nouvelle</strong>) pour la réactiver.
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* STATE SELECTOR */}
                    <div className="lg:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">État Actuel</label>
                            <div className="font-bold text-slate-800 text-lg">{orderData.state}</div>
                        </div>
                        <div className="w-full md:w-1/3">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Changer l'état</label>
                            <select
                                name="state"
                                value={orderData.state}
                                onChange={handleInputChange}
                                disabled={!canEditState}
                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                            >
                                {isSystem ? (
                                    <>
                                        <option value={orderData.state}>{orderData.state} (Actuel)</option>
                                        <option value="Annuler">Annuler</option>
                                    </>
                                ) : isCancelled ? (
                                    <>
                                        <option value={orderData.state}>{orderData.state} (Actuel)</option>
                                        {availableStates.filter(s => !s.includes('Annuler')).map(state => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {availableStates.map(state => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Client */}
                    <div className="lg:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input required type="text" name="client" value={orderData.client} onChange={handleInputChange} disabled={!canEditFields}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="Nom complet" />
                        </div>
                    </div>

                    {/* Phone 1 */}
                    <div className="lg:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Téléphone 1</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input required type="text" name="phone" value={orderData.phone} onChange={handleInputChange} disabled={!canEditFields}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="05..." />
                        </div>
                    </div>

                    {/* Phone 2 */}
                    <div className="lg:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Téléphone 2 (Opt)</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input type="text" name="phone2" value={orderData.phone2} onChange={handleInputChange} disabled={!canEditFields}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="06..." />
                        </div>
                    </div>

                    {/* Wilaya */}
                    <div className={`space-y-1.5 ${orderData.isStopDesk ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
                        <Combobox
                            label="Wilaya"
                            options={wilayas.map(w => ({ value: w.code, label: `${w.code} - ${w.nom}` }))}
                            value={orderData.wilaya}
                            onChange={(val) => updateField('wilaya', val)}
                            disabled={!canEditFields}
                            placeholder="Sélectionner..."
                        />
                    </div>

                    {/* Commune OR Stop Desk Station */}
                    <div className={orderData.isStopDesk ? 'lg:col-span-2' : 'lg:col-span-1'}>
                        {!orderData.isStopDesk ? (
                            <div className="space-y-1.5">
                                <Combobox
                                    label="Commune"
                                    options={availableCommunes.map(c => ({ value: c.nom, label: c.nom }))}
                                    value={orderData.commune}
                                    onChange={(val) => updateField('commune', val)}
                                    disabled={!canEditFields || !orderData.wilaya}
                                    placeholder="Sélectionner..."
                                />
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1"><Truck className="w-3 h-3" /> Bureau Stop Desk</label>
                                <select required name="stationCode" value={orderData.stationCode} onChange={handleInputChange} disabled={!canEditFields || !orderData.wilaya}
                                    className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none font-medium">
                                    <option value="">Choisir une station...</option>
                                    {availableStations.length > 0 ? (
                                        availableStations.map((s, idx) => (
                                            <option key={idx} value={s.code}>{s.code} - {s.name}</option>
                                        ))
                                    ) : (
                                        <option disabled>Aucune station trouvée</option>
                                    )}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Address (Only for Domicile) */}
                    {!orderData.isStopDesk && (
                        <div className="lg:col-span-2 space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adresse</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input required type="text" name="address" value={orderData.address} onChange={handleInputChange} disabled={!canEditFields}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    placeholder="Adresse de livraison" />
                            </div>
                        </div>
                    )}

                    {/* Amount */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Montant (DA)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input required type="number" name="amount" value={orderData.amount} onChange={handleInputChange} disabled={!canEditFields}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="0" />
                        </div>
                    </div>

                    {/* Product */}
                    <div className="lg:col-span-3 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produit</label>
                        <input required type="text" name="product" value={orderData.product} onChange={handleInputChange} disabled={!canEditFields}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder="Détails du produit..." />
                    </div>

                    {/* Note */}
                    <div className="lg:col-span-4 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remarque (Optionnel)</label>
                        <input type="text" name="note" value={orderData.note} onChange={handleInputChange} disabled={!canEditFields}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder="Instructions de livraison, note particulière..." />
                    </div>

                    {/* Flags */}
                    <div className="lg:col-span-4 flex gap-6">
                        <label className={`flex items-center gap-2 ${!canEditFields ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input type="checkbox" name="isExchange" checked={orderData.isExchange} onChange={handleInputChange} disabled={!canEditFields} className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500 disabled:cursor-not-allowed" />
                            <span className="text-sm font-medium text-slate-700">Échange</span>
                        </label>
                        <label className={`flex items-center gap-2 ${!canEditFields ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input type="checkbox" name="isStopDesk" checked={orderData.isStopDesk} onChange={handleInputChange} disabled={!canEditFields} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed" />
                            <span className="text-sm font-medium text-slate-700">Stop Desk</span>
                        </label>
                    </div>

                    {/* Submit */}
                    <div className="lg:col-span-4 pt-2">
                        <button
                            type="submit"
                            disabled={submitting || loadingRef}
                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? 'Enregistrement...' : <>ENREGISTRER LES MODIFICATIONS</>}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}

export default EditOrderPage;
