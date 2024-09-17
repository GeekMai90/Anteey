import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    name: 'timeline',
    path: '/',
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
  history: createWebHistory(),
  routes
})

export default router
