import { selfLocalStorage } from "@/utils/storage";
import { logInfo } from "@/utils/logs";
import { workflowApi, userApi } from "@/api/api";
import { sendMessageWithRetry } from "@/utils/sendMessageRetry";
let timeroutHandle: any = null;
let taskState = "idle"; // 'idle' | 'processing'
let waitContentScriptLoaded = false;
export default defineBackground(() => {
    console.log("Hello background!", { id: browser.runtime.id });
    const closeWorkflow = async () => {
        let currentTabId = await selfLocalStorage.getItem("currentTabId");
        if (!currentTabId) {
            return;
        }
        browser.tabs.remove(Number(currentTabId), () => {
            selfLocalStorage.removeItem("currentTabId");
            selfLocalStorage.removeItem("jobId");
            selfLocalStorage.removeItem("workflow");
        });
    };

    const openX = async () => {
        let xTab: any = await getXTab();
        (globalThis as any).tabId = xTab.id;
    };
    const testFunction = async () => {
        //模拟测试发帖任务
        // switch ("") {
        //     case value:
        //         break;

        //     default:
        //         break;
        // }
        console.log("Test function called");
        setTimeout(() => {
            browser.tabs.sendMessage(
                (globalThis as any).tabId,
                {
                    action: "publishX",
                    data: {
                        text: "测试发帖 from 插件",
                        missionId: "test-mission-id",
                        userName: "test-user"
                    }
                },
                function (response) {
                    console.log("测试发帖 from 插件response", response);
                }
            );
        }, 1000);
    };
    const generateComment = async (sendResponse: (response: any) => void, requestData: any) => {
        const { missionId, tweetId, tweetText } = requestData;
        try {
            const res = await workflowApi.getReply(missionId, tweetText);
            console.log("res", res);
            if (res.code == 10014) {
                //关闭这里应该重新登录
                closeWorkflow();
                sendResponse(false);
            } else {
                sendResponse(res.data);
            }
        } catch (error) {
            sendResponse(error);
        }
        return true;
    };
    const generateOneClickComment = async (sendResponse: (response: any) => void, requestData: any) => {
        const { aiId, tweetId, tweetText } = requestData;
        try {
            const res = await workflowApi.getReplyV2({
                aiId: aiId,
                content: tweetText
            });
            console.log("res", res);
            if (res.code == 10014) {
                //关闭这里应该重新登录
                closeWorkflow();
                sendResponse(false);
            } else {
                sendResponse(res.data);
            }
        } catch (error) {
            sendResponse(error);
        }
        return true;
    };
    const taskErrorFinished = async () => {
        let currentTabId = Number(await selfLocalStorage.getItem("currentTabId"));
        if (currentTabId) {
            await new Promise((resolve) => {
                browser.tabs.remove(currentTabId, () => {
                    selfLocalStorage.removeItem("currentTabId").then(() => {
                        resolve(true);
                    });
                });
            });
        }
        if (timeroutHandle) {
            clearTimeout(timeroutHandle);
            timeroutHandle = null;
        }
        taskState = "idle";
        return true;
    };
    const taskFinished = async () => {
        let currentTabId = Number(await selfLocalStorage.getItem("currentTabId"));
        try {
            await sendMessageWithRetry(currentTabId, {
                action: "changeTabUrl",
                data: {
                    url: `https://x.com/home?cybeflow=true`
                }
            });
        } catch (error) {
            await new Promise((resolve) => {
                browser.tabs.remove(currentTabId, () => {
                    selfLocalStorage.removeItem("currentTabId").then(() => {
                        resolve(true);
                    });
                });
            });
        }
        if (timeroutHandle) {
            clearTimeout(timeroutHandle);
            timeroutHandle = null;
        }
        taskState = "idle";
        return true;
    };
    const eventCallback = async (response: any, currentTabId: number, task: any) => {
        if (response) {
            console.log("成功", response);
            if (response.result === true) {
                let responseData: {
                    missionId: any;
                    content?: any;
                    replyContent?: any;
                    tweetId?: any;
                    postTweetId?: any;
                } = {
                    missionId: response.task.missionId
                };
                if (response.task.eventtype === "plugin_comment_event") {
                    responseData = {
                        missionId: response.task.missionId,
                        content: response.task.needCommentContent,
                        replyContent: response.task.replyContent,
                        tweetId: response.task.tweetId,
                        postTweetId: response.task.postTweetId
                    };
                }
                if (response.task.eventtype === "post_tweet_event") {
                    responseData = {
                        missionId: response.task.missionId,
                        postTweetId: response.task.tweetId
                    };
                }
                await workflowApi.finishedTask(responseData);
                logInfo("插件：" + `任务处理完成: ${response.task.workflowName}(${response.task.missionId})`);
                return await taskFinished(task);
            } else {
                console.error("任务处理失败:", response.result);
                let needShow = false;
                if (response.result.indexOf("页面已到底部，无法获取更多内容,等待新内容出现") !== -1) {
                    needShow = true;
                }
                logInfo("插件错误：" + `任务处理失败: ${response.result}`, needShow);
                if (response.task) {
                    await workflowApi.cancelTask(response.task.id, response.result);
                    return await taskFinished(task);
                }
            }
        } else {
            console.log("rrrrrr:", response);
            return await taskErrorFinished(task);
        }
    };
    (globalThis as any).testFunction = testFunction;
    (globalThis as any).openX = openX;
    browser.runtime.onInstalled.addListener(() => {
        // 创建一个每分钟触发的定时器
        console.log("创建一个每分钟触发的定时器Extension installed or updated");
        browser.alarms.create("periodicAlarm", { periodInMinutes: 1 });
    });
    browser.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === "periodicAlarm") {
            console.log("Periodic alarm triggered");
            console.log("currentTabId", selfLocalStorage.getItem("currentTabId"));
            // 执行定时任务

            requestTask();
        }
    });

    browser.tabs.onRemoved.addListener((tabId) => {
        selfLocalStorage.getItem("currentTabId").then((id) => {
            if (Number(id) === tabId) {
                taskErrorFinished();
            }
        });
    });
    const reportReply = (sendResponse: any, data: any) => {
        console.log("Reporting reply:", data);
        userApi
            .reportReplyTweets(data)
            .then((res) => {
                console.log("Report reply success:", res);
                sendResponse({ success: true, data: res });
            })
            .catch((err) => {
                console.error("Report reply failed:", err);
                sendResponse({ success: false, error: err.message });
            });
    };

    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("Message received in background:", request);
        switch (request.action) {
            case "generateComment":
                generateComment(sendResponse, request.data);
                return true;
            case "reportReply":
                reportReply(sendResponse, request.data);
                return true;
            case "generateOneClickComment":
                generateOneClickComment(sendResponse, request.data);
                return true;
            case "testFunction":
                testFunction();
                return true;
            case "stopWork":
                stopWork(sendResponse);
                return true;
            case "startWork":
                requestTask();
                return true;
            case "contentScriptLoaded":
                console.log("Content script loaded");
                waitContentScriptLoaded = true;
                return true;
            default:
                console.log("Unknown action:", request.action);
        }
    });
    const performTask = async (task: any) => {
        // 你的任务代码
        console.log("执行任务");

        if (taskState == "processing") {
            logInfo("插件：任务正在处理中，跳过本次执行");
            console.log("任务正在处理中，跳过本次执行");
            return;
        }

        let currentTabId = Number(await selfLocalStorage.getItem("currentTabId"));
        if (!currentTabId) {
            logInfo("插件错误：当前没有活动的标签页，无法执行任务");
            console.error("当前没有活动的标签页，无法执行任务");
            return;
        }
        taskState = "processing";
        timeroutHandle = setTimeout(() => {
            //超时处理
            taskErrorFinished();
        }, 3 * 60 * 1000);
        console.log(`正在处理任务: ${task.id}`, task);
        logInfo("插件：" + `正在处理任务: ${task.workflowName}(${task.id})`);
        let checkRes = await workflowApi.checkMission(task.id);
        if (checkRes && !checkRes.data) {
            console.error("工作流已经停止");
            closeWorkflow();
            return;
        }
        if (task.eventtype === "post_tweet_event") {
            sendMessageWithRetry(currentTabId, {
                action: "publishX",
                data: task
            })
                .then((response) => eventCallback(response, currentTabId, task))
                .catch((error) => {
                    console.error("消息发送失败:", error);
                    eventCallback(
                        {
                            result: "发布任务通信失败，自动重试中"
                        },
                        currentTabId,
                        task
                    );
                });
        } else if (task.eventtype === "plugin_comment_event") {
            if (task.commentType === "custom") {
                waitContentScriptLoaded = false;
                sendMessageWithRetry(currentTabId, {
                    action: "changeTabUrl",
                    data: {
                        url: `${task.tweetUrl}?cybeflow=true`
                    }
                })
                    .then((response) => {
                        console.log("changeTabUrl response", response);
                    })
                    .catch((error) => {
                        console.error("消息发送失败:", error);
                        taskErrorFinished();
                    });
                await new Promise<void>((resolve) => {
                    const checkInterval = setInterval(() => {
                        if (waitContentScriptLoaded) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 500);
                });
                // 等待tab加载完成后再发送评论消息
                sendMessageWithRetry(currentTabId, {
                    action: "singleCommentX",
                    data: task
                })
                    .then((response) => {
                        eventCallback(response, currentTabId, task);
                    })
                    .catch((error) => {
                        console.error("消息发送失败:", error);
                        eventCallback({ result: "评论任务通信失败，自动重试中" }, currentTabId, task);
                    });

                return;
            }
            //根据类型处理tab页面url
            if (task.commentType === "higherKol") {
                waitContentScriptLoaded = false;
                sendMessageWithRetry(currentTabId, {
                    action: "changeTabUrl",
                    data: {
                        url: `https://x.com/i/lists/${task.listId}?cybeflow=true`
                    }
                })
                    .then((response) => {
                        console.log("changeTabUrl response", response);
                    })
                    .catch((error) => {
                        console.error("消息发送失败:", error);
                        taskErrorFinished();
                    });
                await new Promise<void>((resolve) => {
                    const checkInterval = setInterval(() => {
                        if (waitContentScriptLoaded) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 500);
                });

                // 等待tab加载完成后再发送评论消息
                sendMessageWithRetry(currentTabId, {
                    action: "commentX",
                    data: task
                })
                    .then((response) => {
                        eventCallback(response, currentTabId, task);
                    })
                    .catch((error) => {
                        console.error("消息发送失败:", error);
                        eventCallback({ result: "评论任务通信失败，自动重试中" }, currentTabId, task);
                    });
                return;
            } else {
                sendMessageWithRetry(currentTabId, {
                    action: "commentX",
                    data: task
                })
                    .then((response) => {
                        eventCallback(response, currentTabId, task);
                    })
                    .catch((error) => {
                        console.error("消息发送失败:", error);
                        eventCallback({ result: "评论任务通信失败，自动重试中" }, currentTabId, task);
                    });
                return;
            }
        } else {
            console.error("任务处理失败:不支持的任务类型", task.eventtype);
            workflowApi.cancelTask(task.id, "任务处理失败:不支持的任务类型").finally(() => {
                taskErrorFinished();
            });
        }
    };

    const stopWork = async (sendResponse: (response: any) => void) => {
        let jobId = await selfLocalStorage.getItem("jobId");
        if (!jobId) {
            await selfLocalStorage.removeItem("logs");
            await selfLocalStorage.removeItem("workflow");
            sendResponse({ message: "工作已停止" });
            return;
        }
        workflowApi
            .stopWorkFlows(jobId)
            .then(async (response) => {
                console.log("Stop workflow response:", response);
                let logs = await selfLocalStorage.getItem("logs");
                workflowApi
                    .uploadLog({
                        jobId: jobId,
                        content: logs
                    })
                    .then(() => {
                        console.log("日志上传成功");
                    });
                await selfLocalStorage.removeItem("jobId");
                await selfLocalStorage.removeItem("logs");
                // await selfLocalStorage.removeItem("usedTweetIds");
                await selfLocalStorage.removeItem("workflow");
                sendResponse({ message: "工作已停止" });
            })
            .catch((error) => {
                console.error("Error stopping workflow:", error);
                sendResponse({ message: "工作停止异常" });
            });
    };
    (globalThis as any).stopWork = stopWork;
    const getXTab = (): Promise<any> => {
        return new Promise(async (resolve) => {
            let currentTabId = Number(await selfLocalStorage.getItem("currentTabId"));
            if (currentTabId) {
                browser.tabs
                    .get(currentTabId)
                    .then((tab) => {
                        resolve(tab);
                    })
                    .catch((error) => {
                        console.log("Error closing previous tab:", error);
                        browser.tabs.create({ url: "https://x.com/home?cybeflow=true" }).then((tab) => {
                            resolve(tab);
                        });
                    });
            } else {
                browser.tabs.create({ url: "https://x.com/home?cybeflow=true" }).then((tab) => {
                    resolve(tab);
                });
            }
        });
    };

    const requestTask = async () => {
        console.log("Working...");
        let jobId = await selfLocalStorage.getItem("jobId");

        if (!jobId) {
            console.log("Job ID not found, please set it first.");
            selfLocalStorage.removeItem("workflow");
            return;
        }

        let xTab: any = await getXTab();
        selfLocalStorage.setItem("currentTabId", xTab.id);
        workflowApi
            .getJobIdStatus(jobId)
            .then(async (res) => {
                if (res.data != null) {
                    logInfo("服务端：" + res.data.message);

                    console.log("当前任务" + jobId + "，状态：", res.data.message);
                    let newTask = res.data.data;
                    if (newTask) {
                        newTask.userName = await selfLocalStorage.getItem("xUserName");

                        let task = {
                            eventtype: res.data.event,
                            ...newTask,
                            id: newTask.missionId,
                            workflowName: res.data.workflowName
                        };
                        performTask(task);
                    }
                } else {
                    console.log("没有新增需要处理的任务");
                }
            })
            .catch((error) => {
                logInfo("服务端错误：" + error.message);
                console.error("请求任务失败:", error);
            });
        workflowApi.heartRequest(jobId); // 心跳请求
    };

    requestTask();
});
