# Edges 介绍

Edges 是连接节点的线条,形成一个图。每条边从一个 handle 连接到另一个 handle,并且可以根据需要自定义。

记住,每条边都是唯一的,因此**需要一个唯一的 id**,以及源节点和目标节点的 id。

要查看边可用选项的完整列表,请查看 [Edge Type](https://vueflow.dev/typedocs/type-aliases/Edge.html)。

# 向图中添加边

通过将边传递给 Vue Flow 组件的 `edges` 属性(或已弃用的 `v-model` 属性)来渲染边。

> 警告
>
> 这种方法*不会*创建更改。查看 [Controlled Flow](https://vueflow.dev/guide/controlled-flow.html) 部分了解更多信息。

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { VueFlow } from '@vue-flow/core'

const nodes = ref([
  {
    id: '1',
    position: { x: 50, y: 50 },
    data: { label: 'Node 1' }
  },
  {
    id: '2',
    position: { x: 50, y: 250 },
    data: { label: 'Node 2' }
  }
])

const edges = ref([
  {
    id: 'e1->2',
    source: '1',
    target: '2'
  }
])
</script>

<template>
  <VueFlow :nodes="nodes" :edges="edges" />
</template>
```

如果你正在处理更复杂的图或只是需要访问内部状态,那么 [useVueFlow](https://vueflow.dev/typedocs/functions/useVueFlow.html) 组合式 API 将会很有用。

[`addEdges`](https://vueflow.dev/typedocs/interfaces/Actions.html#addEdges) action 可以通过 [useVueFlow](https://vueflow.dev/typedocs/functions/useVueFlow.html) 获得,允许你直接将边添加到状态中。

更重要的是,这个 action 不限于渲染图的组件;它可以在其他地方使用,比如在侧边栏或工具栏中。

```vue
<script setup>
import { VueFlow, useVueFlow } from '@vue-flow/core'

const initialNodes = ref([
  {
    id: '1',
    position: { x: 50, y: 50 },
    data: { label: 'Node 1' }
  },
  {
    id: '2',
    position: { x: 50, y: 250 },
    data: { label: 'Node 2' }
  }
])

const { addEdges } = useVueFlow()

addEdges([
  {
    source: '1',
    target: '2',

    // 如果一个节点有多个相同类型的 handles,
    // 你应该通过 id 指定使用哪个 handle
    sourceHandle: null,
    targetHandle: null
  }
])
</script>

<template>
  <VueFlow :nodes="initialNodes" />
</template>
```

# 从图中删除边

与添加边类似,可以通过从 Vue Flow 组件的 `model-value`(使用 `v-model`)或 `edges` 属性中删除边来从图中删除边。

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { VueFlow, Panel } from '@vue-flow/core'

const nodes = ref([
  {
    id: '1',
    position: { x: 50, y: 50 },
    data: { label: 'Node 1' }
  },
  {
    id: '2',
    position: { x: 50, y: 250 },
    data: { label: 'Node 2' }
  }
])

const edges = ref([
  {
    id: 'e1->2',
    source: '1',
    target: '2'
  }
])

function removeEdge(id) {
  edges.value = edges.value.filter((edge) => edge.id !== id)
}
</script>

<template>
  <VueFlow :nodes="nodes" :edges="edges">
    <Panel>
      <button @click="removeEdge('e1->2')">Remove Edge</button>
    </Panel>
  </VueFlow>
</template>
```

[`removeEdges`](https://vueflow.dev/typedocs/interfaces/Actions.html#removeEdges) action 可以通过 [useVueFlow](https://vueflow.dev/typedocs/functions/useVueFlow.html) 获得,允许你直接从状态中删除边。

你也可以在渲染图的组件之外使用这个 action,比如在侧边栏或工具栏中。

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'

const nodes = ref([
  {
    id: '1',
    position: { x: 50, y: 50 },
    data: { label: 'Node 1' }
  },
  {
    id: '2',
    position: { x: 50, y: 250 },
    data: { label: 'Node 2' }
  },
  {
    id: '3',
    position: { x: 250, y: 50 },
    data: { label: 'Node 3' }
  },
  {
    id: '4',
    position: { x: 250, y: 250 },
    data: { label: 'Node 4' }
  }
])

const edges = ref([
  {
    id: 'e1->2',
    source: '1',
    target: '2'
  },
  {
    id: 'e1->3',
    source: '1',
    target: '3'
  },
  {
    id: 'e2->3',
    source: '2',
    target: '3'
  },
  {
    id: 'e2->4',
    source: '2',
    target: '4'
  }
])

const { removeEdges } = useVueFlow()

function removeOneEdge() {
  removeEdges('e1->2')
}

function removeMultipleEdges() {
  removeEdges(['e1->3', 'e2->3'])
}
</script>

<template>
  <VueFlow :nodes="nodes" :edges="edges">
    <Panel>
      <button @click="removeOneEdge">Remove Edge 1</button>
      <button @click="removeMultipleEdges">Remove Edges 2 and 3</button>
    </Panel>
  </VueFlow>
</template>
```

# 更新边数据

由于边是响应式对象,你可以通过简单地修改它来随时更新它们的数据。这允许你更改标签,甚至在任何时候向数据对象添加新属性。

有多种方法可以实现这一点,以下是一些示例:

```ts
import { useVueFlow } from '@vue-flow/core'

const instance = useVueFlow()

// 使用 `updateEdgeData` 方法更新边的数据
instance.updateEdgeData(edgeId, { hello: 'mona' })

// 通过 id 在状态中找到边
const edge = instance.findEdge(edgeId)

edge.data = {
  ...edge.data,
  hello: 'world'
}

// 你也可以修改属性如 `selectable` 或 `animated`
edge.selectable = !edge.selectable
edge.animated = !edge.animated
```

```vue
<!-- CustomEdge.vue -->
<script setup>
import { useEdge } from '@vue-flow/core'

// `useEdge` 直接返回状态中的边对象
// 由于边对象是响应式的,我们可以修改它来更新我们的边的数据
const { edge } = useEdge()

function onSomeEvent() {
  edge.data = {
    ...edge.data,
    hello: 'world'
  }

  // 你也可以修改属性如 `selectable` 或 `animated`
  edge.selectable = !edge.selectable
  edge.animated = !edge.animated
}
</script>
```

# [预定义边类型](https://vueflow.dev/typedocs/interfaces/DefaultEdgeTypes.html)

Vue Flow 提供了几种内置的边类型,你可以立即使用。包含的节点类型有 `default`(贝塞尔曲线)、`step`、`smoothstep` 和 `straight`。

## 默认边(贝塞尔曲线)

默认边是连接两个节点的贝塞尔曲线。

## Step 边

Step 边有一个朝向目标的直线路径,带有一个台阶。

## Smoothstep 边

与 step 边相同,但在台阶处有圆角(圆角台阶)。

## 直线边

一个简单的直线路径。

# 用户定义的边

除了前面提到的默认边类型外,你还可以创建任意数量的自定义边类型。边类型是从你的边定义中确定的。

Vue Flow 将尝试将此边类型解析为组件。优先考虑状态的 edgeTypes 对象中的定义。接下来,它尝试将组件匹配到具有相同名称的全局注册组件。最后,它搜索提供的模板插槽以填充边类型。

如果没有方法能够解析组件,则使用默认边类型作为后备。

## 模板插槽

定义自定义边的最简单方法之一是将它们作为模板插槽传递。对你的用户定义的边类型进行动态解析到插槽名称,这意味着类型为 `custom` 的边应该有一个名为 `#edge-custom` 的插槽。

```vue
<script setup>
import { ref } from 'vue'
import { VueFlow } from '@vue-flow/core'
import CustomEdge from './CustomEdge.vue'

const nodes = ref([
  {
    id: '1',
    position: { x: 50, y: 50 },
    data: { label: 'Node 1' }
  },
  {
    id: '2',
    position: { x: 50, y: 250 },
    data: { label: 'Node 2' }
  }
])

const edges = ref([
  {
    id: 'e1->2',
    type: 'custom',
    source: '1',
    target: '2'
  }
])
</script>

<template>
  <VueFlow :nodes="nodes" :edges="edges">
    <template #edge-custom="props">
      <CustomEdge v-bind="props" />
    </template>
  </VueFlow>
</template>
```

## 边类型对象

或者,边类型也可以通过将对象作为 prop 传递给 VueFlow 组件(或作为组合式 API 的选项)来定义。

> 警告
>
> 注意将你的组件标记为原始的(使用 Vue 库中的 marked 函数)以防止它们转换为响应式对象。否则,Vue 将在控制台上显示警告。

```vue
<script setup>
import { markRaw } from 'vue'
import CustomEdge from './CustomEdge.vue'

const edgeTypes = {
  custom: markRaw(CustomEdge)
}

const nodes = ref([
  {
    id: '1',
    position: { x: 50, y: 50 },
    data: { label: 'Node 1' }
  },
  {
    id: '2',
    position: { x: 50, y: 250 },
    data: { label: 'Node 2' }
  }
])

const edges = ref([
  {
    id: 'e1->2',
    type: 'custom',
    source: '1',
    target: '2'
  }
])
</script>
<template>
  <VueFlow :nodes="nodes" :edges="edges" :edgeTypes="edgeTypes" />
</template>
```

# [边属性](https://vueflow.dev/typedocs/interfaces/EdgeProps.html)

你的自定义边被封装,以便基本功能(如选择)能够工作。但你可能希望扩展这些功能或在边内实现你的业务逻辑,因此你的边接收以下属性:

| 属性名           | 描述                        | 类型                                                                        | 可选 |
| ---------------- | --------------------------- | --------------------------------------------------------------------------- | ---- |
| id               | 唯一边 id                   | string                                                                      |      |
| sourceNode       | 源节点                      | [GraphNode](https://vueflow.dev/typedocs/interfaces/GraphNode.html)         |      |
| targetNode       | 目标节点                    | [GraphNode](https://vueflow.dev/typedocs/interfaces/GraphNode.html)         |      |
| source           | 源节点的 ID                 | string                                                                      |      |
| target           | 目标节点的 ID               | string                                                                      |      |
| type             | 边类型                      | string                                                                      |      |
| label            | 边标签,可以是字符串或 VNode | string \| VNode \| Component \| Object                                      |      |
| style            | CSS 属性                    | CSSProperties                                                               |      |
| selected         | 是否选中边                  | boolean                                                                     |      |
| sourcePosition   | 源位置                      | [Position](https://vueflow.dev/typedocs/enumerations/Position.html)         |      |
| targetPosition   | 目标位置                    | [Position](https://vueflow.dev/typedocs/enumerations/Position.html)         |      |
| sourceHandleId   | 源 handle 的 ID             | string                                                                      |      |
| targetHandleId   | 目标 handle 的 ID           | string                                                                      |      |
| animated         | 是否动画                    | boolean                                                                     |      |
| updatable        | 是否可更新                  | boolean                                                                     |      |
| markerStart      | 开始标记                    | string                                                                      |      |
| markerEnd        | 结束标记                    | string                                                                      |      |
| curvature        | 边的曲率                    | number                                                                      |      |
| interactionWidth | 边的交互区域宽度            | number                                                                      |      |
| data             | 边的附加数据                | any object                                                                  |      |
| events           | 边的上下文和自定义事件      | [EdgeEventsOn](https://vueflow.dev/typedocs/type-aliases/EdgeEventsOn.html) |      |

# 边事件

Vue Flow 提供了两种主要的监听边事件的方式,要么使用 `useVueFlow` 将监听器绑定到事件处理程序,要么将它们绑定到 `<VueFlow>` 组件。

```vue
<script setup>
import { ref } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'

// useVueFlow 提供对事件处理程序的访问
const {
  onEdgeClick,
  onEdgeDoubleClick,
  onEdgeContextMenu,
  onEdgeMouseEnter,
  onEdgeMouseLeave,
  onEdgeMouseMove,
  onEdgeUpdateStart,
  onEdgeUpdate,
  onEdgeUpdateEnd
} = useVueFlow()

const nodes = ref([
  {
    id: '1',
    position: { x: 50, y: 50 },
    data: { label: 'Node 1' }
  },
  {
    id: '2',
    position: { x: 50, y: 250 },
    data: { label: 'Node 2' }
  }
])

const edges = ref([
  {
    id: 'e1->2',
    source: '1',
    target: '2'
  }
])

// 将监听器绑定到事件处理程序
onEdgeClick((event, edge) => {
  console.log('edge clicked', edge)
})

onEdgeDoubleClick((event, edge) => {
  console.log('edge double clicked', edge)
})

onEdgeContextMenu((event, edge) => {
  console.log('edge context menu', edge)
})

// ... 等等
</script>

<template>
  <VueFlow :nodes="nodes" :edges="edges" />
</template>
```

```vue
<script setup>
import { ref } from 'vue'
import { VueFlow } from '@vue-flow/core'

const nodes = ref([
  {
    id: '1',
    position: { x: 50, y: 50 },
    data: { label: 'Node 1' }
  },
  {
    id: '2',
    position: { x: 50, y: 250 },
    data: { label: 'Node 2' }
  }
])

const edges = ref([
  {
    id: 'e1->2',
    source: '1',
    target: '2'
  }
])

function logEvent(eventName, data) {
  console.log(eventName, data)
}
</script>

<template>
  <VueFlow
    :nodes="nodes"
    :edges="edges"
    @edge-click="logEvent('edge clicked', $event)"
    @edge-double-click="logEvent('edge double clicked', $event)"
    @edge-context-menu="logEvent('edge context menu', $event)"
    @edge-mouse-enter="logEvent('edge mouse enter', $event)"
    @edge-mouse-leave="logEvent('edge mouse leave', $event)"
    @edge-mouse-move="logEvent('edge mouse move', $event)"
    @edge-update-start="logEvent('edge update start', $event)"
    @edge-update="logEvent('edge update', $event)"
    @edge-update-end="logEvent('edge update end', $event)"
  />
</template>
```
