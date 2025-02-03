<template>
  <Transition name="fade">
    <div v-if="visible" class="message-toast" :class="type">
      <svg class="wave" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0,256L11.4,240C22.9,224,46,192,69,192C91.4,192,114,224,137,234.7C160,245,183,235,206,213.3C228.6,192,251,160,274,149.3C297.1,139,320,149,343,181.3C365.7,213,389,267,411,282.7C434.3,299,457,277,480,250.7C502.9,224,526,192,549,181.3C571.4,171,594,181,617,208C640,235,663,277,686,256C708.6,235,731,149,754,122.7C777.1,96,800,128,823,165.3C845.7,203,869,245,891,224C914.3,203,937,117,960,112C982.9,107,1006,181,1029,197.3C1051.4,213,1074,171,1097,144C1120,117,1143,107,1166,133.3C1188.6,160,1211,224,1234,218.7C1257.1,213,1280,139,1303,133.3C1325.7,128,1349,192,1371,192C1394.3,192,1417,128,1429,96L1440,64L1440,320L1428.6,320C1417.1,320,1394,320,1371,320C1348.6,320,1326,320,1303,320C1280,320,1257,320,1234,320C1211.4,320,1189,320,1166,320C1142.9,320,1120,320,1097,320C1074.3,320,1051,320,1029,320C1005.7,320,983,320,960,320C937.1,320,914,320,891,320C868.6,320,846,320,823,320C800,320,777,320,754,320C731.4,320,709,320,686,320C662.9,320,640,320,617,320C594.3,320,571,320,549,320C525.7,320,503,320,480,320C457.1,320,434,320,411,320C388.6,320,366,320,343,320C320,320,297,320,274,320C251.4,320,229,320,206,320C182.9,320,160,320,137,320C114.3,320,91,320,69,320C45.7,320,23,320,11,320L0,320Z"
        ></path>
      </svg>

      <div class="icon-container">
        <svg
          v-if="type === 'success'"
          width="24"
          height="24"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 24L20 34L40 14"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <svg
          v-if="type === 'error'"
          width="24"
          height="24"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14 14L34 34"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M14 34L34 14"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <svg
          v-if="type === 'warning'"
          width="24"
          height="24"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14 25C14 19.4772 18.4772 15 24 15C29.5228 15 34 19.4772 34 25V41H14V25Z"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            stroke-linejoin="round"
          />
          <path
            d="M24 5V8"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M35.8918 9.32823L33.9634 11.6264"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M42.2187 20.2873L39.2642 20.8083"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M5.78116 20.2874L8.73558 20.8083"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M12.1086 9.32802L14.037 11.6262"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M6 41H43"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <svg
          v-if="type === 'info'"
          width="24"
          height="24"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M24 44C29.5228 44 34.5228 41.7614 38.1421 38.1421C41.7614 34.5228 44 29.5228 44 24C44 18.4772 41.7614 13.4772 38.1421 9.85786C34.5228 6.23858 29.5228 4 24 4C18.4772 4 13.4772 6.23858 9.85786 9.85786C6.23858 13.4772 4 18.4772 4 24C4 29.5228 6.23858 34.5228 9.85786 38.1421C13.4772 41.7614 18.4772 44 24 44Z"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            stroke-linejoin="round"
          />
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M24 11C25.3807 11 26.5 12.1193 26.5 13.5C26.5 14.8807 25.3807 16 24 16C22.6193 16 21.5 14.8807 21.5 13.5C21.5 12.1193 22.6193 11 24 11Z"
            fill="currentColor"
          />
          <path
            d="M24.5 34V20H23.5H22.5"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M21 34H28"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <div class="message-text-container">
        <p class="message-text">
          {{
            type === 'success'
              ? 'Success'
              : type === 'error'
                ? 'Error'
                : type === 'warning'
                  ? 'Warning'
                  : 'Info'
          }}
        </p>
        <p class="sub-text">{{ message }}</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  dev?: boolean
}>()

const visible = ref(false)

onMounted(() => {
  visible.value = true
  if (!props.dev) {
    setTimeout(() => {
      visible.value = false
    }, props.duration || 2000)
  }
})
</script>

<style lang="scss" scoped>
.message-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 330px;
  height: 80px;
  border-radius: 8px;
  box-sizing: border-box;
  padding: 10px 15px;
  background-color: var(--color-bg-secondary);
  box-shadow: rgba(149, 157, 165, 0.2) 0px 8px 24px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 15px;
  z-index: 99999;

  .wave {
    position: absolute;
    transform: rotate(90deg);
    left: -31px;
    top: 32px;
    width: 80px;
    fill: #04e4003a;
  }

  .icon-container {
    width: 35px;
    height: 35px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    margin-left: 8px;

    &:deep(svg) {
      width: 17px;
      height: 17px;
    }
  }

  &.success {
    .icon-container {
      background-color: rgba(var(--color-success-rgb), 0.2);
      svg {
        color: var(--color-success);
      }
    }
    .message-text {
      color: var(--color-success);
    }
    .wave {
      fill: rgba(var(--color-success-rgb), 0.2);
    }
  }

  &.error {
    .icon-container {
      background-color: rgba(var(--color-danger-rgb), 0.2);
      svg {
        color: var(--color-danger);
      }
    }
    .message-text {
      color: var(--color-danger);
    }
    .wave {
      fill: rgba(var(--color-danger-rgb), 0.2);
    }
  }

  &.warning {
    .icon-container {
      background-color: rgba(var(--color-warning-rgb), 0.2);
      svg {
        color: var(--color-warning);
      }
    }
    .message-text {
      color: var(--color-warning);
    }
    .wave {
      fill: rgba(var(--color-warning-rgb), 0.2);
    }
  }

  &.info {
    .icon-container {
      background-color: rgba(var(--color-blue-rgb), 0.2);
      svg {
        color: var(--color-blue);
      }
    }
    .message-text {
      color: var(--color-blue);
    }
    .wave {
      fill: rgba(var(--color-blue-rgb), 0.2);
    }
  }

  .message-text-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    flex-grow: 1;
  }

  .message-text,
  .sub-text {
    margin: 0;
    cursor: default;
  }

  .message-text {
    font-size: 17px;
    font-weight: 700;
  }

  .sub-text {
    font-size: 14px;
    color: #555;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
