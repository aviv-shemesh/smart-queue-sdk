import axios from 'axios'

const BASE_URL = 'http://localhost:8000/api/v1'

let adminSecret = ''

export function setAdminSecret(secret) {
  adminSecret = secret
}

export function clearAdminSecret() {
  adminSecret = ''
}

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  if (adminSecret) config.headers['X-Admin-Secret'] = adminSecret
  return config
})

export default api
