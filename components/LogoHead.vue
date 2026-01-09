<template>
    <div class="logo_wrapper">
        <Logo class="logo_icon" />
        <div class="logo_title">CyberFlow</div>
        <div class="logout_wrapper" v-if="props.showLogout">
            <div class="logout_btn" @click="emit('logout')">登出</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, type Ref, defineProps } from "vue";
import { onMounted } from "vue";
import Logo from "./Logo.vue";
const emit = defineEmits(["logout"]);
const props = defineProps({
    showLogout: {
        type: Boolean,
        default: true
    }
});
onMounted(() => {});
</script>

<style scoped lang="scss">
.logo_wrapper {
    display: flex;
    align-items: center;
    justify-content: start;
    .logo_icon {
        width: 40px !important;
        height: 40px !important;
        margin-right: 10px;
    }
    .logout_wrapper {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: end;
        .logout_btn {
            width: 80px;
            height: 34px;
            background: #9e40ff;
            border-radius: 8px 8px 8px 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: PingFang SC, PingFang SC;
            font-weight: 500;
            font-size: 16px;
            color: #ffffff;
            text-align: left;
            font-style: normal;
            text-transform: none;
            cursor: pointer;
        }
    }

    .logo_title {
        font-family: PingFang SC, PingFang SC;
        font-weight: 600;
        font-size: 18px;
        color: #000000;
        line-height: 28px;
        text-align: left;
        font-style: normal;
        text-transform: none;
    }
}
</style>
