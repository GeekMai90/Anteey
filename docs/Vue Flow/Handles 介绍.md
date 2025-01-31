# Handles 介绍

Handles 是通常放置在节点边框上的小圆圈。它们用于通过从一个 handle 拖动连接线到另一个 handle 来连接节点,从而在节点之间形成连接([Edge](https://vueflow.dev/guide/edge.html))。

Handles 是 VueFlow 的一个关键部分,因为它们是用户创建节点之间边的主要交互点。

没有 handles,基本上不可能在节点之间创建边,因为 handles 用于计算边的源点和目标点。

# `<Handle>` 组件

`<Handle>` 组件是由 `@vue-flow/core` 导出的一个组件,你可以用它来为节点创建一个 handle。它是一个 `<div>` 元素的包装器,提供了开始连接所需的必要事件处理程序绑定。

`<Handle>` 组件可以在(自定义)节点组件中使用来为节点创建 handles。在节点组件上下文之外使用 `<Handle>` 组件将无法按预期工作,所以尽量避免这样做。

```vue
<script setup>
import { Handle } from '@vue-flow/core'

defineProps(['id', 'sourcePosition', 'targetPosition', 'data'])
</script>

<template>
  <Handle type="source" :position="sourcePosition" />

  <span>{{ data.label }}</span>

  <Handle type="target" :position="targetPosition" />
</template>
```

# Handle 位置

Handles 可以放置在以下位置:

- `Top`
- `Right`
- `Bottom`
- `Left`

每个位置对应节点的一侧。handle 的位置也决定了从该 handle 绘制边时边将向哪个方向弯曲。

例如,`position="Position.Top"` 的 handle 在从该 handle 绘制时会产生一条向*上*弯曲的边。`position="Position.Right"` 的 handle 在绘制到该 handle 时会产生一条向*左*弯曲的边。

## 调整 Handle 位置

Handles 使用带有 `absolute` 定位的 CSS 定位在它们各自的一侧。这意味着你可以通过将其包装在具有 `relative` 定位的容器中来调整 handle 与哪个元素对齐。

```vue
<template>
  <div>
    <span>{{ data.label }}</span>

    <div style="position: relative; padding: 10px">
      <Handle type="source" :position="Position.Right" />

      <Handle type="target" :position="Position.Left" />
    </div>
  </div>
</template>
```

# 多个 Handles

一个节点可以有多个 handles,handles 的数量没有限制,你可以根据需要使用任意数量的 handles。当使用相同类型(`source` 或 `target`)的多个 handles 时,每个 handle 都需要有一个唯一的 id。

```vue
<!-- 由于我们使用了两个 `source` 类型的 handles,每个 handle 都需要一个唯一的 id -->
<Handle id="source-a" type="source" :position="Position.Right" />
<Handle id="source-b" type="source" :position="Position.Right" />

<!-- 由于我们使用了两个 `target` 类型的 handles,每个 handle 都需要一个唯一的 id -->
<Handle id="target-a" type="target" :position="Position.Left" />
<Handle id="target-b" type="target" :position="Position.Left" />
```

`id` 属性用于在节点之间创建边时标识 handle。如果没有提供 `id`,将使用必要类型的第一个 handle。

```ts
const { onConnect } = useVueFlow()

onConnect(({ source, target, sourceHandle, targetHandle }) => {
  console.log('source', source)
  console.log('target', target)
  // 这些是源节点和目标节点的 handle id
  // 如果没有指定 id,这些将是 `null`,意味着将使用必要类型的第一个 handle
  console.log('sourceHandle', sourceHandle)
  console.log('targetHandle', targetHandle)
})
```

## 多个 Handles 的定位

有时你想在同一侧添加多个 handles。在这种情况下,你经常会发现两个 handles 重叠在一起,而不是并排。Handles 不会自动布局,所以你需要手动调整它们的位置。

你可以使用 CSS 样式来实现。例如,你可以设置 `top` 和 `bottom` 属性来将 handles 定位在节点右侧的顶部和底部。

```vue
<Handle id="source-a" type="source" :position="Position.Right" style="top: 10px" />
<Handle id="source-b" type="source" :position="Position.Right" style="bottom: 10px; top: auto;" />
```

# 隐藏 Handles

在某些情况下,你可能不想显示 handle。你可以通过将该 handle 的样式设置为 `opacity: 0` 来隐藏它。

你不能通过从 DOM 中移除 handle(例如使用 `v-if` 或 `v-show`)来隐藏它,因为这会破坏边的计算。

```vue
<Handle type="source" :position="Position.Right" style="opacity: 0" />
```

# 限制连接

你可以通过在 `<Handle>` 组件上设置 `connectable` 属性来限制 handle 可以有的连接数量。

这个属性接受一个布尔值(默认为 `true`)、一个数字(最大连接数)或一个返回布尔值的函数。

使用函数允许你实现自定义逻辑来确定是否可以连接到 handle。

```vue
<script lang="ts" setup>
import { Position, Handle, type HandleConnectableFunc } from '@vue-flow/core'

const handleConnectable: HandleConnectableFunc = (node, connectedEdges) => {
  // 只允许节点有少于 3 个连接
  return connectedEdges.length < 3
}
</script>

<template>
  <Handle type="source" :position="Position.Right" :connectable="handleConnectable" />
</template>
```

# 连接模式

默认情况下,Vue Flow 将使用 `<VueFlow :connection-mode="ConnectionMode.Loose" />`,这允许你将边连接到任何 handle。这意味着允许在 `source` 和另一个 `source` 类型的 `<Handle>` 之间建立连接。

如果你想限制连接只能在 `source` 和 `target` 类型的 handles 之间建立,你可以将 `connection-mode` 属性设置为 `ConnectionMode.Strict`。

```vue
<script setup>
import { ConnectionMode, VueFlow } from '@vue-flow/core'
</script>

<template>
  <VueFlow :connection-mode="ConnectionMode.Strict" />
</template>
```

# 动态 Handle 位置和动态添加/删除 Handles

> 提示
>
> 在 Vue Flow 1.x 中,动态添加 handles 时不需要手动调用 `updateNodeInternals`。在挂载时,handles 会自动尝试附加到节点。但是,如果由于某种原因这不能按预期工作,你可以坚持使用下面提供的指南来强制 Vue Flow 更新节点内部。

有时,你可能需要动态修改 handle 位置或以编程方式向节点添加新的 handles。在这种情况下,Vue Flow API 中的 [`updateNodeInternals`](https://vueflow.dev/typedocs/type-aliases/UpdateNodeInternals.html) 方法就派上用场了。

处理动态 handles 时调用此方法至关重要。如果不这样做,节点可能无法识别这些新的 handles,导致边对齐错误。

`updateNodeInternals` 函数可以通过以下两种方式之一部署:

- **使用 store action:** 这种方法允许你通过将节点 ID 传入方法来一次更新多个节点。
- **从自定义节点组件发出** `updateNodeInternals` **事件:** 这不需要传递任何参数。

```js
import { useVueFlow } from '@vue-flow/core'

const { updateNodeInternals } = useVueFlow()

const onSomeEvent = () => {
  updateNodeInternals(['1'])
}
```

```vue
<script setup>
const emits = defineEmits(['updateNodeInternals'])

const onSomeEvent = () => {
  emits('updateNodeInternals')
}
</script>
```
