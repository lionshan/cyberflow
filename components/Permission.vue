<template>
    <div class="permission_wrapper" v-loading="loading">
        <LogoHead
            key="permission"
            :showLogout="true"
            class="logo_head"
            @logout="emit('logout')"
        />
        <div class="title"><Tips />授权提示</div>
        <div class="tips_wrap">
            无法获取到twitter的登陆token，请在浏览器页面登陆您的twitter账号“xcyber-ai”，然后同时打开此插件，
            点击一键授权即可。
        </div>

        <div class="submit_btn" @click="handleSubmit">
            <div class="submit_text">
                一键授权插件“{{ workflowName }}”账号发twitter
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, type Ref, defineEmits } from "vue";
import LogoHead from "./LogoHead.vue";
import Tips from "./Tips.vue";
import { selfLocalStorage } from "@/utils/storage";
onMounted(async () => {
    let workflow = await selfLocalStorage.getItem("workflow");
    workflowName.value = JSON.parse(workflow)?.accountName || "";
});
const workflowName = ref("");
const emit = defineEmits(["submit", "logout"]);
// 处理提交事件
const handleSubmit = () => {
    emit("submit");
};
const loading = ref(false);
</script>

<style scoped lang="scss">
.permission_wrapper {
    border-radius: 12px 12px 12px 12px;
    border-radius: 12px 12px 12px 12px;
    .logo_head {
        margin-block: 40px;
        margin-top: 80px;
        width: 100%;
    }
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: start;
    padding-inline: 74px;
    width: calc(100% - 148px);
    height: 100%;
    .title {
        height: 34px;
        font-family: PingFang SC, PingFang SC;
        font-weight: 500;
        font-size: 24px;
        color: #000000;
        text-align: center;
        font-style: normal;
        text-transform: none;
        margin-bottom: 40px;
        display: inline-flex;
        align-items: center;

        svg {
            width: 28px;
            height: 28px;
            margin-right: 9px;
        }
    }
    .tips_wrap {
        font-family: PingFang SC, PingFang SC;
        font-weight: 500;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.85);
        line-height: 26px;
        text-align: center;
        font-style: normal;
        text-transform: none;
    }

    .submit_btn {
        width: 386px;
        height: 44px;
        background: #9e40ff;
        border-radius: 8px 8px 8px 8px;

        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 68px;
        cursor: pointer;
        .submit_text {
            height: 28px;
            font-family: PingFang SC, PingFang SC;
            font-weight: 500;
            font-size: 18px;
            color: #ffffff;
            line-height: 28px;
            text-align: left;
            font-style: normal;
            text-transform: none;
        }
    }
    .disabled {
        background: #d8b3ff;
    }
}
</style>
