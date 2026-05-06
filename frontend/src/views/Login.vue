<template>
  <div class="login-wrap">
    <div class="login-card">
      <h1>登录</h1>
      <p class="hint">索评邮件管理控制台 · 使用 Django 后台账号登录</p>
      <form @submit.prevent="submit">
        <label>用户名</label>
        <input v-model="username" type="text" autocomplete="username" required class="input-elegant" />
        <label>密码</label>
        <input v-model="password" type="password" autocomplete="current-password" required class="input-elegant" />
        <p v-if="error" class="err">{{ error }}</p>
        <button type="submit" class="btn btn-primary login-btn" :disabled="loading">
          {{ loading ? '登录中…' : '进入控制台' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiFetch, ensureCsrf } from '../api'

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()
const route = useRoute()

onMounted(() => {
  ensureCsrf()
})

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await ensureCsrf()
    const res = await apiFetch('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value.trim(),
        password: password.value,
      }),
    })
    let data = {}
    try {
      data = await res.json()
    } catch (_) {
      /* ignore */
    }
    if (!res.ok) {
      error.value = data.error || `登录失败（HTTP ${res.status}）`
      return
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect || '/')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 32px;
  box-shadow: var(--shadow-md);
}
.login-card h1 {
  font-size: 1.35rem;
  margin-bottom: 8px;
}
.hint {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 24px;
  line-height: 1.5;
}
form label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 8px;
  margin-top: 14px;
}
form label:first-of-type {
  margin-top: 0;
}
.err {
  color: var(--danger);
  font-size: 0.85rem;
  margin-top: 12px;
}
.login-btn {
  width: 100%;
  margin-top: 24px;
  padding: 10px 16px;
}
</style>
