import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { selfLocalStorage } from "@/utils/storage.js";
import { ElMessage } from "element-plus";
// 自定义错误类型
export class ApiError extends Error {
    public code?: number;
    public status?: number;
    public data?: any;
    public type?: string;

    constructor(message: string, code?: number, status?: number, data?: any, type?: string) {
        super(message);
        this.name = "ApiError";
        this.code = code;
        this.status = status;
        this.data = data;
        this.type = type;
    }
}

// API响应的基础接口
export interface ApiResponse<T = any> {
    code: number;
    message?: string;
    msg?: string;
    data: T;
    success?: boolean;
    total?: number;
}

// 请求配置接口
export interface RequestConfig extends AxiosRequestConfig {
    showLoading?: boolean;
    showError?: boolean;
}

// 工作流数据接口
export interface WorkFlowData {
    id?: number;
    workflowName?: string;
    workflowDetails?: string;
    accountName?: string;
}

// 用户登录参数接口
export interface LoginCredentials {
    username: string;
    password: string;
    captchaCode?: string;
    captchaCodeKey?: string;
}

// 用户登录响应接口
export interface LoginResponse {
    token: string;
    userInfo?: any;
    [key: string]: any;
}

const baseURL: string = import.meta.env.VITE_API_BASE_URL || "";

// console.log("baseURLbaseURLbaseURLbaseURL", baseURL, import.meta.env);

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
    baseURL: baseURL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
    }
});

// 请求拦截器
apiClient.interceptors.request.use(
    async (config) => {
        // 在发送请求之前添加token
        const token = await selfLocalStorage.getItem("token");
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 添加时间戳防止缓存
        if (config.method === "get") {
            config.params = {
                ...config.params,
                _t: Date.now()
            };
        }

        // console.log("Request sent:", config);
        return config;
    },
    (error) => {
        // console.error("Request error:", error);
        return Promise.reject(error);
    }
);

// 响应拦截器
apiClient.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
        // console.log("Response received:", response);

        // 统一处理响应数据
        const { data, status } = response;

        if (status === 200) {
            // 根据后端约定的数据结构处理
            if (data.code === 0) {
                return data as any; // 返回处理后的数据
            } else if (data.code === 106) {
                selfLocalStorage.removeItem("token");
                selfLocalStorage.removeItem("page");
                ElMessage.error("登录已过期，请重新登录");
                window.location.reload();
            } else {
                // 业务错误
                throw new ApiError(data.message || data.msg || "请求失败", data.code);
            }
        }

        return response as any; // 返回原始响应
    },
    (error) => {
        // console.error("Response error:", error);

        // 处理HTTP错误状态码
        if (error.response) {
            const { status, data } = error.response;

            switch (status) {
                case 401:
                    // 未授权，清除token并跳转登录
                    localStorage.removeItem("token");
                    sessionStorage.removeItem("token");
                    // 可以在这里添加跳转登录的逻辑
                    console.warn("未授权，请重新登录");
                    break;
                case 403:
                    console.warn("权限不足");
                    break;
                case 404:
                    console.warn("请求的资源不存在");
                    break;
                case 500:
                    console.error("服务器内部错误");
                    break;
                default:
                    console.error(`请求失败，状态码: ${status}`);
            } // 返回后端返回的错误信息
            const errorMessage = data?.message || `HTTP Error ${status}`;
            const customError = new ApiError(errorMessage, undefined, status, data);

            return Promise.reject(customError);
        } else if (error.request) {
            // 网络错误
            const networkError = new ApiError("网络错误，请检查网络连接", undefined, undefined, undefined, "network");
            return Promise.reject(networkError);
        } else {
            // 其他错误
            return Promise.reject(error);
        }
    }
);

/**
 * 通用API请求方法
 */
export const request = {
    /**
     * GET请求
     * @param url - 请求URL
     * @param params - 查询参数
     * @param config - axios配置
     * @returns Promise
     */
    get: <T = any>(url: string, params: Record<string, any> = {}, config: RequestConfig = {}): Promise<ApiResponse<T>> => {
        return apiClient.get(url, { params, ...config });
    },

    /**
     * POST请求
     * @param url - 请求URL
     * @param data - 请求数据
     * @param config - axios配置
     * @returns Promise
     */
    post: <T = any>(url: string, data: Record<string, any> = {}, config: RequestConfig = {}): Promise<ApiResponse<T>> => {
        return apiClient.post(url, data, config);
    },

    /**
     * PUT请求
     * @param url - 请求URL
     * @param data - 请求数据
     * @param config - axios配置
     * @returns Promise
     */
    put: <T = any>(url: string, data: Record<string, any> = {}, config: RequestConfig = {}): Promise<ApiResponse<T>> => {
        return apiClient.put(url, data, config);
    },

    /**
     * DELETE请求
     * @param url - 请求URL
     * @param config - axios配置
     * @returns Promise
     */
    delete: <T = any>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> => {
        return apiClient.delete(url, config);
    },

    /**
     * PATCH请求
     * @param url - 请求URL
     * @param data - 请求数据
     * @param config - axios配置
     * @returns Promise
     */
    patch: <T = any>(url: string, data: Record<string, any> = {}, config: RequestConfig = {}): Promise<ApiResponse<T>> => {
        return apiClient.patch(url, data, config);
    },

    /**
     * 文件上传
     * @param url - 上传URL
     * @param formData - 文件数据
     * @param onUploadProgress - 上传进度回调
     * @returns Promise
     */
    upload: <T = any>(url: string, formData: FormData, onUploadProgress?: (progressEvent: any) => void): Promise<ApiResponse<T>> => {
        return apiClient.post(url, formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            },
            onUploadProgress
        });
    },

    /**
     * 下载文件
     * @param url - 下载URL
     * @param params - 查询参数
     * @returns Promise
     */
    download: (url: string, params: Record<string, any> = {}): Promise<Blob> => {
        return apiClient.get(url, {
            params,
            responseType: "blob"
        });
    }
};

/**
 * 工作流相关API
 */
export const workflowApi = {
    //批量启动工作流
    getRemoteVersion: (): Promise<ApiResponse<any>> => {
        return request.get<string>(`/api/cyberflow/plugin/version/latest`);
    },
    startWorkFlows: (account: string, workflowIds: number[]): Promise<ApiResponse<any>> => {
        return request.post<any>(`/api/cyberflow/plugin/workflow/start`, {
            account,
            workflowIds
        });
    },
    stopWorkFlows: (jobId: string): Promise<ApiResponse<any>> => {
        return request.get<any>(`/api/cyberflow/plugin/workflow/stop`, {
            jobId
        });
    },
    getJobIdStatus: (jobId: string): Promise<ApiResponse<any>> => {
        return request.get<any>(`/api/cyberflow/plugin/workflow/running-status`, {
            jobId
        });
    },

    checkMission: (missionId: string): Promise<ApiResponse<any>> => {
        return request.get<any>(`/api/cyberflow/plugin/mission/check-mission?missionId=${missionId}`);
    },
    heartRequest: (jobId: string): Promise<ApiResponse<any>> => {
        return request.get<any>(`/api/cyberflow/plugin/workflow/heart`, {
            jobId
        });
    },
    /**
     * 获取工作流列表
     * @returns Promise<ApiResponse<WorkFlowData[]>>
     */
    getWorkflows: (account: string): Promise<ApiResponse<WorkFlowData[]>> => {
        return request.get<WorkFlowData[]>("/api/cyberflow/plugin/workflow/list", { account });
    },

    getTaskList: (workflowId: number, pageNum: number, pageSize: number, orderColumn?: string, orderDirection?: string): Promise<ApiResponse<any[]>> => {
        return request.get<any[]>(`/api/cyberflow/mission/page`, {
            workflowId: workflowId,
            pageNum: pageNum,
            pageSize: pageSize,
            orderColumn,
            orderDirection
        });
    },

    getNeedPushList: (workflowId: number): Promise<ApiResponse<any[]>> => {
        return request.get<any[]>(`/api/cyberflow/plugin/mission/get-mission`, {
            workflowId: workflowId
        });
    },

    finishedTask: (data: any): Promise<ApiResponse<any>> => {
        return request.post<any>(`/api/cyberflow/plugin/mission/finished`, {
            ...data
        });
    },
    cancelTask: (missionId: string, reason: string): Promise<ApiResponse<any>> => {
        return request.post<any>(`/api/cyberflow/plugin/mission/cancel?missionId=${missionId}&reason=${reason}`);
    },

    getReply: (missionId: string, content: string): Promise<ApiResponse<any>> => {
        return request.post<any>(`/api/cyberflow/plugin/mission/reply`, {
            missionId,
            content
        });
    },

    uploadLog: (data: any): Promise<ApiResponse<any>> => {
        return request.post<any>(`/api/cyberflow/plugin/log/log`, {
            ...data
        });
    }
};

/**
 * 用户相关API
 */
export const userApi = {
    /**
     * 用户登录
     * @param name - 用户名
     * @param password - 密码
     * @returns Promise
     */
    login: (name: string, password: string): Promise<ApiResponse<LoginResponse>> => {
        return request.post<LoginResponse>("/api/login-by-email", {
            username: name,
            password: password,
            captchaCode: "",
            captchaCodeKey: ""
        });
    },

    /**
     * 用户登出
     * @returns Promise
     */
    logout: (): Promise<ApiResponse<any>> => {
        return request.get("/api/logout");
    },

    checkXAccount: (account: string): Promise<ApiResponse<any>> => {
        return request.get("/api/cyberflow/plugin/account/check-account", {
            account
        });
    },
    /**
     * 获取用户信息
     * @returns Promise
     */
    getUserInfo: (): Promise<ApiResponse<any>> => {
        return request.get("/api/user/profile");
    },

    /**
     * 更新用户信息
     * @param data - 用户数据
     * @returns Promise
     */
    updateUserInfo: (data: Record<string, any>): Promise<ApiResponse<any>> => {
        return request.put("/api/user/profile", data);
    },

    /**
     * 修改密码
     * @param data - 密码数据
     * @returns Promise
     */
    changePassword: (data: { oldPassword: string; newPassword: string }): Promise<ApiResponse<boolean>> => {
        return request.put("/api/user/password", data);
    }
};

/**
 * API工具类
 */
export class ApiUtils {
    /**
     * 设置基础URL
     */
    static setBaseURL(baseURL: string): void {
        apiClient.defaults.baseURL = baseURL;
    }

    /**
     * 设置超时时间
     */
    static setTimeout(timeout: number): void {
        apiClient.defaults.timeout = timeout;
    }

    /**
     * 设置默认请求头
     */
    static setDefaultHeaders(headers: Record<string, string>): void {
        Object.assign(apiClient.defaults.headers, headers);
    }

    /**
     * 获取当前配置
     */
    static getConfig(): AxiosRequestConfig {
        return apiClient.defaults as AxiosRequestConfig;
    }
}

// 导出axios实例
export { apiClient };

// 默认导出request对象
export default request;
