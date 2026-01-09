<template>
    <div class="login_wrapper">
        <LogoHead key="login" class="logo_head" :showLogout="false" />
        <div class="title">登录账号</div>
        <div class="input_wrap">
            <div class="name">用户名</div>
            <el-input v-model="nameInput" placeholder="请输入" />
        </div>
        <div class="input_wrap">
            <div class="name">密码</div>
            <el-input v-model="passInput" type="password" placeholder="请输入" show-password />
        </div>
        <div class="submit_btn" :class="{ disabled: !canSubmit }" @click="handleSubmit">
            <div class="submit_text">登录</div>
        </div>
        <div class="register_btn" @click="handleRegister">
            <div class="submit_text">注册</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, type Ref, defineEmits } from "vue";
import { onMounted } from "vue";
import LogoHead from "./LogoHead.vue";
import { rsaEncrypt } from "@/utils/crypt";
const webURL: string = import.meta.env.VITE_API_WEB_URL || "";
const emit = defineEmits(["submit"]);
onMounted(() => {});

const nameInput: Ref<string> = ref("");
const passInput: Ref<string> = ref("");
const canSubmit = computed(() => {
    return nameInput.value.length > 0 && passInput.value.length > 0;
});

const clearInputs = () => {
    nameInput.value = "";
    passInput.value = "";
};

const handleSubmit = () => {
    if (!canSubmit.value) {
        return;
    }
    emit("submit", nameInput.value.trim(), rsaEncrypt(passInput.value));
};
const handleRegister = () => {
    window.open(webURL, "_blank");
};
defineExpose({
    clearInputs
});
</script>

<style scoped lang="scss">
::v-deep .el-input__wrapper {
    background-color: unset;
    box-shadow: unset;
    padding-inline: 24px;

    border: 1px solid #dcdfe6;
    &:hover {
        box-shadow: unset;
        border: 1px solid #9e40ff;
    }
    .el-input__inner ::placeholder {
        height: 22px;
        font-family: PingFang SC, PingFang SC;
        font-weight: 400;
        font-size: 16px;
        color: rgba(0, 0, 0, 0.25);
        text-align: left;
        font-style: normal;
        text-transform: none;
    }
}

::v-deep .el-input__wrapper.is-focus {
    box-shadow: unset;
    border: 1px solid #9e40ff;
}
.login_wrapper {
    border-radius: 12px 12px 12px 12px;
    .logo_head {
        margin-block: 40px;
        margin-top: 50px;
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
    }
    .input_wrap {
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: start;
        margin-bottom: 24px;
        .name {
            height: 22px;
            font-family: PingFang SC, PingFang SC;
            font-weight: 400;
            font-size: 16px;
            color: rgba(0, 0, 0, 0.85);
            text-align: left;
            font-style: normal;
            text-transform: none;
            margin-bottom: 4px;
        }

        .el-input {
            width: 100%;
            height: 56px;
        }
    }
    .register_btn {
        width: 180px;
        height: 44px;
        background: #9e40ff;
        border-radius: 8px 8px 8px 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 20px;
        cursor: pointer;
        .submit_text {
            height: 31px;
            font-family: PingFang SC, PingFang SC;
            font-weight: 600;
            font-size: 22px;
            color: #ffffff;
            text-align: center;
            font-style: normal;
            text-transform: none;
        }
    }
    .submit_btn {
        width: 180px;
        height: 44px;
        background: #9e40ff;
        border-radius: 8px 8px 8px 8px;
        display: flex;
        align-items: center;
        justify-content: center;

        cursor: pointer;
        .submit_text {
            height: 31px;
            font-family: PingFang SC, PingFang SC;
            font-weight: 600;
            font-size: 22px;
            color: #ffffff;
            text-align: center;
            font-style: normal;
            text-transform: none;
        }
    }
    .disabled {
        background: #d8b3ff;
    }
}
</style>
