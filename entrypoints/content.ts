import { DynamicX, MockCommentX, MockSingleCommentX, MockOneClickCommentX } from "@/utils/x";
import { selfLocalStorage } from "@/utils/storage";

export default defineContentScript({
    matches: ["*://x.com/*?cybeflow=true*", "*://x.com/i/lists/*?cybeflow=true*", "*://x.com/compose/post", "*://x.com/*/status/*"],
    runAt: "document_start",
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
        const oneClickComment = async (data: any, sendResponse: (response: any) => void) => {
            console.log("oneClickComment data", data);
            await MockOneClickCommentX(data);
        };
        console.log("Hello content.");
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
                    oneClickComment(request.data, sendResponse);
                    return true;
                default:
                    console.log("Unknown action:", request.action);
            }
        });
        browser.runtime.sendMessage({ action: "contentScriptLoaded" });
    }
});
