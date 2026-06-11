// src/stores/auth.js
// 用户认证 Store（使用 Supabase Auth）

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')

  const isLoggedIn = computed(() => !!user.value)

  // 登录
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)

    user.value = data.user
    token.value = data.session.access_token
    localStorage.setItem('token', token.value)
    return data
  }

  // 登出
  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
  }

  // 恢复登录状态
  async function restore() {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      user.value = data.session.user
      token.value = data.session.access_token
      localStorage.setItem('token', token.value)
    }
  }

  return { user, token, isLoggedIn, login, logout, restore }
})
