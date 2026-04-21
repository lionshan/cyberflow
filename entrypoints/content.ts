import { DynamicX, MockCommentX, MockSingleCommentX, MockOneClickCommentX, MockInteractCommentersX, stopMockOneClickCommentX, mockEditDrafts, mockGrok } from "@/utils/x";
import { selfLocalStorage } from "@/utils/storage";

export default defineContentScript({
    matches: ["*://x.com/*"],
    runAt: "document_start",
    allFrames: false,
    main() {
        const publishX = async (data: any, sendResponse: (response: any) => void) => {
            try {
                const result = await DynamicX(data);
                sendResponse({
                    task: {
                        ...data,
                        ...result
                    },
                    result: true
                });
            } catch (error) {
                sendResponse({ task: data, result: error.message });
            }
        };
        const singleCommentX = async (data: any, sendResponse: (response: any) => void) => {
            console.log("commentX data", data);
            try {
                const result = await MockSingleCommentX(data);
                sendResponse({
                    task: {
                        ...data,
                        ...result
                    },
                    result: true
                });
            } catch (error) {
                sendResponse({ task: data, result: error.message });
            }
        };

        const commentX = async (data: any, sendResponse: (response: any) => void) => {
            console.log("commentX data", data);
            try {
                const result = await MockCommentX(data);
                sendResponse({
                    task: {
                        ...data,
                        ...result
                    },
                    result: true
                });
            } catch (error) {
                sendResponse({ task: data, result: error.message });
            }
        };
        const oneClickComment = async (data: any) => {
            console.log("oneClickComment data", data);
            //获取当前评论数量
            let curReplyCount = 10;
            try {
                const replyContainer = document.querySelector('[data-testid="reply"]');
                if (replyContainer) {
                    const countContainer = replyContainer.querySelector('[data-testid="app-text-transition-container"]');
                    if (countContainer) {
                        const countText = (countContainer as HTMLElement).innerText;
                        // 提取数字并处理格式（去逗号等）
                        let parsedCount = 0;
                        if (countText.includes("K")) {
                            parsedCount = parseFloat(countText.replace("K", "")) * 1000;
                        } else if (countText.includes("M")) {
                            parsedCount = parseFloat(countText.replace("M", "")) * 1000000;
                        } else {
                            parsedCount = parseInt(countText.replace(/,/g, ""), 10);
                        }

                        if (!isNaN(parsedCount) && parsedCount > 0) {
                            // 取50%的正数
                            curReplyCount = Math.ceil(parsedCount * 0.5);
                        }
                    }
                }
            } catch (error: any) {
                console.error("获取评论数失败", error);
            }

            await MockInteractCommentersX({ ...data, maxCommentCount: curReplyCount });
        };

        const editDrafts = async (data: any, sendResponse: (response: any) => void) => {
            console.log("editDrafts data", data);

            try {
                const result = await mockEditDrafts(data);
                sendResponse({
                    task: {
                        ...data,
                        ...result
                    },
                    result: true
                });
            } catch (error) {
                console.log("editDraftseditDrafts error", error);
                sendResponse({ task: data, result: error.message });
            }
        };

        const getGrokContent = async (data: any, sendResponse: (response: any) => void) => {
            console.log("getGrokContent data", data);

            try {
                let needTextPrompt = `阅读以下x list内的账号，以及过去24小时最热门的 crypto （有价值的）相关 x post。【${data.listUrl}】帮我总结，过去24小时，crypto领域在发生的事情。热门的 crypto 领域的 x post，要过滤掉价值低的（单纯发发调侃/笑话/牢骚的）。包括：宏观/大盘，重要项目进展，交易机会，需要关注的新叙事等。新叙事需要有详细的具体项目/事件/数据进展的描述，不要只是告诉我，“什么是新叙事”。我需要知道的是，具体这个领域过去24小时在发生什么。比如“预测市场”“x402”“neobank”等等这些新叙事，有哪些项目在做什么事情。要求内容详细，用中文。`;
                const result = await mockGrok(needTextPrompt);
                if (!!result) {
                    if (result.length < 100) {
                        console.log("获取内容过短", result);
                        sendResponse({
                            task: {
                                ...data
                            },
                            result: "使用grok获取素材失败，返回内容过短，请检查当前账号grok是否可用。"
                        });
                    } else {
                        sendResponse({
                            task: {
                                ...data,
                                grokContent: result
                            },
                            result: true
                        });
                    }
                } else {
                    sendResponse({
                        task: {
                            ...data
                        },
                        result: "使用grok获取素材失败，返回内容为空，请检查当前账号grok是否可用"
                    });
                }
            } catch (error) {
                console.log("getGrokContent error", error);
                sendResponse({ task: data, result: error.message });
            }
        };
        console.log("Hello content.");

        // 获取当前页面的 Tab ID
        browser.runtime.sendMessage({ action: "getTabId" }).then((response) => {
            if (response && response.tabId) {
                console.log("Current Tab ID:", response.tabId);
            }
        });

        browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log("Message received in content script:", request);

            switch (request.action) {
                case "publishX":
                    publishX(request.data, sendResponse);
                    return true;
                case "commentX":
                    commentX(request.data, sendResponse);
                    return true;
                case "singleCommentX":
                    singleCommentX(request.data, sendResponse);
                    return true;
                case "reloadTab":
                    sendResponse({ result: "reloadTabSuccesss" });
                    window.location.reload();
                    return true;
                case "changeTabUrl":
                    sendResponse({ result: "changeTabUrlSuccess" });
                    window.location.href = request.data.url;
                    return true;
                case "oneClickComment":
                    oneClickComment(request.data);
                    return false;
                case "stopOneClickComment":
                    stopMockOneClickCommentX();
                    sendResponse({ result: true });
                    return true;
                case "editDrafts":
                    editDrafts(request.data, sendResponse);
                    return true;
                case "getGrokContent":
                    getGrokContent(request.data, sendResponse);
                    return true;
                default:
                    console.log("Unknown action:", request.action);
            }
        });
        browser.runtime.sendMessage({ action: "contentScriptLoaded" });
    }
});
