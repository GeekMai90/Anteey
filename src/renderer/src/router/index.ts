import { createRouter, createWebHashHistory } from 'vue-router'

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
    name: 'cardbox',
    path: '/cardbox',
    component: () => import('../views/CardBoxView.vue'),
    meta: { keepAlive: true }
  },
  {
    name: 'whiteboard',
    path: '/whiteboard',
    component: () => import('../views/WhiteboardView.vue'),
    meta: { keepAlive: false }
  },
  // {
  //   name: 'whiteboardDetail',
  //   path: '/whiteboarddetail/:whiteboardId',
  //   component: () => import('../components/WhiteboardDetail.vue')
  // },
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
  {
    name: 'MainCard',
    path: '/maincard',
    component: () => import('../views/MainCard.vue'),
    meta: { keepAlive: true }
  },
  {
    name: 'BibCard',
    path: '/bibcard',
    component: () => import('../views/BibCard.vue'),
    meta: { keepAlive: true }
  },
  {
    name: 'IndexCard',
    path: '/indexcard',
    component: () => import('../views/IndexCard.vue'),
    meta: { keepAlive: true }
  },
  // 添加临时路由用于清除缓存
  {
    name: 'temp',
    path: '/temp',
    component: () => import('../components/common/EmptyComponent.vue'),
    meta: { keepAlive: false }
  },
  {
    name: 'canvas',
    path: '/canvas',
    component: () => import('../components/canvas/CanvasDetail.vue')
  }
  // {
  //   name: 'canvasDetail',
  //   path: '/canvas/:id',
  //   component: () => import('../components/canvas/CanvasDetail.vue')
  // }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 添加全局导航守卫进行调试
router.beforeEach((to, from, next) => {
  console.log('Route change:', {
    from: { name: from.name, params: from.params },
    to: { name: to.name, params: to.params }
  })
  next()
})

// 添加错误处理
router.onError((error) => {
  console.error('Router error:', error)
  // 可以在这里添加全局的错误处理逻辑
})

export default router
