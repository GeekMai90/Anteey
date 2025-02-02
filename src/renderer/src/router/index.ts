import { createRouter, createWebHashHistory, RouteLocationNormalized } from 'vue-router'

const routes = [
  // {
  //   path: '/',
  //   redirect: '/timeblock'
  // },
  {
    name: 'home',
    path: '/home',
    component: () => import('../views/HomeView.vue'),
    meta: { keepAlive: true }
  },
  {
    name: 'timeline',
    path: '/timeline',
    component: () => import('../views/TimelineView.vue'),
    meta: { keepAlive: true }
  },
  {
    name: 'cardbox',
    path: '/cardbox',
    component: () => import('../views/CardBoxView.vue'),
    // 添加子路由用于处理不同的筛选场景
    children: [
      {
        name: 'cardboxAll',
        path: '', // 默认子路由，显示所有卡片
        component: () => import('../views/CardBoxView.vue')
      },
      {
        name: 'cardboxFlashcard',
        path: 'flashcard', // 闪卡筛选
        component: () => import('../views/CardBoxView.vue')
      },
      {
        name: 'cardboxBox',
        path: 'box/:boxId', // 特定卡片盒
        component: () => import('../views/CardBoxView.vue')
      },
      {
        name: 'cardboxTag',
        path: 'tag/:tagId', // 特定标签
        component: () => import('../views/CardBoxView.vue')
      },
      {
        name: 'cardboxType',
        path: 'type/:type', // 特定类型
        component: () => import('../views/CardBoxView.vue')
      },
      {
        name: 'cardboxInbox',
        path: 'inbox', // 收件箱
        component: () => import('../views/CardBoxView.vue')
      }
    ],
    // 添加 props 配置，允许路由参数传递到组件
    props: (route: RouteLocationNormalized) => ({
      // 将查询参数转换为组件 props
      boxId: route.params.boxId || route.query.box,
      tagId: route.params.tagId || route.query.tag,
      type: route.params.type || route.query.type,
      keyword: route.query.keyword,
      sort: route.query.sort,
      order: route.query.order,
      isFlashcard: route.query.isFlashcard === 'true' ? true : undefined, // 只有明确设置为 'true' 时才筛选闪卡
      page: parseInt(route.query.page as string) || 1
    })
  },
  {
    name: 'NoteExpandEditor',
    path: '/note/:id?',
    component: () => import('../views/NoteExpandEditor.vue')
  },
  {
    name: 'TrashView',
    path: '/trash',
    component: () => import('../views/TrashView.vue')
  },
  // 添加临时路由用于清除缓存
  {
    name: 'temp',
    path: '/temp',
    component: () => import('../components/common/EmptyComponent.vue'),
    meta: { keepAlive: false }
  },
  {
    path: '/knowledge-tree',
    name: 'KnowledgeTree',
    component: () => import('../views/KnowledgeTree.vue'),
    children: [
      {
        path: 'node/:address', // 使用 address 作为参数
        name: 'KnowledgeTreeNode',
        component: () => import('../views/KnowledgeTree.vue')
      }
    ]
  },
  {
    name: 'timeBlock',
    path: '/timeblock/:date?',
    component: () => import('../views/TimeBlockView.vue'),
    props: true,
    meta: { keepAlive: true }
  },
  {
    name: 'AIAssistant',
    path: '/ai-assistant',
    component: () => import('../views/AIAssistant.vue')
  },
  {
    name: 'FlashcardView',
    path: '/flashcard',
    component: () => import('../views/FlashcardView.vue'),
    meta: { keepAlive: true }
  },
  {
    name: 'DraftsView',
    path: '/drafts',
    component: () => import('../views/DraftsView.vue')
  },
  {
    name: 'EdWhiteboardView',
    path: '/ed-whiteboard',
    component: () => import('../views/EdWhiteboardView.vue')
  },
  {
    path: '/ed-whiteboard/:id',
    name: 'EdWhiteboardDetail',
    component: () => import('@renderer/components/edWhiteboard/EdWhiteboardDetail.vue')
  },
  {
    name: 'DictionaryManage',
    path: '/dictionary-manage',
    component: () => import('../views/DictionaryManageView.vue')
  },
  {
    name: 'MindboardView',
    path: '/mindboard', // 思维板
    component: () => import('../views/MindboardView.vue')
  },
  {
    name: 'MindboardDetail',
    path: '/mindboard/:id',
    component: () => import('../components/mindboard/MindboardDetail.vue')
  },
  {
    name: 'UITest',
    path: '/ui-test',
    component: () => import('../components/ui/UITest.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 添加路由导航守卫，用于处理从其他页面的跳转
router.beforeEach((to, _from, next) => {
  // 处理从标签树的跳转
  if (to.name === 'cardbox' && to.query.tag) {
    next({
      name: 'cardboxTag',
      params: { tagId: to.query.tag as string },
      query: { ...to.query }
    })
    return
  }

  // 处理从卡片盒列表的跳转
  if (to.name === 'cardbox' && to.query.box) {
    next({
      name: 'cardboxBox',
      params: { boxId: to.query.box as string },
      query: { ...to.query }
    })
    return
  }

  // 处理闪卡筛选的跳转
  if (to.name === 'cardbox' && to.query.isFlashcard === 'true') {
    next({
      name: 'cardboxFlashcard',
      query: { ...to.query }
    })
    return
  }

  // 如果没有匹配到任何特殊情况，则正常导航
  next()
})

// 添加错误处理
router.onError((error) => {
  console.error('Router error:', error)
  // 可以在这里添加全局的错误处理逻辑
})

export default router
