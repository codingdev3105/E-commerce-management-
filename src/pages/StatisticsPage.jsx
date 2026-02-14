import { useState, useEffect, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useUI } from '../context/UIContext';
import { BarChart, ShoppingBag, Truck, Activity, XCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { STATUS_COLORS } from '../pages/common/orderUtils';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    BarChart as RechartsBarChart, Bar
} from 'recharts';

function StatisticsPage() {
    const { orders, fetchOrders, fetchLocationsData, loading, fees } = useAppData();
    const { toast } = useUI();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchOrders();
        fetchLocationsData(); // Ensure fees are loaded
    }, [fetchOrders, fetchLocationsData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchOrders(true); // Force refresh
            toast.success("Données actualisées !");
        } catch (error) {
            toast.error("Erreur lors de l'actualisation.");
        } finally {
            setIsRefreshing(false);
        }
    };

    const stats = useMemo(() => {
        if (!orders.length) return null;

        // Filter out cancelled orders for all calculations
        const nonCancelledOrders = orders.filter(o =>
            !(o.state || '').toLowerCase().includes('annul')
        );

        const totalOrders = nonCancelledOrders.length;

        let totalLivreRevenue = 0, livreCount = 0;
        let totalEnLivraisonRevenue = 0, enLivraisonCount = 0;
        let totalEnPreparationRevenue = 0, enPreparationCount = 0;
        let totalRetourRevenue = 0, retourCount = 0;

        nonCancelledOrders.forEach(o => {
            const state = (o.state || '').toLowerCase();
            const amount = Number(o.amount) || 0;
            // delivery_fee calculation based on wilaya and type
            const wilayaCode = String(o.wilaya);
            const wilayaFees = (fees?.tarifs?.delivery && fees.tarifs.delivery[wilayaCode])
                ? fees.tarifs.delivery[wilayaCode]
                : {};

            const fee = o.isStopDesk
                ? (Number(wilayaFees.tarif_stopdesk) || 0)
                : (Number(wilayaFees.tarif) || 0);

            const netAmount = amount - fee;
            console.log(netAmount)
            if (state.includes('livré') || state.includes('finance')) {
                totalLivreRevenue += netAmount;
                livreCount++;
            } else if (['en livraison', 'en traitement', 'suspendu', 'en hub'].some(s => state.includes(s))) {
                totalEnLivraisonRevenue += netAmount;
                enLivraisonCount++;
            } else if (['nouvelle', 'atelier', 'upload'].some(s => state.includes(s))) {
                totalEnPreparationRevenue += netAmount;
                enPreparationCount++;
            } else if (state.includes('retour')) {
                totalRetourRevenue += netAmount;
                retourCount++;
            }
        });

        // 1. Daily Evolution Data (Using non-cancelled orders)
        const dailyMap = nonCancelledOrders.reduce((acc, o) => {
            let date = o.date ? o.date.split('T')[0].split(' ')[0] : 'Inconnu';
            if (!acc[date]) acc[date] = { date, count: 0 };
            acc[date].count += 1;
            return acc;
        }, {});
        const dailyData = Object.values(dailyMap).sort((a, b) => new Date(a.date) - new Date(b.date));

        // 2. Status Breakdown Data (For Pie Chart)
        const statusMap = nonCancelledOrders.reduce((acc, o) => {
            const s = o.state || 'Inconnu';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});
        const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

        // 3. Price Distribution (Net Amount)
        const priceMap = nonCancelledOrders.reduce((acc, o) => {
            const amount = Number(o.amount) || 0;
            const wilayaCode = String(o.wilaya);
            const wilayaFees = (fees?.tarifs?.delivery && fees.tarifs.delivery[wilayaCode])
                ? fees.tarifs.delivery[wilayaCode]
                : {};
            const fee = o.isStopDesk ? (Number(wilayaFees.tarif_stopdesk) || 0) : (Number(wilayaFees.tarif) || 0);
            const netPrice = amount - fee;

            if (netPrice > 0) {
                acc[netPrice] = (acc[netPrice] || 0) + 1;
            }
            return acc;
        }, {});

        const priceData = Object.entries(priceMap)
            .map(([price, count]) => ({ price: Number(price), count }))
            .sort((a, b) => b.count - a.count); // Removed .slice(0, 10)

        const STATUS_COLORS = {
            'Nouvelle': '#bfe1f6',
            'Atelier': '#e6cff2',
            'Finance': '#11734b',
            'En traitement': '#ff904f',
            'Annuler': '#fffd12',
            'Retour': '#ff0000',
            'livré': '#10b981',
            'En livraison': '#4898fe',
            'En Hub': '#4898fe',
            'Upload': '#ffbb83',
            'Suspendu': '#ff8991',
        };

        const getColor = (status) => {
            const key = (status || '').toLowerCase();
            if (key.includes('nouvelle')) return STATUS_COLORS['Nouvelle'];
            if (key.includes('atelier')) return STATUS_COLORS['Atelier'];
            if (key.includes('finance')) return STATUS_COLORS['Finance'];
            if (key.includes('traitement')) return STATUS_COLORS['En traitement'];
            if (key.includes('annul')) return STATUS_COLORS['Annuler'];
            if (key.includes('retour')) return STATUS_COLORS['Retour'];
            if (key.includes('livraison')) return STATUS_COLORS['En livraison'];
            if (key.includes('livr')) return STATUS_COLORS['livré'];
            if (key.includes('hub')) return STATUS_COLORS['En Hub'];
            if (key.includes('upload')) return STATUS_COLORS['Upload'];
            if (key.includes('suspendu') || key.includes('suspondu')) return STATUS_COLORS['Suspendu'];
            return '#cbd5e1'; // Couleur par défaut
        };

        return {
            totalOrders,
            livreCount,
            enLivraisonCount,
            enPreparationCount,
            retourCount,
            totalLivreRevenue,
            totalEnLivraisonRevenue,
            totalEnPreparationRevenue,
            totalRetourRevenue,
            deliveryRate: totalOrders ? ((livreCount / totalOrders) * 100).toFixed(1) : 0,
            dailyData,
            statusData,
            priceData,
            getColor
        };
    }, [orders, fees]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Chargement des statistiques...</div>;
    }

    if (!stats) {
        return <div className="p-8 text-center text-slate-500">Aucune donnée disponible.</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-600" /> Tableau de Bord
                    </h2>
                    <p className="text-slate-500 mt-1">Vue d'ensemble et analytique détaillée</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || loading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                    <span className="font-medium text-sm">Actualiser</span>
                </button>
            </div>

            {/* KPI Grid */}
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Orders */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Total (Hors Annulées)</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.totalOrders}</div>
                    </div>
                </div>

                {/* Livré & Finance */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Livrées & Finance</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.livreCount}</div>
                        <div className="text-xs font-bold" style={{ color: '#10b981' }}>{stats.totalLivreRevenue.toLocaleString()} DA <span className="text-[10px] text-slate-400 font-normal ml-1">Net</span></div>
                    </div>
                </div>

                {/* En Livraison Group */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#4898fe20', color: '#4898fe' }}>
                        <Truck className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">En Livraison</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.enLivraisonCount}</div>
                        <div className="text-xs font-bold" style={{ color: '#4898fe' }}>{stats.totalEnLivraisonRevenue.toLocaleString()} DA <span className="text-[10px] text-slate-400 font-normal ml-1">Net</span></div>
                    </div>
                </div>

                {/* Retour */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#ff000020', color: '#ff0000' }}>
                        <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Retours</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.retourCount}</div>
                        <div className="text-xs font-bold" style={{ color: '#ff0000' }}>{stats.totalRetourRevenue.toLocaleString()} DA <span className="text-[10px] text-slate-400 font-normal ml-1">Net</span></div>
                    </div>
                </div>
            </div>

            {/* Preparation Card (Extra row) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#bfe1f6', color: '#1e40af' }}>
                        <BarChart className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">En Préparation</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.enPreparationCount}</div>
                        <div className="text-xs font-bold text-blue-800">{stats.totalEnPreparationRevenue.toLocaleString()} DA <span className="text-[10px] text-slate-400 font-normal ml-1">Net</span></div>
                    </div>
                </div>

                {/* Delivery Rate Summary */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white md:col-span-1">
                    <div className="text-sm font-medium opacity-80">Taux de Livraison Global</div>
                    <div className="text-3xl font-bold mt-1">{stats.deliveryRate}%</div>
                    <div className="text-xs mt-2 opacity-70">Basé sur les commandes traitées</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Daily Evolution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Évolution Journalière des Commandes</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" name="Commandes" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Répartition par État</h3>
                    <div className="h-[300px] w-full flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={stats.getColor(entry.name)} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Price Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Distribution des Prix Nets (DA)</h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {stats.priceData.length > 0 ? (
                            stats.priceData.map((item, index) => {
                                const maxCount = stats.priceData[0].count;
                                const percentage = (item.count / maxCount) * 100;
                                return (
                                    <div key={index} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-bold text-slate-700">{item.price.toLocaleString()} DA</span>
                                            <span className="text-slate-500">{item.count} commandes</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center text-slate-400 py-8">Aucune donnée de prix</div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}

export default StatisticsPage;
