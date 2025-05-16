<template>
  <node-view-wrapper :class="['bullet-task', `bullet-task--${node.attrs.status}`]">
    <span class="bullet-icon" contenteditable="false" @click.stop="toggleStatus">
      <span class="icon-inner">{{ getStatusIcon }}</span>
    </span>
    <node-view-content class="bullet-content" />
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'

const props = defineProps<NodeViewProps>()

const getStatusIcon = computed(() => {
  switch (props.node.attrs.status) {
    case 'pending':
      return '◯'
    case 'completed':
      return '✓'
    case 'abandoned':
      return '×'
    case 'migrated':
      return '→'
    case 'scheduled':
      return '←'
    default:
      return '◯'
  }
})

const toggleStatus = () => {
  console.log('Toggling status...')
  props.editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      if (!dispatch) return false

      const node = tr.doc.nodeAt(props.getPos())
      if (!node) return false

      const statuses = ['pending', 'completed', 'migrated', 'scheduled', 'abandoned']
      const currentStatus = node.attrs.status || 'pending'
      const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length]

      tr.setNodeMarkup(props.getPos(), undefined, {
        ...node.attrs,
        status: nextStatus
      })

      dispatch(tr)
      return true
    })
    .run()
}
</script>

<style lang="scss" scoped>
.bullet-task {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
  padding: 0.2em 0;
  line-height: 1.5;
  position: relative;

  .bullet-icon {
    flex-shrink: 0;
    width: 1.5em;
    height: 1.5em;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.2s ease;
    font-size: 0.9em;
    line-height: 1;
    transform: scale(1.1);
    position: absolute;
    left: 0;
    margin-top: 0.15em;

    .icon-inner {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &:hover {
      transform: scale(1.2);
    }
  }

  .bullet-content {
    flex: 1;
    min-width: 0;
    line-height: inherit;
    padding: 0.1em 0;
    margin-left: 2em;
  }

  &--pending {
    .bullet-icon {
      color: var(--color-text-secondary);
      background-color: rgba(var(--color-text-secondary), 0.1);

      .icon-inner {
        transform: translateY(-0.05em);
      }

      &:hover {
        color: var(--color-primary);
        background-color: rgba(var(--color-primary-rgb), 0.15);
      }
    }
  }

  &--completed {
    color: var(--color-text-secondary);

    .bullet-icon {
      color: var(--color-success);
      background-color: rgba(var(--color-success-rgb), 0.15);

      &:hover {
        background-color: rgba(var(--color-success-rgb), 0.25);
      }
    }

    .bullet-content {
      text-decoration: line-through;
      opacity: 0.7;
    }
  }

  &--migrated {
    .bullet-icon {
      color: var(--color-blue);
      background-color: rgba(var(--color-blue-rgb), 0.15);

      &:hover {
        background-color: rgba(var(--color-blue-rgb), 0.25);
      }
    }
  }

  &--scheduled {
    .bullet-icon {
      color: var(--color-warning);
      background-color: rgba(var(--color-warning-rgb), 0.15);

      &:hover {
        background-color: rgba(var(--color-warning-rgb), 0.25);
      }
    }
  }

  &--abandoned {
    color: var(--color-text-secondary);

    .bullet-icon {
      color: var(--color-danger);
      background-color: rgba(var(--color-danger-rgb), 0.15);

      .icon-inner {
        transform: translateY(-0.1em);
      }

      &:hover {
        background-color: rgba(var(--color-danger-rgb), 0.25);
      }
    }

    .bullet-content {
      opacity: 0.6;
      text-decoration: line-through;
    }
  }
}
</style>
