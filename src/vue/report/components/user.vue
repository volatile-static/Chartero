<template>
  <span class="user">
    <slot v-if="hasSlotContent">{{ text }}</slot>
    <template v-else>{{ text }}</template>
  </span>
</template>

<script lang="ts">
export default {
    props: {
        text: {
            type: String,
            default: ''
        }
    },
    computed: {
        hasSlotContent() {
            return !!this.$slots.default;
        }
    }
};
</script>

<style scoped>
.user {
    color: rgb(13, 115, 37);
    font-weight: bold;
    /* 调整阴影大小、颜色和透明度 */
    text-shadow: 0 0 3px rgba(210, 210, 125, 0.6), 0 0 8px rgba(210, 210, 125, 0.6);
}
</style>
