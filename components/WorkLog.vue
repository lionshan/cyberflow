<template>
    <div class="logs_wrapper" v-loading="loading">
        <div class="title_head">
            <div class="title">
                当前工作流：{{ workflowName }}
                <span class="change_wrap" @click="emit('changeWorkflow')"
                    >切换工作流</span
                >
            </div>
            <div class="logout_btn" @click="emit('logout')">登出</div>
        </div>
        <el-table
            class="log_table"
            :data="tableData"
            height="452"
            style="background: unset; border-radius: 8px 8px 0 0"
        >
            <el-table-column label="发Twitter账号" width="110">
                <template #default="scope">
                    {{ workflowName }}
                </template>
            </el-table-column>
            <el-table-column prop="article" label="发Twitter内容" width="187">
                <template #default="scope">
                    <el-tooltip
                        class="box-item"
                        effect="dark"
                        :content="scope.row.article"
                        placement="top-start"
                    >
                        <div class="article" v-html="scope.row.article"></div>
                    </el-tooltip>
                </template>
            </el-table-column>
            <el-table-column prop="updateTime" label="时间" width="100">
                <template #default="scope">
                    <el-tooltip
                        class="box-item"
                        effect="dark"
                        :content="scope.row.updateTime"
                        placement="top-start"
                    >
                        {{ scope.row.updateTime }}
                    </el-tooltip>
                </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="60">
                <template #default="scope">
                    <el-tag :type="stateType(scope.row.status)">{{
                        stateText(scope.row.status)
                    }}</el-tag>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
            background
            layout="prev, pager, next"
            @prev-click="prevPage"
            @next-click="nextPage"
            @update:current-page="changePage"
            :current-page="pageNum"
            :total="total"
            :page-size="pageSize"
            v-if="total > 0"
        />
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, type Ref, defineEmits } from "vue";
import { onMounted } from "vue";
import { selfLocalStorage } from "@/utils/storage";
import { workflowApi } from "@/api/api";
import { ElMessage } from "element-plus";
const emit = defineEmits(["logout", "changeWorkflow"]);
const pageSize = 20;
const pageNum = ref(1);
const total = ref(0);
const loading = ref(false);
const tableData = ref([
    // {
    //     date: "2023-10-01",
    //     name: "账号1",
    //     address: "发Twitter内容1",
    //     status: "成功"
    // },
    // {
    //     date: "2023-10-02",
    //     name: "账号2",
    //     address: "发Twitter内容2",
    //     status: "失败"
    // }
]);
onMounted(async () => {
    loading.value = true;
    let workflow = await selfLocalStorage.getItem("workflow");
    workflowName.value = JSON.parse(workflow)?.workflowName || "";
    pageNum.value = 1;
    tableData.value = [];
    getTasks();
    //获取任务

    browser.runtime
        .sendMessage({
            action: "getWorkState"
        })
        .then((response) => {
            if (response.status === "running") {
            } else {
                ElMessage({
                    message: "当前没有正在运行的工作流",
                    type: "warning"
                });
                emit("changeWorkflow");
            }
        });
});

const getTasks = async () => {
    let workflow = await selfLocalStorage.getItem("workflow");
    let workflowObj = JSON.parse(workflow);
    workflowApi
        .getTaskList(
            workflowObj.id,
            pageNum.value,
            pageSize,
            "create_time",
            "descending"
        )
        .then((response) => {
            console.log(response);
            tableData.value = response.data.rows || [];
            total.value = Number(response.data.total) || 0;
            console.log("tableData", total.value);
        })
        .finally(() => {
            loading.value = false;
        });
};
const prevPage = () => {
    loading.value = true;
    if (pageNum.value > 1) {
        pageNum.value--;
        getTasks();
    }
};
const nextPage = () => {
    loading.value = true;
    if (pageNum.value * pageSize < total.value) {
        pageNum.value++;
        getTasks();
    }
};
const changePage = (val: number) => {
    loading.value = true;
    pageNum.value = val;
    getTasks();
};
const workflowName: Ref<string> = ref("");
const stateText = (val: string | number) => {
    switch (val) {
        case 0:
            return "已取消";
        case 1:
            return "运行中";
        case 2:
            return "已完成";
        case 4:
            return "失败";
        default:
            return "成功";
    }
};

const stateType = (val: string | number) => {
    switch (val) {
        case 0:
            return "warning";
        case 1:
            return "info";
        case 2:
            return "success";
        case 4:
            return "danger";
        default:
            return "success";
    }
};

const timeText = (val: string | number) => {
    const date = new Date(val);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};
</script>

<style scoped lang="scss">
.logs_wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    width: 100%;

    .title_head {
        width: calc(100% - 48px);
        margin: 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .title {
            font-family: PingFang SC, PingFang SC;
            font-weight: 600;
            font-size: 16px;
            color: rgba(0, 0, 0, 0.85);
            text-align: left;
            font-style: normal;
            text-transform: none;

            .change_wrap {
                margin-left: 12px;
                font-family: PingFang SC, PingFang SC;
                font-weight: 400;
                font-size: 14px;
                color: #9e40ff;
                text-align: left;
                font-style: normal;
                text-transform: none;
                cursor: pointer;
            }
        }

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

    .log_table {
        width: calc(100% - 48px);
        margin: 0 24px;
        margin-bottom: 12px;
    }
}

::v-deep .el-table .el-table__cell {
    padding: 0;
    background: unset;
}

::v-deep .el-table tr {
    background: unset;
}

::v-deep .el-table thead {
    border-radius: 0px 8px 0px 0px;
    background: #f3f1fe;
    font-family: PingFang SC, PingFang SC;
    font-weight: 600;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.85);
    line-height: 22px;
    text-align: left;
    font-style: normal;
    text-transform: none;
}

::v-deep .el-table .cell {
    padding-block: 12px;
    padding-inline: 8px;
    font-family: PingFang SC, PingFang SC;
    font-weight: 400;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.9);
    line-height: 22px;
    text-align: left;
    font-style: normal;
    text-transform: none;

    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
