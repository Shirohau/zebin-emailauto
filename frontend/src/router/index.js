import { createRouter, createWebHistory } from 'vue-router'
import { apiFetch, ensureCsrf } from '../api'

import Login from '../views/Login.vue'
import ConsoleView from '../views/ConsoleView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login, meta: { public: true } },
    { path: '/', name: 'console', component: ConsoleView },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.public) return true
  await ensureCsrf()
  const res = await apiFetch('/api/auth/me/')
  if (!res.ok) return { name: 'login', query: { redirect: to.fullPath } }
  const data = await res.json()
  if (!data.authenticated) return { name: 'login', query: { redirect: to.fullPath } }
  return true
})

export default router
