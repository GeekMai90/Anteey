import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Agent, CreateAgentParams, UpdateAgentParams } from '@shared/types'
import { useEventBus } from '@vueuse/core'
import { useUIStore } from '@renderer/stores/UIStore'
import { RobotOne } from '@icon-park/vue-next'
import { markRaw } from 'vue'
import { useAIChatStore } from '@renderer/stores/aiChatStore'
import { useModelConfigStore } from '@renderer/stores/modelConfigStore'
import { useNoteStore } from '@renderer/stores/noteStore'

export const useAgentStore = defineStore('agent', () => {
  // ==================== 状态 ====================
  const agents = ref<Agent[]>([])
  const currentAgent = ref<Agent | null>(null)
  const agentSearchQuery = ref('')
  const isAgentModalOpen = ref(false)
  const menuAgents = ref<Agent[]>([])
  const nonMenuAgents = ref<Agent[]>([])
  const aiChatStore = useAIChatStore()
  const modelConfigStore = useModelConfigStore()
  const noteStore = useNoteStore()
  // ==================== 操作方法 ====================
  // 获取所有 Agents
  const fetchAllAgents = async () => {
    try {
      // 确保模型配置已加载
      if (modelConfigStore.configs.length === 0) {
        await modelConfigStore.loadConfigs()
      }

      const fetchedAgents = await window.electronAPI.agent.getAllAgents()
      // 确保每个 agent 的数据都是完整的
      agents.value = fetchedAgents.map((agent) => ({
        ...agent,
        description: agent.description || '',
        greeting: agent.greeting || '',
        includeNoteContext: agent.includeNoteContext ?? true,
        temperature: agent.temperature ?? 0.7
      }))
      return agents.value
    } catch (error) {
      console.error('获取所有Agent失败:', error)
      throw error
    }
  }

  // 获取菜单中显示的 Agents
  const fetchMenuAgents = async () => {
    try {
      const fetchedAgents = await window.electronAPI.agent.getMenuAgents()
      menuAgents.value = fetchedAgents
      return fetchedAgents
    } catch (error) {
      console.error('获取菜单Agent失败:', error)
      throw error
    }
  }

  // 获取不在菜单中显示的 Agents
  const fetchNonMenuAgents = async () => {
    try {
      const fetchedAgents = await window.electronAPI.agent.getNonMenuAgents()
      nonMenuAgents.value = fetchedAgents
      return fetchedAgents
    } catch (error) {
      console.error('获取非菜单Agent失败:', error)
      throw error
    }
  }

  // 添加一个辅助函数来序列化数据
  const serializeAgentData = (data: any) => {
    // 确保所有必需字段都存在
    if (!data.name || !data.modelConfigId || !data.systemPrompt) {
      throw new Error('缺少必需的字段：name、modelConfigId 或 systemPrompt')
    }

    const serialized = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      greeting: data.greeting?.trim() || null,
      systemPrompt: data.systemPrompt.trim(),
      modelConfigId: data.modelConfigId,
      includeNoteContext: data.includeNoteContext ?? true,
      temperature: data.temperature ?? 0.7
    }

    // 验证数据有效性
    if (serialized.name.length === 0) {
      throw new Error('助手名称不能为空')
    }
    if (serialized.systemPrompt.length === 0) {
      throw new Error('系统提示词不能为空')
    }

    return JSON.parse(JSON.stringify(serialized))
  }

  // 创建新 Agent
  const createAgent = async (params: CreateAgentParams) => {
    try {
      // 确保模型配置已加载
      if (modelConfigStore.configs.length === 0) {
        await modelConfigStore.loadConfigs()
        await modelConfigStore.loadProviderPresets()
      }

      // 添加错误处理和日志
      console.log('Creating agent with params:', params)
      if (!params.modelConfigId) {
        throw new Error('模型配置ID不能为空')
      }

      const serializedParams = serializeAgentData(params)
      console.log('Serialized params:', serializedParams)

      const newAgent = await window.electronAPI.agent.createAgent(serializedParams)
      console.log('New agent created:', newAgent)

      // 刷新列表
      await refreshAgents()
      return newAgent
    } catch (error: unknown) {
      console.error('创建Agent失败:', error)
      // 抛出更具体的错误信息
      throw new Error(`创建AI助手失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 更新 Agent
  const updateAgent = async (id: string, updateData: UpdateAgentParams) => {
    try {
      const serializedData = serializeAgentData(updateData)
      const updatedAgent = await window.electronAPI.agent.updateAgent(id, serializedData)

      // 更新本地状态
      const index = agents.value.findIndex((a) => a.id === id)
      if (index !== -1) {
        agents.value[index] = updatedAgent
      }

      // 如果是当前选中的 agent，也更新它
      if (currentAgent.value?.id === id) {
        currentAgent.value = updatedAgent
      }

      await refreshAgents()
      return updatedAgent
    } catch (error) {
      console.error('更新Agent失败:', error)
      throw error
    }
  }

  // 删除 Agent
  const deleteAgent = async (id: string) => {
    try {
      await window.electronAPI.agent.deleteAgent(id)
      if (currentAgent.value?.id === id) {
        currentAgent.value = null
      }
      await refreshAgents()
    } catch (error) {
      console.error('删除Agent失败:', error)
      throw error
    }
  }

  // 搜索 Agents
  const searchAgents = async (query: string) => {
    try {
      agentSearchQuery.value = query
      if (!query.trim()) {
        return agents.value
      }
      return await window.electronAPI.agent.searchAgents(query)
    } catch (error) {
      console.error('搜索Agent失败:', error)
      throw error
    }
  }

  // 刷新所有 Agent 列表
  const refreshAgents = async () => {
    try {
      await Promise.all([fetchAllAgents(), fetchMenuAgents(), fetchNonMenuAgents()])
      // 发送 Agent 变更事件
      const agentChangeEventBus = useEventBus('agentChange')
      agentChangeEventBus.emit()
    } catch (error) {
      console.error('刷新Agent列表失败:', error)
      throw error
    }
  }

  // 模态框控制
  const openAgentModal = () => (isAgentModalOpen.value = true)
  const closeAgentModal = () => (isAgentModalOpen.value = false)

  // 设置当前活跃的 Agent
  const setCurrentAgent = (agent: Agent | null) => {
    console.log('设置当前活跃的 Agent:', agent)
    currentAgent.value = agent
  }

  // 修改 generateAgentMenuItems 方法
  const generateAgentMenuItems = (noteId: string) => {
    console.log('生成Agent菜单项 - noteId:', noteId)
    console.log('当前可用的Agents:', menuAgents.value)

    return menuAgents.value.map((agent) => ({
      key: agent.id,
      name: agent.name,
      label: agent.name,
      icon: markRaw(RobotOne),
      action: async () => {
        console.log('执行Agent菜单动作:', {
          agentId: agent.id,
          agentName: agent.name,
          noteId
        })

        const uiStore = useUIStore()

        try {
          // 设置当前活跃的 Agent
          setCurrentAgent(agent)
          // 设置当前笔记ID
          noteStore.setCurrentNoteId(noteId)

          // 1. 打开右侧边栏的 AI 助手
          console.log('打开右侧边栏 AI 助手')
          uiStore.openRightSidebarWithTab('assistant')

          // 2. 清空当前对话
          console.log('清空当前对话')
          aiChatStore.createNewConversation()

          // 3. 执行 Agent 对话
          console.log('开始执行 Agent 对话:', {
            agentId: agent.id,
            noteId,
            systemPrompt: agent.systemPrompt,
            temperature: agent.temperature
          })

          // 构建聊天请求
          const chatRequest = {
            query: '', // 初始查询为空，因为我们使用笔记内容作为上下文
            agentId: agent.id, // 使用当前 agent
            references: {
              noteIds: [noteId] // 将当前笔记作为引用
            }
          }

          // 发送聊天请求
          return await aiChatStore.sendChatRequest(chatRequest)
        } catch (error) {
          // 如果出错，清除当前 Agent
          setCurrentAgent(null)
          console.error('执行 Agent 对话失败:', error)
          throw error
        }
      }
    }))
  }

  // 清除当前活跃的 Agent
  const clearCurrentAgent = () => {
    console.log('清除当前活跃的 Agent')
    currentAgent.value = null
  }

  // 添加获取单个 Agent 的方法
  const getAgentById = async (id: string) => {
    try {
      const agent = agents.value.find((a) => a.id === id)
      if (agent) return agent

      // 如果本地没有，从数据库获取
      const fetchedAgent = await window.electronAPI.agent.getAgentById(id)
      return fetchedAgent
    } catch (error) {
      console.error('获取Agent失败:', error)
      throw error
    }
  }

  return {
    // 状态
    agents,
    currentAgent,
    agentSearchQuery,
    isAgentModalOpen,
    menuAgents,
    nonMenuAgents,

    // 方法
    fetchAllAgents,
    fetchMenuAgents,
    fetchNonMenuAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    searchAgents,
    refreshAgents,
    openAgentModal,
    closeAgentModal,
    setCurrentAgent,
    clearCurrentAgent,
    generateAgentMenuItems,
    getAgentById
  }
})
