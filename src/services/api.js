import axios from 'axios';


// API configuration
// Use environment variable if available, otherwise fallback to localhost for dev
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: baseURL,
});

// Add a request interceptor to inject the token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            window.location.href = '/'; // Force redirect to login
        }
        return Promise.reject(error);
    }
);

export const login = async (code) => {
    const response = await api.post('/login', { code });
    return response.data; // { token, role }
};

export const getOrders = async () => {
    const response = await api.get('/commandes');
    return response.data;
};

export const createOrder = async (orderData) => {
    const response = await api.post('/commandes', orderData);
    return response.data;
};

export const deleteOrder = async (id) => {
    const response = await api.delete(`/commandes/${id}`);
    return response.data;
};

export const updateOrder = async (id, orderData) => {
    const response = await api.put(`/commandes/${id}`, orderData);
    return response.data;
};

export const getReferences = async () => {
    const response = await api.get('/references');
    return response.data;
};

export const sendToNoest = async (rowId) => {
    const response = await api.post('/noest/send-from-sheet', { rowId });
    return response.data;
};

export const getNoestTrackingInfo = async (trackingsArray) => {
    const response = await api.post('/noest/trackings', { trackingsArray });
    return response.data;
};

export const getNoestDesks = async () => {
    const response = await api.get('/noest/desks'); 
    return response.data;
};

export const getNoestCommunes = async (wilayaId) => {
    const url = wilayaId ? `/noest/communes/${wilayaId}` : '/noest/communes';
    const response = await api.get(url);
    return response.data;
};

export const getNoestWilayas = async () => {
    const response = await api.get('/noest/wilayas');
    
    return response.data;
};

export default api;
