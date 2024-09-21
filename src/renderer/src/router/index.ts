import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    name: 'home',
    path: '/home',
    component: () => import('../views/TimelineView.vue')
  },
  {
    name: 'cardbox',
    path: '/cardbox',
    component: () => import('../views/CardBoxView.vue')
  },
  {
    name: 'mindboard',
    path: '/mindboard',
    component: () => import('../views/MindboardView.vue')
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
