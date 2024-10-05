import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    name: 'home',
    path: '/home',
    component: () => import('../views/HomeView.vue')
  },
  {
    name: 'timeline',
    path: '/timeline',
    component: () => import('../views/TimelineView.vue')
  },
  {
    name: 'cardbox',
    path: '/cardbox',
    component: () => import('../views/CardBoxView.vue')
  },
  {
    name: 'whiteboard',
    path: '/whiteboard',
    component: () => import('../views/WhiteboardView.vue')
  },
  {
    name: 'whiteboardDetail',
    path: '/whiteboarddetail/:whiteboardId',
    component: () => import('../components/WhiteboardDetail.vue')
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
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
