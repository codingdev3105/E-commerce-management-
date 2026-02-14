import { useState, useEffect, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useUI } from '../context/UIContext';
import { BarChart, ShoppingBag, Truck, Activity, XCircle, CheckCircle, RefreshCw } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    BarChart as RechartsBarChart, Bar
} from 'recharts';

function StatisticsPage() {
    const { orders, fetchOrders, loading } = useAppData();
    const { toast } = useUI();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchOrders(); // This will use cached data if available
    }, [fetchOrders]);

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

        const totalOrders = orders.length;

        // New Logic: Delivery and Return Rates (Case insensitive check)
        const deliveredCount = orders.filter(o => (o.state || '').toLowerCase().includes('livré')).length;
        const returnCount = orders.filter(o => (o.state || '').toLowerCase().includes('retour')).length;
        const exchangeCount = orders.filter(o => o.isExchange).length;

        // 1. Daily Evolution Data (Normalized Date)
        const dailyMap = orders.reduce((acc, o) => {
            // Normalize date to ignore time
            let date = o.date ? o.date.split('T')[0].split(' ')[0] : 'Inconnu';

            if (!acc[date]) acc[date] = { date, count: 0, revenue: 0 };
            acc[date].count += 1;
            acc[date].revenue += (Number(o.amount) || 0); // Keep revenue for chart if needed, or remove
            return acc;
        }, {});
        const dailyData = Object.values(dailyMap).sort((a, b) => new Date(a.date) - new Date(b.date));

        // 2. Status Breakdown Data
        const statusMap = orders.reduce((acc, o) => {
            const s = o.state || 'Inconnu';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});
        const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

        // Updated Colors
        const STATUS_COLORS = {
            'nouvelle': '#3b82f6', // Blue
            'atelier': '#a855f7',  // Purple
            'envoyer': '#f97316',  // Orange
            'system': '#f97316',   // Orange
            'annuler': '#ef4444',  // Red
            'retour': '#ef4444',   // Red
            'livrée': '#10b981',   // Emerald (Green)
            'livree': '#10b981',
            'default': '#cbd5e1'   // Gray
        };

        const getColor = (status) => {
            const key = (status || '').toLowerCase();
            // Partial match check
            if (key.includes('nouvelle')) return STATUS_COLORS['nouvelle'];
            if (key.includes('atelier')) return STATUS_COLORS['atelier'];
            if (key.includes('envoyer') || key.includes('system')) return STATUS_COLORS['envoyer'];
            if (key.includes('annuler')) return STATUS_COLORS['annuler'];
            if (key.includes('retour')) return STATUS_COLORS['retour'];
            if (key.includes('livr')) return STATUS_COLORS['livrée'];

            return STATUS_COLORS['default'];
        };

        // 3. Wilaya Distribution Data
        const wilayaMap = orders.reduce((acc, o) => {
            const w = o.wilaya || '?';
            acc[w] = (acc[w] || 0) + 1;
            return acc;
        }, {});
        const wilayaData = Object.entries(wilayaMap)
            .map(([name, value]) => ({ name: `Wilaya ${name}`, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10

        return {
            totalOrders,
            deliveredCount,
            returnCount,
            exchangeCount,
            deliveryRate: totalOrders ? ((deliveredCount / totalOrders) * 100).toFixed(1) : 0,
            returnRate: totalOrders ? ((returnCount / totalOrders) * 100).toFixed(1) : 0,
            dailyData,
            statusData,
            wilayaData,
            getColor // Expose helper
        };
    }, [orders]);

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Orders */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Total Commandes</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.totalOrders}</div>
                    </div>
                </div>

                {/* Delivery Rate */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Taux Livrées</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.deliveryRate}%</div>
                        <div className="text-xs text-slate-400">{stats.deliveredCount} commandes</div>
                    </div>
                </div>

                {/* Return Rate */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                        <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Taux Retour</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.returnRate}%</div>
                        <div className="text-xs text-slate-400">{stats.returnCount} commandes</div>
                    </div>
                </div>

                {/* Exchanges */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                        <BarChart className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Échanges</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.exchangeCount}</div>
                    </div>
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
                                    outerRadius={100}
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

                {/* Wilaya Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Top 10 Wilayas</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart
                                layout="vertical"
                                data={stats.wilayaData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} name="Commandes" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

        </div>
    );
}

export default StatisticsPage;
