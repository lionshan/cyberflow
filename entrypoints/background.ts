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
    const testFunction2 = async (tabID) => {
        const textKey = `阅读以下x list内的账号，以及过去24小时最热门的 crypto （有价值的）相关 x post。【https://x.com/i/lists/1828846155364728836】帮我总结，过去24小时，crypto领域在发生的事情。热门的 crypto 领域的 x post，要过滤掉价值低的（单纯发发调侃/笑话/牢骚的）。包括：宏观/大盘，重要项目进展，交易机会，需要关注的新叙事等。新叙事需要有详细的具体项目/事件/数据进展的描述，不要只是告诉我，“什么是新叙事”。我需要知道的是，具体这个领域过去24小时在发生什么。比如“预测市场”“x402”“neobank”等等这些新叙事，有哪些项目在做什么事情。要求内容详细，用中文。`;
        setTimeout(() => {
            browser.tabs.sendMessage(
                tabID,
                {
                    action: "getGrokContent",
                    data: textKey
                },
                function (response) {
                    console.log("测试getGrokContentresponse", response);
                }
            );
        }, 1000);
    };
    const testFunction = async (tabID) => {
        console.log("Test function called");
        const testDraftData = {
            title: "2026年全栈开发趋势展望：从 AI 辅助到无服务器架构",

            // 这是一个红色的 1x1 像素图片的 Base64，用于测试封面上传，确保 fetch 不会跨域报错
            cover: "data:image/png;base64,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",

            content: `
# 全栈开发的未来已来

随着 AI 技术的爆发式增长，软件开发的范式正在发生根本性的转变。

## 核心趋势

1. **AI 辅助编码**: Copilot 和各类 AI Agent 已经成为开发者的标配。
2. **Edge Computing**: 边缘计算让应用响应更快，延迟更低。
3. **Rust 的崛起**: 在高性能工具链和系统级编程中，Rust 正占据主导地位。

## 我们的实践案例

> "最好的代码是没写的代码。" —— 这是一个关于自动化的思考。

我们在最近的项目中，尝试了全链路的自动化构建与部署，效率提升了 **300%**。

### 关键挑战

- 数据隐私与安全
- 系统的复杂性治理
- 团队的技术栈迁移`.trim()
        };
        setTimeout(() => {
            browser.tabs.sendMessage(
                tabID,
                {
                    action: "editDrafts",
                    data: testDraftData
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

                if (response.task.eventtype === "plugin_hot_content_event" && !!response.task.grokContent) {
                    //获取grok内容并且且不为空，则将内容传回后台
                    await workflowApi.reportGrokArticle({
                        missionId: response.task.missionId,
                        content: response.task.grokContent
                    });
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
    (globalThis as any).testFunction2 = testFunction2;

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
            case "getTabId":
                console.log("getTabId request from:", sender);
                if (sender.tab && sender.tab.id) {
                    sendResponse({ tabId: sender.tab.id });
                } else {
                    sendResponse({ tabId: null });
                }
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
                action: "editDrafts",
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
        } else if (task.eventtype === "plugin_hot_content_event") {
            waitContentScriptLoaded = false;
            sendMessageWithRetry(currentTabId, {
                action: "changeTabUrl",
                data: {
                    url: `https://x.com/i/grok`
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
                action: "getGrokContent",
                data: task
            })
                .then((response) => {
                    eventCallback(response, currentTabId, task);
                })
                .catch((error) => {
                    console.error("消息发送失败:", error);
                    eventCallback({ result: "获取grok内容通信失败，自动重试中" }, currentTabId, task);
                });
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
