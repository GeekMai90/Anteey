import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Agent, CreateAgentParams, UpdateAgentParams } from '@shared/types'
import { useEventBus } from '@vueuse/core'
import { useUIStore } from '@renderer/stores/UIStore'
import { useAssistantStore } from '@renderer/stores/assistantStore'
import { Robot } from '@icon-park/vue-next'
import { markRaw } from 'vue'

export const useAgentStore = defineStore('agent', () => {
  // ==================== 状态 ====================
  const agents = ref<Agent[]>([])
  const currentAgent = ref<Agent | null>(null)
  const agentSearchQuery = ref('')
  const isAgentModalOpen = ref(false)
  const menuAgents = ref<Agent[]>([])
  const nonMenuAgents = ref<Agent[]>([])

  // ==================== 操作方法 ====================
  // 获取所有 Agents
  const fetchAllAgents = async () => {
    try {
      const fetchedAgents = await window.electronAPI.agent.getAllAgents()
      agents.value = fetchedAgents
      return fetchedAgents
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
    return JSON.parse(JSON.stringify(data))
  }

  // 创建新 Agent
  const createAgent = async (params: CreateAgentParams) => {
    try {
      const serializedParams = serializeAgentData(params)
      const newAgent = await window.electronAPI.agent.createAgent(serializedParams)
      await refreshAgents()
      return newAgent
    } catch (error) {
      console.error('创建Agent失败:', error)
      throw error
    }
  }

  // 更新 Agent
  const updateAgent = async (id: string, updateData: UpdateAgentParams) => {
    try {
      const serializedData = serializeAgentData(updateData)
      const updatedAgent = await window.electronAPI.agent.updateAgent(id, serializedData)
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
      label: agent.name,
      icon: markRaw(Robot),
      action: async () => {
        console.log('执行Agent菜单动作:', {
          agentId: agent.id,
          agentName: agent.name,
          noteId
        })

        const uiStore = useUIStore()
        const assistantStore = useAssistantStore()

        try {
          // 设置当前活跃的 Agent
          setCurrentAgent(agent)

          // 1. 打开右侧边栏的 AI 助手
          console.log('打开右侧边栏 AI 助手')
          uiStore.openRightSidebarWithTab('assistant')

          // 2. 清空当前对话并切换到聊一聊模式
          console.log('清空当前对话并切换到聊一聊模式')
          assistantStore.clearMessages()
          assistantStore.setDefaultMode('chat')

          // 3. 执行 Agent 对话
          console.log('开始执行 Agent 对话:', {
            agentId: agent.id,
            noteId,
            systemPrompt: agent.systemPrompt,
            temperature: agent.temperature
          })

          return await assistantStore.handleAgentChat({
            agentId: agent.id,
            noteId
          })
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
    generateAgentMenuItems
  }
})
