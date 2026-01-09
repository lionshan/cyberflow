import { selfLocalStorage } from "@/utils/storage";
import { workflowApi } from "@/api/api";
let queue: Array<{ time: string; log: string; showUser: boolean }> = [];
let loading = false;
export const logInfo = (message: string, showUser: boolean = true) => {
    queue.push({
        time: new Date().toLocaleTimeString(),
        log: message,
        showUser: showUser
    });
    if (loading) return;
    loading = true;
    selfLocalStorage.getItem("logs").then((logs) => {
        let logArray = logs ? JSON.parse(logs) : [];
        logArray.push(...queue);
        if (logArray.length > 100) {
            logArray = logArray.slice(-100);
            //上传服务端
            selfLocalStorage.getItem("jobId").then((id) => {
                if (id) {
                    workflowApi
                        .uploadLog({
                            jobId: id,
                            content: logs
                        })
                        .then(() => {
                            console.log("日志上传成功");
                        });
                }
            });
        }
        selfLocalStorage
            .setItem("logs", JSON.stringify(logArray))
            .then(() => {})
            .finally(() => {
                queue = [];
                loading = false;
            });
    });
};
