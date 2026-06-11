<template>
  <div id="app">
    <!-- 未登录显示登录页 -->
    <div v-if="!isLoggedIn" class="login-page">
      <div class="login-box">
        <h2>💰 极速兔礼品卡</h2>
        <p>后台管理系统</p>
        <input v-model="email" type="email" placeholder="邮箱" />
        <input v-model="password" type="password" placeholder="密码" />
        <button @click="handleLogin" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>
    <!-- 已登录显示管理页 -->
    <PriceManagement v-else />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import PriceManagement from './components/PriceManagement.vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const isLoggedIn = computed(() => auth.isLoggedIn)

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value)
  } catch (e) {
    error.value = '邮箱或密码错误'
  } finally {
    loading.value = false
  }
}

auth.restore()
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f5f7fa;
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  width: 360px;
  text-align: center;
}

.login-box h2 { font-size: 22px; margin-bottom: 6px; }
.login-box p { color: #909399; margin-bottom: 24px; font-size: 14px; }

.login-box input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  outline: none;
}

.login-box button {
  width: 100%;
  padding: 10px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  margin-top: 4px;
}

.login-box button:disabled { opacity: 0.6; }
.error { color: #f56c6c; margin-top: 10px; font-size: 13px; }
</style>