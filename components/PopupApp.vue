<template>
    <div class="popup_wrapper" v-loading="loading">
        <!-- <div @click="testClick">测试接口</div> -->
        <el-alert style="cursor: pointer" v-if="versionTitle != ''" :title="versionTitle" type="warning" @click="openChromeWebStore" />
        <Login v-if="showPage == 'login'" ref="logoRef" @submit="onLogin" />
        <!-- <WorkFlow
            v-if="showPage == 'workflow'"
            @submit="onStartWork"
            @changePage="onChangePage"
            @logout="onLogout"
            :oldWorkflow="oldWorkflow"
        />
        <Permission
            v-if="showPage == 'permission'"
            @submit="onTwitter"
            @logout="onLogout"
        />
        <WorkLog
            v-if="showPage == 'worklog'"
            @change-workflow="onChangeWorkflow"
            @logout="onLogout"
        /> -->
        <Home v-if="showPage == 'home'" @logout="onLogout" @checkX="checkTwitterLogin" :userData="userData" :xData="xData" :workflowData="workflowData" />
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, type Ref, watch } from "vue";
import { onMounted } from "vue";
import { getXAccountInfo } from "@/utils/x";
// Declare chrome for TypeScript
declare const chrome: any;

import Login from "@/components/Login.vue";
import Home from "@/components/Home.vue";

import type { ComponentPublicInstance } from "vue";
import { userApi, workflowApi } from "@/api/api";
import { ElMessage } from "element-plus";
import { selfLocalStorage } from "@/utils/storage";
const versionTitle = ref(``);
const loading = ref(true);
const userData = ref<Record<string, any> | undefined>(undefined);
const workflowData = ref<Record<string, any> | undefined>(undefined);
const xData = ref<Record<string, any> | undefined>(undefined);
const showPage = ref(""); // 控制显示的页面
// Use the correct type for the Login component instance
const logoRef = ref<ComponentPublicInstance<{
    clearInputs: () => void;
}> | null>(null);
const chromewebstore = ref("");
const openChromeWebStore = () => {
    if (chromewebstore.value) {
        chrome.tabs.create({ url: chromewebstore.value });
    }
};
const testClick = async () => {
    try {
        workflowApi
            .getReply("1983891366953824257", "测试十四")
            .then((response) => {
                ElMessage({
                    message: `测试接口成功: ${response}`,
                    type: "success"
                });
            })
            .catch((error) => {
                ElMessage({
                    message: `测试接口失败: ${error.message}`,
                    type: "error"
                });
            });
        // const response = await browser.runtime.sendMessage({
        //     action: "generateComment",
        //     data: {
        //         missionId: "1983891366953824257",
        //         tweetId: "222",
        //         tweetText: "测试十四"
        //     }
        // });
        ElMessage({
            message: `测试接口成功: ${response}`,
            type: "success"
        });
    } catch (error) {
        ElMessage({
            message: `测试接口失败: ${error.message}`,
            type: "error"
        });
    }
};
onMounted(async () => {
    console.log("MoonMountedonMountednted", userData, chrome.runtime.getManifest().version);
    let localVersion = chrome.runtime.getManifest().version;
    try {
        let remoteVersion = await workflowApi.getRemoteVersion();
        if (remoteVersion.code == 0) {
            chromewebstore.value = remoteVersion.data.downloadUrl || "";
            if (remoteVersion.data.version != localVersion) {
                versionTitle.value = `检测到新版本${remoteVersion.data.version}，点击前往扩展市场更新至最新版本`;
            }
        }
    } catch (error) {
        console.log("获取远程版本信息失败", error);
    }

    // await selfLocalStorage.removeItem("logs");
    //判断应该展示哪个页面
    selfLocalStorage.getItem("token").then(async (token) => {
        if (!token) {
            showPage.value = "login";
            loading.value = false;
        } else {
            try {
                await selfLocalStorage.getItem("user").then((user) => {
                    userData.value = user ? JSON.parse(user) : undefined;
                    console.log("User data loaded:", userData.value);
                });
                let xAccount = await getXAccountInfo();
                xData.value = xAccount;
                if (xAccount == null) {
                    ElMessage({
                        message: "未检测到X账号，请登录后重新打开插件",
                        type: "error",
                        duration: 5000
                    });
                    loading.value = false;
                    return;
                }
                await selfLocalStorage.getItem("workflow").then(async (workflow) => {
                    console.log("Workflow data loaded:", workflow);
                    let workflowData22 = workflow ? JSON.parse(workflow) : undefined;
                    console.log("Workflow data loaded:", workflowData22);
                    if (workflowData22) {
                        let changeXAccount = workflowData22.find((item) => item.accountName != xAccount.accountId);
                        console.log("changeXAccount loaded:", changeXAccount, xAccount.accountId);
                        if (changeXAccount) {
                            //更换账号，清理工作流
                            workflowData.value = undefined;
                            await selfLocalStorage.removeItem("jobId");
                            await selfLocalStorage.removeItem("logs");
                            showPage.value = "home";
                            loading.value = false;
                            return browser.runtime.sendMessage({
                                action: "stopWork"
                            });
                        }
                        workflowData.value = workflowData22;
                    }
                    selfLocalStorage.getItem("page").then((page) => {
                        showPage.value = page || "home";
                        loading.value = false;
                    });
                });
            } catch (error) {
                loading.value = false;
                ElMessage({
                    message: error.message || "发生错误，请重新打开插件",
                    type: "error",
                    duration: 5000
                });
            }
        }
    });
});
const onLogin = (name, pass) => {
    // Handle login logic here
    console.log(name, pass);
    console.log("Login submitted");
    loading.value = true;
    userApi
        .login(name, pass)
        .then(async (response) => {
            console.log("Login successful");
            ElMessage({
                message: "登录成功",
                type: "success"
            });
            try {
                await selfLocalStorage.setItem("user", JSON.stringify(response.data)).then(() => {
                    console.log("User saved to local storage");
                });
                userData.value = response.data;
                await getXAccountInfo().then((xAccount) => {
                    xData.value = xAccount;
                    console.log("X Account data loaded:", xData.value);
                });
                await selfLocalStorage.setItem("token", response.data.token).then(() => {
                    console.log("Token saved to local storage");
                    showPage.value = "home";
                    loading.value = false;
                });
            } catch (error) {
                loading.value = false;
                ElMessage({
                    message: error.message || "发生错误，请重新打开插件",
                    type: "error",
                    duration: 5000
                });
            }
        })
        .catch((error) => {
            ElMessage({
                message: error.message,
                type: "error"
            });
            console.error("Error during login:", error);
            loading.value = false;
        })
        .finally(() => {
            // Optionally, you can reset the form or perform other actions
            logoRef.value?.clearInputs();
        });
};

const onLogout = () => {
    userApi
        .logout()
        .then(() => {
            console.log("Logout successful");
            ElMessage({
                message: "登出成功",
                type: "success"
            });
            selfLocalStorage.clear().then(() => {
                console.log("Local storage cleared");
                showPage.value = "login";
            });
            // selfLocalStorage.removeItem("token").then(() => {
            //     console.log("Token removed from local storage");
            //     showPage.value = "login";
            // });
        })
        .catch((error) => {
            console.error("Error during logout:", error);
            ElMessage({
                message: "登出失败",
                type: "error"
            });
        });
};

const checkTwitterLogin = async () => {
    loading.value = true;
    let currentTwitterInfo = await getXAccountInfo();
    console.log("当前推特账号信息:", currentTwitterInfo);
    if (!currentTwitterInfo || typeof currentTwitterInfo.accountId === "undefined") {
        ElMessage.error("请先登录您的Twitter账号");
        loading.value = false;
        return false;
    }
    xData.value = currentTwitterInfo;
    let checkRes = await userApi.checkXAccount(currentTwitterInfo.accountId);
    console.log("checkRescheckRes", checkRes);
    if (!checkRes?.data.exist) {
        ElMessage.error(`当前账号未绑定X账户[${currentTwitterInfo.accountId}],请登录正确的账号后再试`);
        loading.value = false;
        return false;
    }

    loading.value = false;
    return true; // 假设检查通过
};
const onTwitter = async () => {
    loading.value = true;
    let workflow = await selfLocalStorage.getItem("workflow");
    // await checkTwitterLogin(JSON.parse(workflow));
    if (showPage.value == "permission") {
        ElMessage({
            message: `请在浏览器页面登录您的Twitter账号“${JSON.parse(workflow).accountName}”，然后点击一键授权即可。`,
            type: "warning"
        });
    }
    loading.value = false;
};

watch(showPage, (newPage) => {
    console.log("当前页面:", newPage);
    selfLocalStorage.setItem("page", newPage);
});
</script>

<style scoped lang="scss">
.popup_wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    width: 505px;
    // height: 700px;
    height: 600px;
    background: linear-gradient(136deg, #fefafb 0%, #e7f9fd 100%);
    box-shadow: 0px 4px 16px 0px rgba(0, 0, 0, 0.15);
    border-radius: 12px 12px 12px 12px;
}
</style>

<style>
body {
    margin: 0;
    padding: 0;
    width: 505px;
    height: 600px;
    overflow: hidden;
}
</style>
