<template>
  <div class="price-management">
    <!-- 左侧树形菜单 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <span>💰 价格管理</span>
        <el-button size="small" type="primary" text @click="showAddCategory = true">
          <el-icon><Plus /></el-icon> 新增分类
        </el-button>
      </div>

      <el-scrollbar height="calc(100vh - 120px)">
        <el-tree
          ref="treeRef"
          :data="categoryTree"
          :props="{ label: 'name', children: 'children' }"
          node-key="id"
          highlight-current
          default-expand-all
          @node-click="onNodeClick"
        >
          <template #default="{ node, data }">
            <div class="tree-node">
              <el-icon v-if="!data.children?.length" class="node-icon"><GiftCard /></el-icon>
              <el-icon v-else class="node-icon"><Folder /></el-icon>
              <span class="node-label">{{ node.label }}</span>
              <div class="node-actions" @click.stop>
                <el-button size="small" text @click="onAddCard(data)" v-if="data.children !== undefined">
                  <el-icon><Plus /></el-icon>
                </el-button>
                <el-button size="small" text type="danger" @click="onDeleteCategory(data)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
        </el-tree>
      </el-scrollbar>
    </div>

    <!-- 右侧详情 -->
    <div class="content">
      <!-- 未选择时的占位 -->
      <div v-if="!selectedCard" class="empty-state">
        <el-icon size="64" color="#ccc"><GiftCard /></el-icon>
        <p>请在左侧选择一张礼品卡</p>
      </div>

      <!-- 礼品卡详情 -->
      <template v-else>
        <div class="content-header">
          <img v-if="selectedCard.icon_url" :src="selectedCard.icon_url" class="card-icon" />
          <div v-else class="card-avatar">{{ selectedCard.name.slice(0, 2) }}</div>
          <div>
            <h2>{{ selectedCard.name }}</h2>
            <p class="sub">
              {{ selectedCard.country_code }} · {{ selectedCard.currency }} /
              来源：{{ selectedCard.source_country }} · {{ selectedCard.source_currency }}
            </p>
          </div>
          <div class="header-actions">
            <el-switch v-model="selectedCard.is_active" @change="toggleActive" active-text="上架" inactive-text="下架" />
            <el-button type="danger" size="small" @click="onDeleteCard">删除</el-button>
          </div>
        </div>

        <el-tabs v-model="activeTab">
          <!-- 国家设置 -->
          <el-tab-pane label="🌍 国家设置" name="country">
            <div class="tab-section">
              <el-tag
                v-for="c in selectedCard.countries"
                :key="c"
                closable
                @close="removeCountry(c)"
                style="margin: 4px"
              >{{ c }}</el-tag>
            </div>
            <div class="add-row">
              <el-select v-model="newCountry" filterable placeholder="搜索添加国家，如：日本、美国..." style="flex:1">
                <el-option v-for="c in countriesList" :key="c.code" :label="c.name" :value="c.code" />
              </el-select>
              <el-button type="primary" @click="addCountry">+ 添加</el-button>
            </div>
          </el-tab-pane>

          <!-- 面值列表 -->
          <el-tab-pane label="💰 面值列表" name="denomination">
            <div class="tab-section">
              <el-tag
                v-for="d in selectedCard.card_denominations"
                :key="d.id"
                closable
                @close="removeDenomination(d.id)"
                style="margin: 4px"
              >${{ d.amount }}</el-tag>
            </div>
            <div class="add-row">
              <el-input v-model="newDenom" placeholder="如：75" style="flex:1" />
              <el-button type="primary" @click="addDenomination">+ 添加</el-button>
            </div>
          </el-tab-pane>

          <!-- 汇率设置 -->
          <el-tab-pane label="📈 汇率设置" name="rate">
            <el-table :data="selectedCard.exchange_rates" border size="small">
              <el-table-column prop="from_currency" label="来源货币" width="120" />
              <el-table-column prop="to_currency" label="目标货币" width="120" />
              <el-table-column prop="rate" label="汇率" />
              <el-table-column label="隐藏" width="80">
                <template #default="{ row }">
                  <el-switch v-model="row.is_hidden" @change="updateRate(row)" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ row }">
                  <el-button size="small" type="danger" text @click="deleteRate(row.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <!-- 其他配置 -->
          <el-tab-pane label="⚙️ 其他配置" name="other">
            <el-form label-width="120px" style="max-width: 500px; margin-top: 16px">
              <el-form-item label="排序">
                <el-input-number v-model="selectedCard.sort_order" :min="0" />
              </el-form-item>
              <el-form-item label="图标URL">
                <el-input v-model="selectedCard.icon_url" placeholder="https://..." />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveCard">保存配置</el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </template>
    </div>

    <!-- 新增分类对话框 -->
    <el-dialog v-model="showAddCategory" title="新增分类" width="400px">
      <el-form :model="newCategoryForm" label-width="80px">
        <el-form-item label="分类名称">
          <el-input v-model="newCategoryForm.name" placeholder="如：快速礼品卡" />
        </el-form-item>
        <el-form-item label="上级分类">
          <el-select v-model="newCategoryForm.parent_id" clearable placeholder="不选则为顶级分类">
            <el-option v-for="c in flatCategories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddCategory = false">取消</el-button>
        <el-button type="primary" @click="createCategory">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Delete, Folder } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const API = import.meta.env.VITE_API_BASE || '/.netlify/functions'

// 状态
const categoryTree = ref([])
const flatCategories = ref([])
const selectedCard = ref(null)
const activeTab = ref('country')
const showAddCategory = ref(false)
const newCategoryForm = ref({ name: '', parent_id: null })
const newCountry = ref('')
const newDenom = ref('')

// 获取分类树
async function fetchCategories() {
  const res = await fetch(`${API}/categories`, {
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  const json = await res.json()
  categoryTree.value = json.data
  // 展平分类列表（用于下拉选择）
  flatCategories.value = flattenTree(json.data)
}

function flattenTree(nodes) {
  return nodes.flatMap(n => [n, ...flattenTree(n.children || [])])
}

// 点击节点
async function onNodeClick(data) {
  // 只有叶子节点（礼品卡）才显示详情
  if (data.children !== undefined) return

  const res = await fetch(`${API}/cards?id=${data.id}`, {
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  const json = await res.json()
  selectedCard.value = json.data
  activeTab.value = 'country'
}

// 新增分类
async function createCategory() {
  if (!newCategoryForm.value.name) return ElMessage.error('请输入分类名称')
  await fetch(`${API}/categories`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(newCategoryForm.value)
  })
  showAddCategory.value = false
  newCategoryForm.value = { name: '', parent_id: null }
  ElMessage.success('分类创建成功')
  fetchCategories()
}

// 删除分类
async function onDeleteCategory(data) {
  await ElMessageBox.confirm(`确定删除分类「${data.name}」吗？`, '警告', { type: 'warning' })
  await fetch(`${API}/categories?id=${data.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  ElMessage.success('删除成功')
  fetchCategories()
}

// 保存礼品卡配置
async function saveCard() {
  await fetch(`${API}/cards?id=${selectedCard.value.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(selectedCard.value)
  })
  ElMessage.success('保存成功')
}

// 切换上下架
async function toggleActive() {
  await saveCard()
}

// 删除礼品卡
async function onDeleteCard() {
  await ElMessageBox.confirm(`确定删除「${selectedCard.value.name}」吗？`, '警告', { type: 'warning' })
  await fetch(`${API}/cards?id=${selectedCard.value.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${auth.token}` }
  })
  selectedCard.value = null
  ElMessage.success('删除成功')
  fetchCategories()
}

onMounted(fetchCategories)
</script>

<style scoped>
.price-management {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  min-width: 240px;
  border-right: 1px solid #e4e7ed;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  font-weight: 600;
  border-bottom: 1px solid #e4e7ed;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.node-label {
  flex: 1;
  font-size: 13px;
}

.node-actions {
  display: none;
}

.tree-node:hover .node-actions {
  display: flex;
}

.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.content-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.card-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #1a1a2e;
  color: #00d4aa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.sub {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.tab-section {
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  min-height: 60px;
}

.add-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60%;
  color: #c0c4cc;
  gap: 12px;
}
</style>
