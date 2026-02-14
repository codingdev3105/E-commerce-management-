import React, { createContext, useContext, useState } from 'react';
import { getNoestWilayas, getNoestCommunes, getNoestDesks, getNoestFees, getOrders } from '../services/api';

const AppDataContext = createContext();

// Utility to safely handle any data type for rendering and searching
const safeString = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        try {
            return JSON.stringify(val);
        } catch (e) {
            return "[Objet]";
        }
    }
    return String(val);
};

export const useAppData = () => {
    const context = useContext(AppDataContext);
    if (!context) {
        throw new Error('useAppData must be used within an AppDataProvider');
    }
    return context;
};

export const AppDataProvider = ({ children }) => {
    const [data, setData] = useState({
        wilayas: [],
        communes: [],
        desks: [],
        orders: [],
        fees: {}
    });
    const [loading, setLoading] = useState(false);

    // Lazy fetch function exposed to consumers
    const fetchLocationsData = async () => {
        // If data is already populated, don't re-fetch
        if (data.wilayas.length > 0) {
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            const [wilayasData, communesData, desksData, feesData] = await Promise.all([
                getNoestWilayas(),
                getNoestCommunes(),
                getNoestDesks(),
                getNoestFees()
            ]);

            // Normalize Desks if it's an object (Noest returns object { "1A": {...}, "1B": {...} })
            let desksArray = [];
            if (desksData && typeof desksData === 'object' && !Array.isArray(desksData)) {
                desksArray = Object.values(desksData);
            } else if (Array.isArray(desksData)) {
                desksArray = desksData;
            }

            setData(prev => ({
                ...prev,
                wilayas: wilayasData || [],
                communes: communesData || [],
                desks: desksArray,
                fees: feesData || {}
            }));
        } catch (error) {
            console.error('Error fetching global app data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async (force = false) => {
        // Lazy load: Don't fetch if data exists, unless forced
        if (!force && data.orders.length > 0) return;

        if (data.orders.length === 0) setLoading(true); // Prevent UI flash on refresh

        try {
            const rawOrders = await getOrders();
            // Data Normalization: Force fields to expected types early
            const normalized = (rawOrders || []).map(o => ({
                ...o,
                reference: safeString(o.reference),
                client: safeString(o.client),
                phone: safeString(o.phone),
                phone2: safeString(o.phone2),
                state: safeString(o.state || 'inconnu'),
                date: safeString(o.date),
                address: safeString(o.address),
                commune: safeString(o.commune),
                wilaya: safeString(o.wilaya),
                amount: safeString(o.amount),
                isStopDesk: !!o.isStopDesk,
                isExchange: !!o.isExchange
            }));

            setData(prev => ({ ...prev, orders: normalized }));
        } catch (error) {
            console.error("Failed to fetch orders", error);
        } finally {
            setLoading(false);
        }
    };

    const setOrders = (newOrdersOrFn) => {
        setData(prev => {
            const newOrders = typeof newOrdersOrFn === 'function' ? newOrdersOrFn(prev.orders) : newOrdersOrFn;
            return { ...prev, orders: newOrders };
        });
    };

    return (
        <AppDataContext.Provider value={{ ...data, loading, fetchLocationsData, fetchOrders, setOrders }}>
            {children}
        </AppDataContext.Provider>
    );
};
