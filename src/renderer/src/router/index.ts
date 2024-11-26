import { createRouter, createWebHashHistory, RouteLocationNormalized } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
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
    name: 'aiAssistant',
    path: '/aiassistant',
    component: () => import('../views/AIAssistant.vue'),
    meta: { keepAlive: true }
  },
  {
    name: 'dictionaryManage',
    path: '/dictionary/manage',
    component: () => import('../views/DictionaryManageView.vue'),
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
      page: parseInt(route.query.page as string) || 1
    })
  },
  {
    name: 'whiteboard',
    path: '/whiteboard',
    component: () => import('../views/WhiteboardView.vue'),
    meta: { keepAlive: false }
  },
  {
    name: 'whiteboardDetail',
    path: '/whiteboard/:whiteboardId', // 修改路径，保持一致性
    component: () => import('../components/whiteboard/WhiteboardDetail.vue'),
    props: true, // 添加 props
    meta: {
      keepAlive: false,
      parent: 'whiteboard' // 添加父级关系
    }
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
    name: 'knowledgeTree',
    path: '/knowledge-tree',
    component: () => import('../components/knowledge/KnowledgeTree.vue')
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

  next()
})

// 添加错误处理
router.onError((error) => {
  console.error('Router error:', error)
  // 可以在这里添加全局的错误处理逻辑
})

export default router
