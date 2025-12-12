import { createContext, useContext, useState, useEffect } from 'react';
import { getValidationRules } from '../services/api';

const StatesContext = createContext();

export const useStates = () => {
    const context = useContext(StatesContext);
    if (!context) {
        throw new Error('useStates must be used within a StatesProvider');
    }
    return context;
};

export const StatesProvider = ({ children }) => {
    const [availableStates, setAvailableStates] = useState(['Nouvelle', 'Atelier', 'Annuler']); // Default fallback
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStates();
    }, []);

    const fetchStates = async () => {
        try {
            const role = localStorage.getItem('role');
            const result = await getValidationRules('A'); 

            // Extract states from validation rules
            if (result?.validationRules?.condition?.values) {
                const states = result.validationRules.condition.values.map(v => v.userEnteredValue);
                setAvailableStates(states); 
            }
        } catch (error) {
            console.error("Failed to fetch validation rules", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <StatesContext.Provider value={{ availableStates, loading, refreshStates: fetchStates }}>
            {children}
        </StatesContext.Provider>
    );
};
