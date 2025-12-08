import { useState, useEffect, useMemo } from 'react';
import { createOrder, getReferences } from '../services/api';
import { Plus, MapPin, Phone, User, Package, DollarSign, Truck } from 'lucide-react';
import { useUI } from '../context/UIContext';

function AddOrderPage() {
    const { toast } = useUI();
    const [refData, setRefData] = useState({ wilayas: [], communes: [], stations: [] });
    const [loadingRef, setLoadingRef] = useState(true);

    const [newOrder, setNewOrder] = useState({
        reference: '',
        client: '',
        phone: '',
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
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchReferences();
    }, []);

    const fetchReferences = async () => {
        setLoadingRef(true);
        try {
            const data = await getReferences();
            setRefData(data);
        } catch (error) {
            console.error('Failed to fetch references', error);
        } finally {
            setLoadingRef(false);
        }
    };

    const availableCommunes = useMemo(() => {
        if (!newOrder.wilaya) return [];
        return refData.communes.filter(c => c.wilaya_code === newOrder.wilaya);
    }, [newOrder.wilaya, refData.communes]);

    const availableStations = useMemo(() => {
        if (!newOrder.wilaya) return [];
        return refData.stations.filter(s => s.code.toString().startsWith(newOrder.wilaya));
    }, [newOrder.wilaya, refData.stations]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        // Phone validation: exactly 10 digits starting with 0
        // Phone validation: only numbers, max 10 digits
        if (name === 'phone') {
            if (!/^\d*$/.test(val)) return;
            if (val.length > 10) return;
        }

        setNewOrder(prev => {
            const updated = { ...prev, [name]: val };
            if (name === 'wilaya') {
                updated.commune = '';
                updated.stationCode = '';
                updated.stationName = '';
            }
            if (name === 'stationCode') {
                const station = refData.stations.find(s => s.code === val);
                updated.stationName = station ? station.name : '';
            }
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createOrder(newOrder);
            toast.success('Commande ajoutée avec succès !');
            setNewOrder({
                reference: '',
                client: '',
                phone: '',
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
            });
        } catch (error) {
            console.error('Failed to create order', error);
            toast.error('Erreur lors de l\'ajout');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex flex-col gap-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" /> Nouvelle Commande
                </h2>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                        <input type="checkbox" name="isExchange" checked={newOrder.isExchange} onChange={handleInputChange} className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500" />
                        <span className={`text-sm font-medium ${newOrder.isExchange ? 'text-orange-600' : 'text-slate-600'}`}>Échange</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                        <input type="checkbox" name="isStopDesk" checked={newOrder.isStopDesk} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className={`text-sm font-medium ${newOrder.isStopDesk ? 'text-blue-600' : 'text-slate-600'}`}>Stop Desk</span>
                    </label>
                </div>
            </div>
            <div className="p-8">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Reference */}
                    <div className="lg:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Référence</label>
                        <div className="relative">
                            <Package className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input required type="text" name="reference" value={newOrder.reference} onChange={handleInputChange}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                                placeholder="CMD-..." />
                        </div>
                    </div>
                    {/* Client */}
                    <div className="lg:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input required type="text" name="client" value={newOrder.client} onChange={handleInputChange}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                                placeholder="Nom complet" />
                        </div>
                    </div>
                    {/* Phone */}
                    <div className="lg:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Téléphone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input required type="text" name="phone" value={newOrder.phone} onChange={handleInputChange}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                                placeholder="05..." />
                        </div>
                    </div>
                    {/* Wilaya */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Wilaya</label>
                        <select required name="wilaya" value={newOrder.wilaya} onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none">
                            <option value="">Sélectionner...</option>
                            {refData.wilayas.map(w => (
                                <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                            ))}
                        </select>
                    </div>
                    {/* Commune & Address (if not Stop Desk) */}
                    {!newOrder.isStopDesk && (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Commune</label>
                                <select required name="commune" value={newOrder.commune} onChange={handleInputChange} disabled={!newOrder.wilaya}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50">
                                    <option value="">Sélectionner...</option>
                                    {availableCommunes.map((c, idx) => (
                                        <option key={idx} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="lg:col-span-2 space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adresse</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <input required type="text" name="address" value={newOrder.address} onChange={handleInputChange}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="Adresse de livraison" />
                                </div>
                            </div>
                        </>
                    )}
                    {/* Amount */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Montant (DA)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input required type="number" name="amount" value={newOrder.amount} onChange={handleInputChange}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono font-medium"
                                placeholder="0" />
                        </div>
                    </div>
                    {/* Product */}
                    <div className="lg:col-span-3 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produit</label>
                        <input type="text" name="product" value={newOrder.product} onChange={handleInputChange}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Détails du produit..." />
                    </div>
                    {/* Note */}
                    <div className="lg:col-span-4 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remarque (Optionnel)</label>
                        <input type="text" name="note" value={newOrder.note} onChange={handleInputChange}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Instructions de livraison, note particulière..." />
                    </div>
                    {/* Stop Desk Station */}
                    {newOrder.isStopDesk && (
                        <div className="lg:col-span-4 bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-4">
                            <div className="bg-blue-200 p-2 rounded-lg text-blue-700"><Truck className="w-5 h-5" /></div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Bureau Stop Desk ({newOrder.wilaya ? `Wilaya ${newOrder.wilaya}` : '...'})</label>
                                <select required name="stationCode" value={newOrder.stationCode} onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-blue-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">Choisir une station...</option>
                                    {availableStations.length > 0 ? (
                                        availableStations.map((s, idx) => (
                                            <option key={idx} value={s.code}>{s.code} - {s.name}</option>
                                        ))
                                    ) : (
                                        <option disabled>Aucune station trouvée pour cette wilaya</option>
                                    )}
                                </select>
                            </div>
                        </div>
                    )}
                    {/* Submit */}
                    <div className="lg:col-span-4 pt-2">
                        <button type="submit" disabled={submitting || loadingRef}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {submitting ? 'Traitement en cours...' : <>CONFIRMER LA COMMANDE</>}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}

export default AddOrderPage;
