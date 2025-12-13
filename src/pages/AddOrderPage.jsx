import { useState, useMemo, useEffect } from 'react';
import { createOrder, getOrders } from '../services/api';
import { Plus, MapPin, Phone, User, Package, DollarSign, Truck } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useAppData } from '../context/AppDataContext';
import Combobox from '../components/Combobox';

function AddOrderPage() {
    const { toast } = useUI();
    const { wilayas, communes, desks: stations, loading: loadingRef } = useAppData();

    const [newOrder, setNewOrder] = useState({
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
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchLastReference = async () => {
            try {
                const orders = await getOrders();
                if (orders && orders.length > 0) {
                    // Assuming the latest order is at the end
                    const lastOrder = orders[orders.length - 1];
                    const lastRef = lastOrder.reference || '';

                    // Try to extract number
                    const match = lastRef.match(/(\d+)$/);
                    if (match) {
                        const numberPart = match[1];
                        const prefix = lastRef.substring(0, match.index);
                        const nextNumber = parseInt(numberPart, 10) + 1;
                        // Keep same padding
                        const paddedNumber = nextNumber.toString().padStart(numberPart.length, '0');
                        setNewOrder(prev => ({ ...prev, reference: `${prefix}${paddedNumber}` }));
                    } else {
                        // Fallback
                        setNewOrder(prev => ({ ...prev, reference: `${lastRef}-1` }));
                    }
                } else {
                    // Default start
                    setNewOrder(prev => ({ ...prev, reference: '0001' }));
                }
            } catch (error) {
                console.error("Failed to fetch orders for reference generation", error);
            }
        };

        fetchLastReference();
    }, []);


    const availableCommunes = useMemo(() => {
        if (!newOrder.wilaya) return [];
        // Noest commune matches wilaya_id
        return communes.filter(c => c.wilaya_id === parseInt(newOrder.wilaya));
    }, [newOrder.wilaya, communes]);

    const availableStations = useMemo(() => {
        if (!newOrder.wilaya) return [];
        // Noest station code (e.g., '1A') starts with wilaya code (e.g., '1')
        // Using string comparison because desk codes are strings
        return stations.filter(s => s.code.toString().startsWith(newOrder.wilaya.toString()));
    }, [newOrder.wilaya, stations]);

    // Helpers for Combobox updates
    const updateField = (name, value) => {
        handleInputChange({ target: { name, value, type: 'text' } }); // Mock event for existing handler
    };


    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        // Phone validation: only numbers, max 10 digits
        if (name === 'phone' || name === 'phone2') {
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
                const station = stations.find(s => s.code === val);
                if (station) {
                    // Extract name inside « » if present (e.g. Alger « Centre » -> Centre), otherwise use full name
                    const match = station.name.match(/«\s*(.*?)\s*»/);
                    updated.stationName = match ? match[1] : station.name;
                } else {
                    updated.stationName = '';
                }
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
            setNewOrder(prev => {
                // Calculate next reference from the one just submitted
                const lastRef = prev.reference;
                let nextRef = '';
                const match = lastRef.match(/(\d+)$/);
                if (match) {
                    const numberPart = match[1];
                    const prefix = lastRef.substring(0, match.index);
                    const nextNumber = parseInt(numberPart, 10) + 1;
                    nextRef = `${prefix}${nextNumber.toString().padStart(numberPart.length, '0')}`;
                } else {
                    nextRef = `${lastRef}-1`;
                }

                return {
                    reference: nextRef,
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
                    reference: nextRef,
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
                };
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

                    {/* Client */}
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
                    {/* Phone 1 */}
                    <div className="lg:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Téléphone 1</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input required type="text" name="phone" value={newOrder.phone} onChange={handleInputChange}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                                placeholder="05..." />
                        </div>
                    </div>
                    {/* Phone 2 */}
                    <div className="lg:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Téléphone 2 (Opt)</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input type="text" name="phone2" value={newOrder.phone2} onChange={handleInputChange}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                                placeholder="06..." />
                        </div>
                    </div>
                    {/* Wilaya */}
                    <div className={`space-y-1.5 ${newOrder.isStopDesk ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
                        <Combobox
                            label="Wilaya"
                            options={wilayas.map(w => ({ value: w.code, label: `${w.code} - ${w.nom}` }))}
                            value={newOrder.wilaya}
                            onChange={(val) => updateField('wilaya', val)}
                            placeholder="Sélectionner..."
                        />
                    </div>

                    {/* Commune OR Stop Desk Station */}
                    <div className={newOrder.isStopDesk ? 'lg:col-span-2' : 'lg:col-span-1'}>
                        {!newOrder.isStopDesk ? (
                            <div className="space-y-1.5">
                                <Combobox
                                    label="Commune"
                                    options={availableCommunes.map(c => ({ value: c.nom, label: c.nom }))}
                                    value={newOrder.commune}
                                    onChange={(val) => updateField('commune', val)}
                                    disabled={!newOrder.wilaya}
                                    placeholder="Sélectionner..."
                                />
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1"><Truck className="w-3 h-3" /> Bureau Stop Desk</label>
                                <select required name="stationCode" value={newOrder.stationCode} onChange={handleInputChange} disabled={!newOrder.wilaya}
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
                    {!newOrder.isStopDesk && (
                        <div className="lg:col-span-2 space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adresse</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input required type="text" name="address" value={newOrder.address} onChange={handleInputChange}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Adresse de livraison" />
                            </div>
                        </div>
                    )}

                    {/* Line 3: Product, Amount, Note, Button */}
                    {/* Product */}
                    <div className="lg:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produit</label>
                        <input required type="text" name="product" value={newOrder.product} onChange={handleInputChange}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Produit..." />
                    </div>
                    {/* Amount */}
                    <div className="lg:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Montant</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input required type="number" name="amount" value={newOrder.amount} onChange={handleInputChange}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono font-medium"
                                placeholder="0" />
                        </div>
                    </div>
                    {/* Note */}
                    <div className="lg:col-span-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remarque</label>
                        <input type="text" name="note" value={newOrder.note} onChange={handleInputChange}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Note..." />
                    </div>
                    {/* Submit Button */}
                    <div className="lg:col-span-1 flex items-end">
                        <button type="submit" disabled={submitting || loadingRef}
                            className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-[42px]">
                            {submitting ? '...' : <>CONFIRMER</>}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}

export default AddOrderPage;
