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
    color: rgb(17, 149, 48);
    font-weight: bold;
}
</style>
