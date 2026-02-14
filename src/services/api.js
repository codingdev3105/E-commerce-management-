import axios from 'axios';

// API configuration 
// 'http://localhost:3001/api' , import.meta.env.VITE_API_URL
// Use environment variable if available, otherwise fallback to localhost for dev

const baseURL = import.meta.env.VITE_API_URL;
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

export const getValidationRules = async (column) => {
    const response = await api.get(`/commandes/validation/${column}`);
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
    console.log(response.data);
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

export const getNoestFees = async (wilayaId) => {
    const params = wilayaId ? { wilaya_id: wilayaId } : {};
    const response = await api.get('/noest/fees', { params });
    return response.data;
};

export const updateMessageStatus = async (id, status = 'OUI') => {
    const response = await api.put(`/commandes/${id}/message-status`, { status });
    return response.data;
};




const s = [
    "N5J-35C-14456661",
    "N5J-35C-14456689",
    "N5J-35C-14456692",
    "N5J-35C-14456697",
    "N5J-35C-14478912",
    "N5J-35C-14480909",
    "N5J-35C-14481464",
    "N5J-35C-14515012",
    "N5J-35C-14519926",
    "N5J-35C-14519928",
    "N5J-35C-14519929",
    "N5J-35C-14519930",
    "N5J-35C-14519932",
    "N5J-35C-14519933",
    "N5J-35C-14519934",
    "N5J-35C-14519935",
    "N5J-35C-14519937",
    "N5J-35C-14519938",
    "N5J-35C-14544574",
    "N5J-35C-14544585",
    "N5J-35C-14544589",
    "N5J-35C-14544590",
    "N5J-35C-14544591",
    "N5J-35C-14544594",
    "N5J-35C-14544595",
    "N5J-35C-14544599",
    "N5J-35C-14544604",
    "N5J-35C-14544608",
    "N5J-35C-14552235",
    "N5J-35C-14552236",
    "N5J-35C-14585263",
    "N5J-35D-14585229",
    "N5J-35D-14585230",
    "N5J-35D-14585231",
    "N5J-35D-14585232",
    "N5J-35D-14585234",
    "N5J-35D-14585236",
    "N5J-35D-14585237",
    "N5J-35D-14585238",
    "N5J-35D-14585239",
    "N5J-35D-14585240",
    "N5J-35D-14585241",
    "N5J-35D-14585242",
    "N5J-35D-14585243",
    "N5J-35D-14585244",
    "N5J-35D-14585245",
    "N5J-35D-14585246",
    "N5J-35D-14585247",
    "N5J-35D-14585248",
    "N5J-35D-14585249",
    "N5J-35D-14585250",
    "N5J-35D-14585251",
    "N5J-35D-14585252",
    "N5J-35D-14585253",
    "N5J-35D-14585254",
    "N5J-35D-14585255",
    "N5J-35D-14585256",
    "N5J-35D-14585257",
    "N5J-35D-14585258",
    "N5J-35D-14585259",
    "N5J-35D-14585260",
    "N5J-35D-14585261",
    "N5J-35D-14585262",
    "N5J-35D-14586304",
    "N5J-35D-14611173",
    "N5J-35D-14611195",
    "N5J-35D-14614735",
    "N5J-35C-14344908",
    "N5J-35C-14416378",
    "N5J-35C-14416384",
    "N5J-35C-14416396",
    "N5J-35C-14421928",
    "N5J-35C-14426593",
    "N5J-35C-14440416",
    "N5J-35C-14456662",
    "N5J-35C-14456681",
    "N5J-35C-14456682",
    "N5J-35C-14456683",
    "N5J-35C-14456684",
    "N5J-35C-14456685",
    "N5J-35C-14456686",
    "N5J-35C-14456687",
    "N5J-35C-14456688",
    "N5J-35C-14456690",
    "N5J-35C-14456691",
    "N5J-35C-14456693",
    "N5J-35C-14456694",
    "N5J-35C-14456695",
    "N5J-35C-14456696",
    "N5J-35C-14456698",
    "N5J-35C-14456699",
    "N5J-35C-14468443",
    "N5J-35C-14468452",
    "N5J-35C-14478920",
    "N5J-35C-14478925",
    "N5J-35C-14478927",
    "N5J-35C-14478932",
    "N5J-35C-14478950",
    "N5J-35C-14480910",
    "N5J-35C-14492481",
    "N5J-35C-14510773",
    "N5J-35C-14519927",
    "N5J-35C-14519931",
    "N5J-35C-14519936"
]





export default api;
