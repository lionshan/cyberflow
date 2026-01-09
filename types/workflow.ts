// 工作流相关的类型定义

/**
 * 工作流数据接口
 */
export interface WorkFlowData {
    /** 主键ID */
    id?: number;

    /** 工作流名称 */
    workflowName?: string;

    /** 工作流详情 */
    workflowDetails?: string;

    /** 账户名称 */
    accountName?: string;
}
