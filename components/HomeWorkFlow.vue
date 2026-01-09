<template>
    <div class="workflow-container">
        <!-- 头部导航 -->
        <div class="header">
            <div class="back-btn" @click="handleBack">
                <svg class="back-icon" viewBox="0 0 24 24">
                    <path
                        d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                        fill="currentColor"
                    />
                </svg>
                返回主页
            </div>
            <div class="select-info">选择{{ selectedCount }}项</div>
        </div>

        <!-- 工作流列表 -->
        <div class="workflow-list">
            <div
                v-for="(workflow, index) in workflowList"
                :key="workflow.id"
                class="workflow-item"
                :class="{ selected: isSelect(workflow) }"
                @click="toggleSelection(workflow)"
            >
                <div class="workflow-content">
                    <div class="workflow-title">
                        {{ workflow.workflowName }}
                    </div>
                    <div class="workflow-subtitle">
                        {{ workflow.workflowDetails }}
                    </div>
                </div>
                <div class="workflow-meta">
                    <div class="checkbox" v-if="isSelect(workflow)">
                        <svg class="check-icon" viewBox="0 0 24 24">
                            <path
                                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                                fill="white"
                            />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed } from "vue";
import type { WorkFlowData } from "@/types/workflow";
const props = defineProps({
    workflowList: {
        type: Array as () => WorkFlowData[],
        default: () => []
    },
    selectList: {
        type: Array as () => WorkFlowData[],
        default: () => []
    }
});
onMounted(() => {
    console.log("props.workflowList", props.workflowList);
    curSelectList.value = props.selectList;
});

// 工作流列表数据
// const workflowList = reactive<WorkflowItem[]>([
//     {
//         id: "1",
//         title: "1-关键字任务",
//         subtitle: "关键字任务",
//         time: "2025-05-05 16:21:21",
//         selected: false
//     },
//     {
//         id: "2",
//         title: "1-关键字任务",
//         subtitle: "关键字任务",
//         time: "2025-05-05 16:21:21",
//         selected: true
//     },
//     {
//         id: "3",
//         title: "1-关键字任务",
//         subtitle: "关键字任务",
//         time: "2025-05-05 16:21:21",
//         selected: false
//     },
//     {
//         id: "4",
//         title: "1-关键字任务",
//         subtitle: "关键字任务",
//         time: "2025-05-05 16:21:21",
//         selected: true
//     }
// ]);

// 计算选中的数量
const selectedCount = computed(() => {
    return curSelectList.value.length;
});
const curSelectList = ref<WorkFlowData[]>([]);
const isSelect = (item: WorkFlowData) => {
    return curSelectList.value.some((selectItem) => selectItem.id === item.id);
};

// 定义事件
const emit = defineEmits(["confirm"]);

// 方法
const handleBack = () => {
    emit("confirm", curSelectList.value);
};

const toggleSelection = (workflow: WorkFlowData) => {
    if (isSelect(workflow)) {
        curSelectList.value = curSelectList.value.filter(
            (item) => item.id !== workflow.id
        );
    } else {
        curSelectList.value.push(workflow);
    }
    console.log("curSelectList", curSelectList.value);
};
</script>

<style scoped lang="scss">
.workflow-container {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    flex-direction: column;
    overflow: hidden;
    width: calc(100% - 40px);
}

.header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;

    .back-btn {
        display: flex;
        align-items: center;
        cursor: pointer;
        font-family: PingFang SC, PingFang SC;
        font-weight: 400;
        font-size: 14px;
        color: #000000;
        text-align: left;
        font-style: normal;
        text-transform: none;

        .back-icon {
            width: 24px;
            height: 24px;
            margin-right: 5px;
        }
    }

    .select-info {
        font-family: PingFang SC, PingFang SC;
        font-weight: 400;
        font-size: 14px;
        color: #9e40ff;
        text-align: right;
        font-style: normal;
        text-transform: none;
    }
}

.workflow-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin-bottom: 20px;
}

.workflow-item {
    position: relative;
    cursor: pointer;
    width: 100%;
    height: 70px;
    background: #ffffff;
    border-radius: 12px 12px 12px 12px;
    border: 1px solid #dcdfe6;
    box-sizing: border-box;

    .workflow-content {
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: center;
        padding-inline: 20px;
        padding-block: 10px;
        min-width: 0;
        .workflow-title {
            height: 20px;
            font-family: PingFang SC, PingFang SC;
            font-weight: 400;
            font-size: 14px;
            color: #000000;
            text-align: center;
            font-style: normal;
            text-transform: none;
        }

        .workflow-subtitle {
            min-width: 0;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            height: 20px;
            font-family: PingFang SC, PingFang SC;
            font-weight: 400;
            font-size: 14px;
            color: #d9d9d9;
            text-align: center;
            font-style: normal;
            text-transform: none;
        }
    }

    .workflow-meta {
        position: absolute;
        right: 0px;
        top: 0px;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .workflow-time {
            font-size: 14px;
            color: #9ca3af;
        }

        .checkbox {
            border-radius: 0 12px 0 0;
            width: 18px;
            height: 18px;
            background: #9e40ff;
            display: flex;
            align-items: center;
            justify-content: center;

            .check-icon {
                width: 16px;
                height: 16px;
            }
        }
    }
}
.selected {
    border: 1px solid #9e40ff;
}
</style>
