import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api')
});

export async function getProducts(params = {}) {
  const { data } = await api.get('/products', { params });
  if (!data || !Array.isArray(data.products)) {
    throw new Error('Products API returned an invalid response. Configure VITE_API_URL for the deployed backend.');
  }
  return data;
}
