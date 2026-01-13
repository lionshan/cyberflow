<template>
    <div class="home-container" v-loading="loading">
        <!-- 头部区域 -->
        <div class="header">
            <div class="user-info">
                <div class="avatar">
                    <img v-if="userData?.avatar != ''" :src="userData?.avatar" alt="" />
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" v-else>
                        <g id="Group 1000006495">
                            <path
                                id="Vector"
                                fill-rule="evenodd"
                                clip-rule="evenodd"
                                d="M32 16C32 24.8366 24.8366 32 16 32C7.16344 32 0 24.8366 0 16C0 7.16344 7.16344 0 16 0C24.8366 0 32 7.16344 32 16Z"
                                fill="#EBE4F6"
                            />
                            <path
                                id="Vector_2"
                                d="M16.0008 29.5998C18.8553 29.5998 21.5044 28.7204 23.6919 27.2177C24.6581 26.554 25.071 25.2898 24.5093 24.261C23.3448 22.1282 20.9452 20.7998 16.0007 20.7998C11.0564 20.7998 8.6568 22.1282 7.49228 24.2609C6.93053 25.2897 7.34341 26.5539 8.30958 27.2176C10.4971 28.7204 13.1463 29.5998 16.0008 29.5998Z"
                                fill="white"
                            />
                            <path
                                id="Vector_3"
                                d="M21.7195 11.0976C21.7195 14.2562 19.159 16.8167 16.0004 16.8167C12.8418 16.8167 10.2812 14.2562 10.2812 11.0976C10.2812 7.93897 12.8418 5.37842 16.0004 5.37842C19.159 5.37842 21.7195 7.93897 21.7195 11.0976Z"
                                fill="white"
                            />
                        </g>
                    </svg>
                </div>
                <span class="username">{{ userData?.nickname }}</span>
            </div>
            <div class="header-actions">
                <div class="logout-btn" @click="emit('logout')">注销</div>
                <div class="admin-btn" @click="openWeb">后台管理</div>
            </div>
        </div>

        <!-- content Tab -->
        <div class="nav-tabs" v-if="showContent === 'home'">
            <div class="nav-tab-item" :class="{ active: activeTab === 'daily' }" @click="activeTab = 'daily'">日常模式</div>
            <div class="nav-tab-item" :class="{ active: activeTab === 'comment' }" @click="activeTab = 'comment'">一键评论</div>
        </div>

        <!-- 内容区域 -->
        <div class="home_content" v-if="showContent === 'home'">
            <template v-if="activeTab === 'daily'">
                <div class="content">
                    <!-- Twitter账户信息 -->
                    <div class="info-row">
                        <div class="row_wrap">
                            <span class="label">Twitter 账户：</span>
                            <span class="value" v-if="xData != null">{{ xData?.accountId }}</span>
                            <span class="tips" v-if="xData == null">点击检测账户</span>
                        </div>

                        <div class="action-btn" @click="checkX">检测账户</div>
                    </div>

                    <!-- 工作流信息 -->
                    <div class="info-row">
                        <div class="row_wrap">
                            <span class="label">工作流：</span>
                            <span class="value" v-if="selectflows.length > 0">{{ showWorkflowName }}</span>
                            <span class="tips" v-if="selectflows.length === 0">点击选择工作流</span>
                        </div>

                        <div
                            class="action-btn"
                            :class="{
                                actionDisable: !xData?.accountId
                            }"
                            @click="openWorkflowList"
                        >
                            选择工作流
                        </div>
                    </div>
                </div>
                <!-- 开启按钮 -->
                <div class="start-section">
                    <div
                        class="start-btn"
                        :class="{
                            actionDisable: selectflows.length == 0 || xData == null
                        }"
                        @click="startJob"
                        v-if="!jobId"
                    >
                        开启
                    </div>
                    <div class="stop-btn" @click="stopJob" v-else>
                        停止
                        <div class="tips">开启工作流后请不要切换浏览器tab页面，或者操作鼠标，插件将自动打开x.com进行工作</div>
                    </div>
                </div>

                <div class="log_wrap" v-if="!!jobId">
                    <div class="log_item" v-for="(log, index) in reverseLogs" :key="index">
                        <div class="time">{{ log.time }}</div>
                        <div class="log">{{ log.log }}</div>
                    </div>
                </div>
            </template>
            <!-- 一键评论区域 -->
            <OneClickComment ref="oneClickCommentRef" @start="startOnClickComment" @stopOneClickComment="stopOneClickComment" v-if="activeTab === 'comment'" :curUserName="userData?.nickname" />
        </div>
        <HomeWorkFlow :workflowList="workflows" :selectList="selectflows" v-if="showContent === 'workflow'" @confirm="backHome" />
    </div>
</template>

<script lang="ts" setup>
const webURL: string = import.meta.env.VITE_API_WEB_URL || "";
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { workflowApi } from "../api/api";
import HomeWorkFlow from "@/components/HomeWorkFlow.vue";
import OneClickComment from "@/components/OneClickComment.vue";

import { ElMessage } from "element-plus";
import { selfLocalStorage } from "@/utils/storage";
import type { WorkFlowData } from "@/types/workflow";
const emit = defineEmits(["logout", "checkX"]);
const props = defineProps({
    userData: {
        type: Object || null,
        default: null
    },
    xData: {
        type: Object || null,
        default: null
    },
    workflowData: {
        type: Array<WorkFlowData> || null,
        default: null
    }
});
// 响应式数据
const loading = ref(false);
const logs = ref<any[]>([]);
const workflows = ref<WorkFlowData[]>([]);
const selectflows = ref<WorkFlowData[]>([]);
const showContent = ref("home"); // 控制显示内容，'home' 或 'workflow'
const activeTab = ref("daily"); // daily: 日常模式, comment: 一键评论
const jobId = ref("");
let logTimer: any = null;
const oneClickCommentRef = ref<any>(null);

const showWorkflowName = computed(() => {
    let name = "";
    if (selectflows.value && selectflows.value.length > 0) {
        return selectflows.value.map((item) => item.workflowName).join("|");
    }
    return name;
});
const reverseLogs = computed(() => {
    return logs.value.slice().reverse();
});
watch(
    () => props.workflowData,
    (data) => {
        console.log("当前页面:", data);
        selectflows.value = props.workflowData || [];
    }
);
onMounted(() => {
    //检查登录账号
    checkX();
    checkJobId();
    selectflows.value = props.workflowData || [];
    checkLogs();
});
onUnmounted(() => {
    if (logTimer) {
        clearInterval(logTimer);
        logTimer = null;
    }
});
const closeOneClick = () => {
    if (oneClickCommentRef.value && oneClickCommentRef.value.stopLoading) {
        oneClickCommentRef.value.stopLoading();
    }
};
const stopOneClickComment = async () => {
    let tabId = await selfLocalStorage.getItem("oneClickCommenttabId");
    if (!!tabId) {
        browser.tabs.sendMessage(Number(tabId), {
            action: "stopOneClickComment"
        });
    }
};
const startOnClickComment = (aiId: string | number) => {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
        const tab = tabs[0];
        console.log("tabtabtabtab", tab);
        if (!tab || !tab.id || !tab.url) {
            ElMessage.warning("请在推文详情页下使用一键评论功能1");
            closeOneClick();
            return;
        }

        // 1. 判断当前tab页面url是否符合 *://x.com/*/status/*
        // 简单正则匹配
        const isXStatusPage = /^https?:\/\/x\.com\/[^/]+\/status\/[^/]+/.test(tab.url);
        if (!isXStatusPage) {
            ElMessage.warning("请在推文详情页下使用一键评论功能2");
            // 可选：在这里如果需要停止 OneClickComment 组件的 loading 状态，可能需要 emitting 一个事件或者调用引用方法
            // 但目前的结构是通过 refs 调用子组件方法较为复杂，暂时只提示
            closeOneClick();
            return;
        }
        const tabId = tab.id;
        selfLocalStorage.setItem("oneClickCommenttabId", tabId);
        // 2. 将aiId数据发送给对应tabId的页面
        // 3. 调用action: "oneClickComment"
        browser.tabs
            .sendMessage(tabId, {
                action: "oneClickComment",
                data: {
                    aiId: aiId
                }
            })
            .catch((error) => {
                console.log("一键点击错误", error);
            });
    });
};
const checkLogs = () => {
    //获取日志
    if (logTimer) {
        clearInterval(logTimer);
    }
    logTimer = setInterval(async () => {
        let logsStr = await selfLocalStorage.getItem("logs");
        if (logsStr) {
            logs.value = JSON.parse(logsStr).filter((item: any) => item.showUser) || [];
        } else {
            logs.value = [];
        }
    }, 10000);

    selfLocalStorage.getItem("logs").then((res) => {
        if (res) {
            logs.value = JSON.parse(res).filter((item: any) => item.showUser) || [];
        }
    });
};
const checkJobId = () => {
    selfLocalStorage.getItem("jobId").then((id) => {
        console.log("jobId from storage:", id);
        jobId.value = id || "";
        console.log("jobId loaded:", jobId);
    });
};
const startJob = () => {
    if (!props.xData?.accountId) {
        ElMessage.warning("请先登录X账户");
        return;
    }
    if (selectflows.value.length === 0) {
        ElMessage.warning("请先选择工作流");
        return;
    }

    //开启任务
    loading.value = true;
    workflowApi
        .startWorkFlows(
            props.xData?.accountId,
            selectflows.value.map((item) => item.id || 0)
        )
        .then(async (response) => {
            console.log("Start workflow response:", response);
            jobId.value = response.data;
            await selfLocalStorage.setItem("jobId", response.data);

            ElMessage.success("工作流已启动");
            browser.runtime.sendMessage({
                action: "startWork"
            });
        })
        .catch((error) => {
            console.error("Error starting workflow:", error);
            ElMessage.error("启动工作流失败，请稍后重试");
        })
        .finally(() => {
            loading.value = false;
        });
};
const stopJob = () => {
    if (jobId.value === "") {
        ElMessage.warning("当前没有正在运行的工作流");
        return;
    }
    //停止任务
    loading.value = true;
    workflowApi
        .stopWorkFlows(jobId.value)
        .then((response) => {
            workflowApi
                .uploadLog({
                    jobId: jobId.value,
                    content: logs.value
                })
                .then(() => {
                    console.log("日志上传成功");
                });
            console.log("Stop workflow response:", response);
            ElMessage.success("工作流已停止");
            jobId.value = "";
            selfLocalStorage.removeItem("jobId");
            selfLocalStorage.removeItem("logs");
            // selfLocalStorage.removeItem("usedTweetIds");
            logs.value = [];
        })
        .catch((error) => {
            console.error("Error stopping workflow:", error);
            ElMessage.error("停止工作流失败，请稍后重试");
        })
        .finally(() => {
            loading.value = false;
        });
};
// 方法
const backHome = (lists: WorkFlowData[]) => {
    showContent.value = "home";
    selectflows.value = lists;
    selfLocalStorage.setItem("workflow", JSON.stringify(lists));
};
const back = () => {
    showContent.value = "home";
};
const openWeb = () => {
    window.open(webURL, "_blank");
};

const openWorkflowList = async () => {
    if (!props.xData?.accountId) {
        ElMessage.warning("请先登录X账户");
        return;
    }
    let curJobId = await selfLocalStorage.getItem("jobId");
    if (curJobId) {
        ElMessage.warning("当前有正在运行的工作流，请先停止");
        return;
    }
    loading.value = true;
    showContent.value = "workflow";
    workflowApi
        .getWorkflows(props.xData?.accountId)
        .then((response) => {
            workflows.value = response.data;
            if (workflows.value.length === 0) {
                ElMessage.warning("请先创建工作流");
                // showContent.value = "home";
                // workflows.value = [
                //     {
                //         id: 1,
                //         workflowName: "自动回复工作流",
                //         workflowDetails:
                //             "自动回复用户提及和私信，提升客户服务效率自动回复用户提及和私信，提升客户服务效率自动回复用户提及和私信，提升客户服务效率自动回复用户提及和私信，提升客户服务效率",
                //         accountName: "@tech_support_bot"
                //     },
                //     {
                //         id: 2,
                //         workflowName: "内容发布定时器",
                //         workflowDetails:
                //             "定时发布营销内容和产品更新，保持账号活跃度",
                //         accountName: "@marketing_pro"
                //     },
                //     {
                //         id: 3,
                //         workflowName: "关键词监控流程",
                //         workflowDetails:
                //             "监控品牌关键词提及，及时响应用户反馈和评论",
                //         accountName: "@brand_monitor"
                //     },
                //     {
                //         id: 4,
                //         workflowName: "粉丝互动增长",
                //         workflowDetails:
                //             "自动点赞、转发相关内容，增加账号曝光和粉丝互动",
                //         accountName: "@growth_hacker"
                //     },
                //     {
                //         id: 5,
                //         workflowName: "数据分析报告",
                //         workflowDetails:
                //             "收集并分析推文表现数据，生成周期性分析报告",
                //         accountName: "@data_analyst"
                //     },
                //     {
                //         id: 6,
                //         workflowName: "竞品监控系统",
                //         workflowDetails:
                //             "跟踪竞争对手动态，分析市场趋势和营销策略",
                //         accountName: "@competitor_watch"
                //     },
                //     {
                //         id: 7,
                //         workflowName: "用户标签分类",
                //         workflowDetails:
                //             "根据用户行为和兴趣自动分类，实现精准营销推送",
                //         accountName: "@user_segmentation"
                //     },
                //     {
                //         id: 8,
                //         workflowName: "危机公关处理",
                //         workflowDetails:
                //             "实时监控负面评论，自动触发危机公关响应流程",
                //         accountName: "@crisis_management"
                //     },
                //     {
                //         id: 9,
                //         workflowName: "影响者合作流程",
                //         workflowDetails:
                //             "识别并联系潜在合作的影响者，管理合作项目进度",
                //         accountName: "@influencer_mgr"
                //     },
                //     {
                //         id: 10,
                //         workflowName: "多语言内容发布",
                //         workflowDetails:
                //             "自动翻译并发布多语言内容，扩大国际市场覆盖",
                //         accountName: "@global_content"
                //     }
                // ];
            }
        })
        .catch((error) => {
            console.error("Error fetching workflows:", error);

            if (error.message.indexOf("用户未授权") !== -1) {
                ElMessage.error("用户未授权，请先登录");
                emit("logout");
            } else {
                ElMessage.error("获取工作流失败，请稍后重试");
            }
        })
        .finally(() => {
            loading.value = false;
        });
};
const checkX = async () => {
    // 检测 Twitter 账户逻辑
    emit("checkX");
};
const handleLogout = () => {
    console.log("注销");
};

const handleAdmin = () => {
    console.log("后台管理");
};

const handleDetectAccount = () => {
    console.log("检测账户");
};

const handleSelectWorkflow = () => {
    console.log("选择工作流");
};

const handleStart = () => {
    console.log("开启");
};
</script>

<style scoped lang="scss">
.home-container {
    width: 100%;
    height: 100%;
    background: linear-gradient(136deg, #fefafb 0%, #e7f9fd 100%);
    box-shadow: 0px 4px 16px 0px rgba(0, 0, 0, 0.15);
    // border-radius: 12px 12px 12px 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.header {
    width: calc(100% - 40px);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px;

    .user-info {
        display: flex;
        align-items: center;
        .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;

            svg {
                width: 32px !important;
                height: 32px !important;
            }
            img {
                width: 32px;
                object-fit: contain;
                height: 32px;
                border-radius: 50%;
            }
        }

        .username {
            font-family: PingFang SC, PingFang SC;
            font-weight: 600;
            font-size: 16px;
            color: rgba(0, 0, 0, 0.85);
            text-align: left;
            font-style: normal;
            text-transform: none;
        }
    }

    .header-actions {
        display: flex;

        .logout-btn {
            cursor: pointer;
            height: 20px;
            font-family: PingFang SC, PingFang SC;
            font-weight: 400;
            font-size: 14px;
            color: #9e40ff;
            text-align: left;
            font-style: normal;
            text-transform: none;
            height: 34px;
            line-height: 34px;
        }

        .admin-btn {
            cursor: pointer;
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
            width: 112px;
            height: 34px;
            background: #9e40ff;
            border-radius: 8px 8px 8px 8px;
            margin-left: 24px;
        }

        .comment-btn {
            display: none;
        }
    }
}
.nav-tabs {
    display: flex;
    justify-content: center;
    gap: 40px;
    margin-bottom: 20px;

    .nav-tab-item {
        font-family: PingFang SC;
        font-size: 16px;
        font-weight: 500;
        color: #999;
        cursor: pointer;
        padding-bottom: 6px;
        position: relative;
        transition: all 0.3s;

        &.active {
            color: #9e40ff;
            font-weight: 600;

            &::after {
                content: "";
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 24px;
                height: 3px;
                background: #9e40ff;
                border-radius: 2px;
            }
        }
    }
}

.home_content {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
    overflow: hidden;
}
.content {
    margin: 0 auto;
    padding: 20px;
    width: 417px;
    height: 56px;
    background: #ffffff;
    border-radius: 12px 12px 12px 12px;
}

.info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    .row_wrap {
        display: flex;
        align-items: center;
        justify-content: start;
        min-width: 0;
        .label {
            font-family: PingFang SC, PingFang SC;
            font-weight: 400;
            font-size: 14px;
            color: rgba(0, 0, 0, 0.65);
            line-height: 22px;
            text-align: left;
            font-style: normal;
            text-transform: none;
            min-width: max-content;
        }
        .value {
            font-family: PingFang SC, PingFang SC;
            font-weight: 400;
            font-size: 14px;
            color: #000000;
            line-height: 22px;
            text-align: left;
            font-style: normal;
            text-transform: none;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            min-width: 0;
        }
        .tips {
            font-family: PingFang SC, PingFang SC;
            font-weight: 400;
            font-size: 14px;
            color: rgba(0, 0, 0, 0.25);
            line-height: 22px;
            text-align: left;
            font-style: normal;
            text-transform: none;
        }
    }

    .action-btn {
        cursor: pointer;
        font-family: PingFang SC, PingFang SC;
        font-weight: 400;
        font-size: 14px;
        color: #9e40ff;
        line-height: 22px;
        text-align: left;
        font-style: normal;
        text-transform: none;
        min-width: max-content;
    }
    .actionDisable {
        color: rgba(0, 0, 0, 0.25);
        cursor: not-allowed;
    }
}
.info-row:last-child {
    margin-bottom: 0;
}
.start-section {
    display: flex;
    justify-content: center;
    margin-top: 68px;
    margin-bottom: 30px;
    .start-btn {
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 162px;
        height: 40px;
        background: #9e40ff;
        border-radius: 8px 8px 8px 8px;
        font-family: PingFang SC, PingFang SC;
        font-weight: 500;
        font-size: 18px;
        color: #ffffff;
        line-height: 28px;
        text-align: left;
        font-style: normal;
        text-transform: none;
    }
    .actionDisable {
        background: #d0a3ff;
    }

    .stop-btn {
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 162px;
        height: 40px;
        background: #ff4040;
        border-radius: 8px 8px 8px 8px;
        font-family: PingFang SC, PingFang SC;
        font-weight: 500;
        font-size: 18px;
        color: #ffffff;
        line-height: 28px;
        text-align: left;
        font-style: normal;
        text-transform: none;
        position: relative;
        .tips {
            position: absolute;
            bottom: 45px;
            left: 50%;
            transform: translate(-50%);
            width: 300px;
            font-family: PingFang SC, PingFang SC;
            font-weight: 400;
            font-size: 12px;
            color: #000;
            text-align: center;
            font-style: normal;
            text-transform: none;
        }
    }
}

.log_wrap {
    width: 457px;
    flex: 1;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 12px 12px 0px 0px;
    margin-bottom: 20px;
    overflow-y: auto;
    padding-top: 10px;
    min-height: 250px;
    .log_item {
        display: flex;
        flex-direction: column;
        align-items: start;
        .time {
            font-family: PingFang SC, PingFang SC;
            font-weight: 400;
            font-size: 14px;
            color: #999999;
            text-align: left;
            font-style: normal;
            text-transform: none;
        }
        .log {
            font-family: PingFang SC, PingFang SC;
            font-weight: 400;
            font-size: 14px;
            color: #000000;
            text-align: left;
            font-style: normal;
            text-transform: none;
        }
        margin-inline: 18px;
        margin-bottom: 16px;
    }
}
</style>
