import React, { createContext, useContext, useState, useEffect } from 'react';
import { getNoestWilayas, getNoestCommunes, getNoestDesks } from '../services/api';

const AppDataContext = createContext();

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
        desks: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [wilayasData, communesData, desksData] = await Promise.all([
                    getNoestWilayas(),
                    getNoestCommunes(),
                    getNoestDesks()
                ]);

                // Normalize Desks if it's an object (Noest returns object { "1A": {...}, "1B": {...} })
                let desksArray = [];
                if (desksData && typeof desksData === 'object' && !Array.isArray(desksData)) {
                    desksArray = Object.values(desksData);
                } else if (Array.isArray(desksData)) {
                    desksArray = desksData;
                }

                setData({
                    wilayas: wilayasData || [],
                    communes: communesData || [],
                    desks: desksArray
                }); 
            } catch (error) {
                console.error('Error fetching global app data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <AppDataContext.Provider value={{ ...data, loading }}>
            {children}
        </AppDataContext.Provider>
    );
};
