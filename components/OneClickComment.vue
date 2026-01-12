<template>
    <div class="one-click-comment-container">
        <div class="selection-area">
            <span class="label">AI 智能体选择</span>
            <el-select v-model="selectedAgentId" placeholder="请选择智能体" class="agent-select" :loading="isLoadingAgents" @visible-change="handleVisibleChange">
                <el-option v-for="item in agentOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
        </div>

        <div class="action-area">
            <div class="action-area">
                <el-button type="primary" class="action-btn" color="#9e40ff" :loading="isRunning" :disabled="!selectedAgentId && !isRunning" @click="toggleRun">
                    {{ isRunning ? "运行中" : "一键回复" }}
                </el-button>
                <el-button v-if="isRunning" type="primary" class="action-btn" color="#9e40ff" @click="clickStopLoading"> 停止 </el-button>
            </div>
        </div>

        <div class="logs-area">
            <div class="logs-header">运行日志</div>
            <div class="logs-content" ref="logsContainer">
                <div v-for="(log, index) in logs" :key="index" class="log-item">
                    <span class="log-time">[{{ log.time }}]</span>
                    <span class="log-text">{{ log.message }}</span>
                </div>
                <div v-if="logs.length === 0" class="empty-tip">暂无日志</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from "vue";
import { ElMessage } from "element-plus";
import { workflowApi, userApi } from "../api/api";
import type { AgentItem } from "../api/api";
import { selfLocalStorage } from "@/utils/storage";

// Types
export interface AgentOption {
    label: string;
    value: string | number;
}

interface LogItem {
    time: string;
    message: string;
    type?: "info" | "success" | "error";
}

const props = defineProps<{
    curUserName?: string;
}>();

const emit = defineEmits<{
    (e: "start", agentId: string | number): void;
    (e: "stop"): void;
    (e: "back"): void;
    (e: "stopOneClickComment"): void;
}>();

interface ExtendedAgentOption extends AgentOption {
    author: string;
}

// State
const selectedAgentId = ref<string | number>("");
const isRunning = ref(false);
const logs = ref<LogItem[]>([]);
const logsContainer = ref<HTMLElement | null>(null);
const internalAgentOptions = ref<ExtendedAgentOption[]>([]);
const allAgentOptions = ref<ExtendedAgentOption[]>([]); // Store all fetched agents
const isLoadingAgents = ref(false);

const agentOptions = computed(() => {
    return internalAgentOptions.value;
});

const filterAgentList = () => {
    if (!props.curUserName) {
        internalAgentOptions.value = [];
        return;
    }

    console.log("Filtering agents for user:", props.curUserName);
    internalAgentOptions.value = allAgentOptions.value.filter((item) => item.author == props.curUserName);
};

const fetchAgentList = async () => {
    isLoadingAgents.value = true;
    try {
        const res = await workflowApi.getAgentList({
            pageNum: 1,
            pageSize: 100, // 获取足够多的数量
            dataType: "owned"
        });

        if (res.data && Array.isArray(res.data.rows)) {
            allAgentOptions.value = res.data.rows.map((item: AgentItem) => ({
                label: item.nickname || `智能体 ${item.id}`,
                author: item.author || "",
                value: item.id
            }));

            filterAgentList();
        }
    } catch (error) {
        console.error("获取智能体列表失败:", error);
        ElMessage.error("获取智能体列表失败");
    } finally {
        isLoadingAgents.value = false;
    }
};

const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    logs.value.push({
        time: timeStr,
        message,
        type
    });

    // Auto scroll
    nextTick(() => {
        if (logsContainer.value) {
            logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
        }
    });
};

const stopLoading = () => {
    isRunning.value = false;
    addLog("任务结束", "info");
};

const clickStopLoading = () => {
    emit("stopOneClickComment");
};
const handleMessage = (message: any) => {
    if (message.action === "oneClickCommentStatus") {
        const { status, log } = message.data || {};
        if (log) {
            addLog(log);
        }
        if (status === "completed") {
            stopLoading();
            ElMessage.success("一键评论任务完成");
        } else if (status === "error") {
            // stopLoading();
            ElMessage.error(log || "一键评论任务出错");
        }
    }
};

// Fetch agents on mount
onMounted(async () => {
    // Restore state from storage

    await fetchAgentList();

    // 检查是否有开始时间，如果有则获取历史记录
    const startTimeStr = await selfLocalStorage.getItem("oneClickCommentStartTime");
    const xUserName = await selfLocalStorage.getItem("xUserName");

    if (startTimeStr && xUserName) {
        try {
            console.log("Fetching history logs...", startTimeStr);
            const res = await userApi.getReplyTweets({
                userTwitterAccount: xUserName,
                beginCreateTime: new Date(startTimeStr),
                endCreateTime: new Date()
            });
            if (res.data && Array.isArray(res.data)) {
                res.data.forEach((tweet: string) => {
                    // Check if already in logs to avoid duplicate if running?
                    // But onMount logs are empty usually.
                    addLog(`[历史] 已回复: ${tweet}`, "success");
                });
            }
        } catch (e) {
            console.error("Fetch history failed", e);
        }
    }

    const savedAgentId = await selfLocalStorage.getItem("oneClick_selectedAgentId");
    if (savedAgentId) {
        // 校验该 ID 是否在当前可选列表中
        // 注意：LocalStorage 取出是 string，需要确保与选项中的 value 类型匹配
        const exists = internalAgentOptions.value.find((opts) => String(opts.value) === savedAgentId);

        if (exists) {
            selectedAgentId.value = exists.value;
            console.log("Restored selectedAgentId:", selectedAgentId.value);
        } else {
            console.log("Saved agent ID not found in current list:", savedAgentId);
        }
    }

    // Note: restoring isRunning state might need careful handling.
    // If the popup was closed, the background task might still be running or finished.
    // For now, let's restore it, but usually we need to check with background script for real status.
    const savedIsRunning = await selfLocalStorage.getItem("oneClick_isRunning");
    if (savedIsRunning === "true") {
        isRunning.value = true;
    }

    browser.runtime.onMessage.addListener(handleMessage);
});

onUnmounted(() => {
    browser.runtime.onMessage.removeListener(handleMessage);
});

watch(
    () => props.curUserName,
    (newVal) => {
        if (newVal) {
            console.log("curUserName updated:", newVal);
            filterAgentList();
        }
    },
    { immediate: true }
);

// Watchers for persistence
watch(selectedAgentId, (newVal) => {
    selfLocalStorage.setItem("oneClick_selectedAgentId", String(newVal));
});

watch(isRunning, (newVal) => {
    selfLocalStorage.setItem("oneClick_isRunning", String(newVal));
});

// 方法
const handleBack = () => {
    emit("back");
};

const handleVisibleChange = (visible: boolean) => {
    if (visible) {
        fetchAgentList();
    }
};

// Actions
const toggleRun = () => {
    if (isRunning.value) {
        return;
    }
    logs.value = []; // 清空日志
    if (!selectedAgentId.value) {
        ElMessage.warning("请先选择 AI 智能体");
        return;
    }

    startTask();
};

const startTask = () => {
    isRunning.value = true;
    addLog("开始执行任务...", "info");
    emit("start", selectedAgentId.value);
};

defineExpose({
    addLog,
    stopLoading,
    selectedAgentId // expose if needed
});
</script>

<style scoped lang="scss">
.one-click-comment-container {
    display: flex;
    flex-direction: column;
    width: 417px;
    margin: 0 auto;
    padding: 24px 20px;
    box-sizing: border-box;
    background-color: #fff;
    border-radius: 12px;
    height: calc(100% - 20px); // 留出一点底部间距
    margin-bottom: 20px;

    .selection-area {
        margin-bottom: 24px;

        .label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            color: rgba(0, 0, 0, 0.65);
            font-family: PingFang SC;
        }

        .agent-select {
            width: 100%;
        }
    }

    .action-area {
        margin-bottom: 24px;
        width: 100%;
        display: flex;
        .action-btn {
            flex: 1;
            height: 40px;
            font-size: 16px;
            font-weight: 500;
            border-radius: 8px;
            font-family: PingFang SC;
        }
    }

    .logs-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        border: 1px solid #ebeef5;
        border-radius: 8px;
        overflow: hidden;
        min-height: 0; // 关键，防止 flex 子项溢出
        background-color: #fcfcfc;

        .logs-header {
            padding: 12px 16px;
            background-color: #f5f7fa;
            border-bottom: 1px solid #ebeef5;
            font-size: 14px;
            color: #606266;
            font-weight: 600;
            font-family: PingFang SC;
        }

        .logs-content {
            flex: 1;
            padding: 12px;
            overflow-y: auto;
            background-color: #ffffff;
            font-family: monospace;

            .log-item {
                margin-bottom: 8px;
                font-size: 13px;
                line-height: 1.6;
                word-break: break-all;
                display: flex;

                .log-time {
                    color: #909399;
                    margin-right: 10px;
                    flex-shrink: 0;
                }

                .log-text {
                    color: #303133;
                }
            }

            .empty-tip {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
                color: #c0c4cc;
                font-size: 13px;
                padding: 20px 0;
            }
        }
    }
}
</style>
