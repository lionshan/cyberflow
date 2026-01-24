interface AccountInfo {
    provider: string;
    accountId: string;
    username: string;
    description?: string;
    profileUrl?: string;
    avatarUrl?: string;
    extraData: unknown;
    xAccountInfoChange?: boolean;
}
import { selfLocalStorage } from "@/utils/storage";
async function checkNeedRetry() {
    //等待2秒再检查
    await new Promise((resolve) => setTimeout(resolve, 2000));
    let needRetry = Array.from(document.querySelectorAll('[type="button"]')).find((item) => {
        let text = (item as HTMLButtonElement).innerText;
        return text == "Retry" || text == "重試" || text == "重试";
    });

    if (needRetry) {
        (needRetry as HTMLButtonElement).click();
        return false;
    } else {
        return true;
    }
}
function waitForElement(selector: string, timeout = 20000): Promise<Element> {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error("随机滚动失败，未找到指定元素"));
            console.log(`Element with selector "${selector}" not found within ${timeout}ms`);
        }, timeout);
    });
}

function waitSendSuccess(timeout = 20000): Promise<Element> {
    return new Promise((resolve, reject) => {
        const element = document.querySelector('[data-testid="toast"]');
        if (element) {
            resolve(element);
            return;
        }
        const observer = new MutationObserver(() => {
            const element = document.querySelector('[data-testid="toast"]');
            if (element) {
                resolve(element);
                observer.disconnect();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error("发送回复失败"));
        }, timeout);
    });
}
async function findTweetIdWithUserNameFirst(task: any): Promise<string | null> {
    let articlesDOM = document.querySelectorAll("article");

    const articlesDOMArr = Array.from(articlesDOM).filter((article) => {
        return article.querySelector("a")?.href == `https://x.com/${task.userName}`;
    });
    let postDOM = articlesDOMArr[0];
    let newTweetId;
    if (postDOM) {
        newTweetId = await getTweetId(postDOM);
    }
    return newTweetId || null;
}
export async function getXAccountInfo(): Promise<AccountInfo> {
    // 直接使用fetch API获取 X 页面HTML
    let htmlText = "";
    try {
        const response = await fetch("https://x.com/home", {
            method: "GET",
            headers: {
                Accept: "text/html",
                "Content-Type": "text/html"
            },
            credentials: "include" // 包含cookie以确保认证
        });

        if (!response.ok) {
            throw new Error(`HTTP错误，状态码: ${response.status}`);
        }

        htmlText = await response.text();
    } catch (error) {
        console.error("获取 X 页面HTML失败:", error);
        throw new Error(`网络异常无法访问x.com,请检查网络设置`);
    }

    // 解析window.__INITIAL_STATE__
    const initialStateMatch = htmlText.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\})(?:\s*;|\s*<\/script>)/s);

    if (!initialStateMatch || !initialStateMatch[1]) {
        throw new Error("无法找到 __INITIAL_STATE__ 数据");
    }

    const jsonStr = initialStateMatch[1];

    // 尝试解析JSON
    let initialState;
    try {
        initialState = JSON.parse(jsonStr);
    } catch (parseError) {
        console.error("解析 X __INITIAL_STATE__ 数据失败:", parseError);
        // 清理可能的JSON问题
        const cleanedJsonStr = jsonStr
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // 移除控制字符
            .replace(/:undefined,/g, ":null,") // 处理undefined
            .replace(/:undefined}/g, ":null}"); // 处理末尾的undefined

        try {
            initialState = JSON.parse(cleanedJsonStr);
        } catch {
            throw new Error("解析 __INITIAL_STATE__ 数据失败");
        }
    }

    // 从entities.users.entities中获取用户信息，这里的键是动态的用户ID
    const usersEntities = initialState.entities?.users?.entities;
    if (!usersEntities || Object.keys(usersEntities).length === 0) {
        return null;
    }

    // 获取第一个用户ID（假设只有当前登录用户）
    const userId = Object.keys(usersEntities)[0];
    const userInfo = usersEntities[userId];

    if (!userInfo) {
        return null;
    }

    const result: AccountInfo = {
        provider: "x",
        accountId: userInfo.screen_name,
        username: userInfo.name,
        description: userInfo.description,
        profileUrl: `https://x.com/${userInfo.screen_name}`,
        avatarUrl: userInfo.profile_image_url_https,
        extraData: initialState
    };
    // let oldUserName = await selfLocalStorage.getItem("xUserName");
    // if (oldUserName && oldUserName !== userInfo.screen_name) {
    //     console.log(
    //         "oldUserNameoldUserName",
    //         oldUserName,
    //         userInfo.screen_name
    //     );
    //     //更换账号，清理工作流
    //      browser.runtime.sendMessage({
    //         action: "stopWork"
    //     });
    //     return {
    //         ...result,
    //         xAccountInfoChange: true
    //     };
    // }
    selfLocalStorage.setItem("xUserName", userInfo.screen_name);
    return result;
}

function findElementByInnerText(text: string): Element | null {
    const allElements = document.querySelectorAll('[data-testid="tweetText"]');

    for (const element of allElements) {
        if (element.innerText === text) {
            return element;
        }
    }
    return null;
}

export async function DynamicX(data: any) {
    const { text } = data;
    // 辅助函数：等待元素出现
    function waitForElement(selector: string, timeout = 20000): Promise<Element> {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                    observer.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`随机滚动失败，未找到指定元素`));

                console.log(`Element with selector "${selector}" not found within ${timeout}ms`);
            }, timeout);
        });
    }

    try {
        let needRetry = await checkNeedRetry();
        if (!needRetry) {
            throw new Error("页面加载失败，已点击重试按钮，请稍后");
        }
        // 等待编辑器元素出现
        await waitForElement('div[data-contents="true"]');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 获取编辑器元素
        const editor = document.querySelector('div[data-contents="true"]');
        if (!editor) {
            console.log("未找到编辑器元素");
            throw new Error("编辑器元素未找到");
        }

        // 聚焦编辑器
        (editor as HTMLElement).focus();
        // 使用 ClipboardEvent 粘贴文本
        const combinedText = text; //+ Math.random().toString(36).substring(2, 15);
        const pasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
        });
        pasteEvent.clipboardData!.setData("text/plain", combinedText);
        editor.dispatchEvent(pasteEvent);

        // 处理媒体上传（图片和视频）
        // const mediaFiles = [...(images || []), ...(videos || [])];
        // if (mediaFiles.length > 0) {
        //     // 查找文件输入元素
        //     const fileInput = document.querySelector(
        //         'input[type="file"]'
        //     ) as HTMLInputElement;
        //     if (!fileInput) {
        //         console.log("未找到文件输入元素");
        //         return;
        //     }

        //     // 创建数据传输对象
        //     const dataTransfer = new DataTransfer();

        //     // 上传文件（最多4个）
        //     for (let i = 0; i < mediaFiles.length; i++) {
        //         if (i >= 4) {
        //             console.log("X 最多支持 4 张 ，跳过");
        //             break;
        //         }

        //         const fileInfo = mediaFiles[i];
        //         console.log("try upload file", fileInfo);

        //         // 获取文件内容
        //         const response = await fetch(fileInfo.url);
        //         const arrayBuffer = await response.arrayBuffer();
        //         const file = new File([arrayBuffer], fileInfo.name, {
        //             type: fileInfo.type
        //         });
        //         console.log("file", file);
        //         dataTransfer.items.add(file);
        //     }

        //     // 设置文件并触发事件
        //     fileInput.files = dataTransfer.files;

        //     // 触发change事件
        //     const changeEvent = new Event("change", { bubbles: true });
        //     fileInput.dispatchEvent(changeEvent);

        //     // 触发input事件
        //     const inputEvent = new Event("input", { bubbles: true });
        //     fileInput.dispatchEvent(inputEvent);

        //     console.log("文件上传操作完成");
        // }

        // 判断是否自动发布
        // 等待一段时间确保文件上传完成
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 查找发布按钮
        const allButtons = document.querySelectorAll("button");
        const publishButton = Array.from(allButtons).find((button) => button.textContent?.includes("发帖") || button.textContent?.includes("Post") || button.textContent?.includes("發佈"));

        console.log("sendButton", publishButton);

        if (publishButton) {
            // 如果找到发布按钮，检查是否可点击
            let attempts = 0;
            while (publishButton.disabled && attempts < 10) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
                attempts++;
                console.log(`Waiting for send button to be enabled. Attempt ${attempts}/10`);
            }

            if (publishButton.disabled) {
                console.log("Send button is still disabled after 10 attempts");
                throw new Error("Send button is still disabled after 10 attempts");
            }

            console.log("sendButton clicked");
            // 点击发布按钮
            const clickEvent = new Event("click", { bubbles: true });
            publishButton.dispatchEvent(clickEvent);
        } else {
            // 如果没找到发布按钮，尝试使用快捷键发布
            console.log("未找到'发送'按钮");
            const keyEvent = new KeyboardEvent("keydown", {
                bubbles: true,
                cancelable: true,
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                metaKey: true,
                composed: true
            });

            // 再次聚焦编辑器并发送快捷键
            (editor as HTMLElement).focus();
            editor.dispatchEvent(keyEvent);
            console.log("CMD+Enter 事件触发完成");
        }
        //发布后获取发版帖id
        let toastDOM = await waitSendSuccess();
        if (toastDOM.innerText.indexOf("Your post was sent") === -1 && toastDOM.innerText.indexOf("你的帖子已发送") === -1 && toastDOM.innerText.indexOf("你的貼文已發送") === -1) {
            throw new Error("发帖发送失败," + toastDOM.innerText);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        let postTweetId = await findTweetIdWithUserNameFirst(data);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // await new Promise((resolve) => setTimeout(resolve, 1000));
        // let publishDOM = findElementByInnerText(combinedText);
        // if (!publishDOM) {
        //     await new Promise((resolve) => setTimeout(resolve, 3000));
        //     publishDOM = findElementByInnerText(combinedText);
        // }
        // let newTweetId;
        // if (publishDOM) {
        //     newTweetId = await getTweetId(publishDOM);
        // }

        // if (!newTweetId) {
        //     newTweetId = Math.random().toString(36).substring(2, 15);
        // }
        return { tweetId: postTweetId };
    } catch (error) {
        throw new Error("X 发布过程中出错1:" + error.message);
    }
}
function extractTweetIdFromUrl(url: string): string | null {
    // 方法1: 使用split分割
    const parts = url.split("/");
    const lastPart = parts[parts.length - 1];

    // 验证是否为数字ID
    if (/^\d+$/.test(lastPart)) {
        return lastPart;
    }

    return Math.random().toString(36).substring(2, 15);
}
async function getTweetId(node: Element): string | null {
    // 点击帖子
    const clickEvent = new Event("click", { bubbles: true });
    node.dispatchEvent(clickEvent);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    let curHref = window.location.href;
    console.log(window.location.href);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    window.history.back();
    return extractTweetIdFromUrl(curHref);
}
async function getTweetIdNew(node: Element): string | null {
    // 点击帖子
    const clickEvent = new Event("click", { bubbles: true });
    node.dispatchEvent(clickEvent);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    let curHref = window.location.href;
    console.log(window.location.href);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return extractTweetIdFromUrl(curHref);
}

async function getTweetTexts(task: any) {
    //等待列表加载完成
    await waitForElement('[data-testid="cellInnerDiv"]');
    let tweetTexts = Array.from(document.querySelectorAll('div[data-testid="tweetText"]'))
        .map((div) => {
            let wrap = div.closest('article[data-testid="tweet"]');
            if (!wrap) return null;
            let userDiv = wrap.querySelector('div[data-testid="User-Name"]');
            if (!userDiv) return null;
            let userName = userDiv?.children[1]?.children[0]?.children[0]?.innerText;
            if (!userName) return null;
            console.log("userName", userName, task.userName);
            if ("@" + task.userName === userName) return null;
            //排除自己的帖子
            return div;
        })
        .filter((item) => item !== null);
    if (tweetTexts.length === 0) {
        await scrollList();
        return await getTweetTexts(task);
    }
    return tweetTexts;
}
function parseDisplayNumber(str: string): number {
    if (!str || typeof str !== "string") return 0;

    // 清理字符串：去除空格、逗号等
    const cleanStr = str.trim().replace(/,/g, "").toUpperCase();

    // 纯数字情况
    if (/^\d+(\.\d+)?$/.test(cleanStr)) {
        return parseFloat(cleanStr);
    }

    // 带单位的情况
    const unitMap = {
        K: 1000,
        M: 1000000,
        B: 1000000000,
        T: 1000000000000
    };

    const match = cleanStr.match(/^(\d+(?:\.\d+)?)([KMBT])$/);

    if (match) {
        const number = parseFloat(match[1]);
        const multiplier = unitMap[match[2] as keyof typeof unitMap];
        return number * multiplier;
    }

    return 0;
}
function getTweetScore(tweetText: HTMLElement): number {
    let wrap = tweetText.closest('article[data-testid="tweet"]');
    if (!wrap) return 0;
    let score = wrap.querySelectorAll('[data-testid="app-text-transition-container"]')[3].innerText;
    return parseDisplayNumber(score);
}
function getHighestReviewTweet(tweetTexts) {
    // 选择评分最高的 tweetText 节点
    const highestTweetText = tweetTexts.reduce((prev, curr) => {
        const prevScore = getTweetScore(prev);
        const currScore = getTweetScore(curr);
        return currScore > prevScore ? curr : prev;
    });
    return highestTweetText;
}
async function scrollList() {
    let oldHeight = document.querySelector("main")?.getBoundingClientRect().height;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    let cellInnerDiv = Array.from(document.querySelectorAll('[data-testid="cellInnerDiv"]')).map((div) => div);
    cellInnerDiv[cellInnerDiv.length - 1].scrollIntoView({
        block: "end"
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    let newHeight = document.querySelector("main")?.getBoundingClientRect().height;
    if (oldHeight === newHeight) {
        //尝试点击加载更多
        let morePostBtn = document.querySelector('[data-testid="userAvatars"]');
        if (morePostBtn) {
            (morePostBtn as HTMLElement).click();
            await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
            throw new Error("页面已到底部，无法获取更多内容,等待新内容出现");
        }
    }
    return;
}
async function getNeedCommentTweet(task: any) {
    //1. 获取当前页面tweetText节点列表
    try {
        let tweetTexts = await getTweetTexts(task);

        //2. 选择最后一个节点
        let selectedTweetText = tweetTexts[0];
        if (task.commentType === "higherReview") {
            selectedTweetText = getHighestReviewTweet(tweetTexts);
        }

        console.log("选择的tweetText节点:", selectedTweetText);

        //3. 获取改节点id
        const tweetId = await getTweetId(selectedTweetText);
        if (!tweetId) {
            throw new Error("未找到选择节点的 tweetId");
        }
        //判断节点是否用过
        let usedTweetIdsStr = await selfLocalStorage.getItem("usedTweetIds");
        let usedTweetIds: string[] = usedTweetIdsStr ? JSON.parse(usedTweetIdsStr) : [];
        if (usedTweetIds.includes(tweetId)) {
            //滑动页面刷新tweetTexts列表
            console.log("节点已使用，尝试下一个节点");
            await scrollList();
            return await getNeedCommentTweet(task);
        }
        //4. 获取需要评论的内容
        let needCommentContent = (selectedTweetText as HTMLElement).innerText;
        if (!needCommentContent) {
            await scrollList();
            return await getNeedCommentTweet(task);
        }
        // 判断已有value数组长度超过100截取后面50个保留
        if (usedTweetIds.length > 100) {
            usedTweetIds = usedTweetIds.slice(-50);
        }
        selfLocalStorage.setItem("usedTweetIds", JSON.stringify([...usedTweetIds, tweetId]));
        return { tweetId, needCommentContent };
    } catch (error) {
        if (error.message && error.message.includes("随机滚动失败，未找到指定元素")) {
            window.location.reload();
            return;
        }
        throw error;
    }
}

async function getNeedCommentTweetNew(missionId: string, task: any, retrtyCount: number = 0) {
    //1. 获取当前页面tweetText节点列表
    if (retrtyCount > 5) {
        throw new Error("尝试获取需要评论的节点超过5次，终止操作");
    }
    retrtyCount++;
    try {
        let tweetTexts = await getTweetTexts(task);

        //2. 选择最后一个节点
        let selectedTweetText = tweetTexts[0];
        if (task.commentType === "higherReview") {
            selectedTweetText = getHighestReviewTweet(tweetTexts);
        }

        console.log("选择的tweetText节点:", selectedTweetText);

        //3. 获取改节点id 这时候打开的是新页面
        const tweetId = await getTweetIdNew(selectedTweetText);
        if (!tweetId) {
            throw new Error("未找到选择节点的 tweetId");
        }
        //判断节点是否用过
        let usedTweetIdsStr = await selfLocalStorage.getItem("usedTweetIds");
        let usedTweetIds: string[] = usedTweetIdsStr ? JSON.parse(usedTweetIdsStr) : [];
        if (usedTweetIds.includes(tweetId)) {
            //滑动页面刷新tweetTexts列表
            console.log("节点已使用，尝试下一个节点");
            window.history.back();
            await new Promise((resolve) => setTimeout(resolve, 5000));
            await scrollList();
            return await getNeedCommentTweetNew(missionId, task, retrtyCount);
        }
        // 判断已有value数组长度超过100截取后面50个保留
        if (usedTweetIds.length > 100) {
            usedTweetIds = usedTweetIds.slice(-50);
        }
        selfLocalStorage.setItem("usedTweetIds", JSON.stringify([...usedTweetIds, tweetId]));
        //4. 获取需要评论的内容
        let needCommentContent = (selectedTweetText as HTMLElement).innerText;
        if (!needCommentContent) {
            window.history.back();
            await new Promise((resolve) => setTimeout(resolve, 5000));
            await scrollList();
            return await getNeedCommentTweetNew(missionId, task, retrtyCount);
        }

        if (needCommentContent.length === 0) {
            window.history.back();
            await new Promise((resolve) => setTimeout(resolve, 5000));
            await scrollList();
            return await getNeedCommentTweetNew(missionId, task, retrtyCount);
        }
        const response = await browser.runtime.sendMessage({
            action: "generateComment",
            data: {
                missionId,
                tweetId,
                tweetText: needCommentContent
            }
        });

        console.log("来自 background 的评论内容:", response);
        if (!response) {
            throw new Error("回复内容获取失败关闭工作流");
        }
        if (!response.canSend) {
            //需要寻找下一个节点
            window.history.back();
            await new Promise((resolve) => setTimeout(resolve, 5000));
            await scrollList();
            return await getNeedCommentTweetNew(missionId, task, retrtyCount);
        }
        return { tweetId, needCommentContent, response };
    } catch (error) {
        throw error;
    }
}

async function getCanSendContent(missionId: string, retrtyCountCanSend: number, task: any) {
    try {
        retrtyCountCanSend++;
        if (retrtyCountCanSend > 5) {
            throw new Error("尝试获取可发送内容超过5次，终止操作");
        }
        let needRes = await getNeedCommentTweet(task);
        if (!needRes) {
            throw new Error("找不到需要评论的节点");
        }
        let { tweetId, needCommentContent } = needRes;
        if (needCommentContent.length === 0) {
            throw new Error("需要评论的节点内容为空");
        }
        const response = await browser.runtime.sendMessage({
            action: "generateComment",
            data: {
                missionId,
                tweetId,
                tweetText: needCommentContent
            }
        });

        console.log("来自 background 的评论内容:", response);
        if (!response) {
            throw new Error("回复内容获取失败关闭工作流");
        }
        if (!response.canSend) {
            //需要寻找下一个节点
            await scrollList();
            await getCanSendContent(missionId, retrtyCountCanSend, task);
        }
        return {
            response,
            tweetId,
            needCommentContent
        };
    } catch (error) {
        throw error;
    }
}
async function findsSelectedTweetText(missionId: string, retrtyCount: number, task: any) {
    try {
        retrtyCount++;
        if (retrtyCount > 5) {
            throw new Error("尝试找到需要评论的帖子超过5次，终止操作");
        }
        let retrtyCountCanSend = 0;
        let { response, tweetId, needCommentContent } = await getCanSendContent(missionId, retrtyCountCanSend, task);
        let selectedTweetText = Array.from(document.querySelectorAll('div[data-testid="tweetText"]')).find((div) => {
            console.log("div", div);
            return (div as HTMLElement).innerText.replaceAll("\n", "") === needCommentContent.replaceAll("\n", "");
        });
        if (!selectedTweetText) {
            return await findsSelectedTweetText(missionId, retrtyCount, task);
        }
        return {
            response,
            tweetId,
            needCommentContent,
            selectedTweetText
        };
    } catch (error) {
        throw error;
    }
}
async function closeCommentDialog() {
    const closeBtn = document.querySelector('[data-testid="app-bar-close"]');
    if (closeBtn) {
        (closeBtn as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const confirmBtn = document.querySelector('[data-testid="confirmationSheetCancel"]');
    if (confirmBtn) {
        (confirmBtn as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return true;
}

/**
 * 获取当前页面推文内容
 */
export async function getPageTweetText(commentNode: any): Promise<string> {
    try {
        let needRetry = await checkNeedRetry();
        if (!needRetry) {
            throw new Error("页面加载失败，已点击重试按钮，请稍后");
        }
        await waitForElement('[data-testid="tweetText"]');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        let contentDOM = commentNode.querySelector('[data-testid="tweetText"]');
        if (!contentDOM) {
            throw new Error("未找到需要评论的节点");
        }
        let text = (contentDOM as HTMLElement).innerText;
        if (text.length === 0) {
            throw new Error("需要评论的节点内容为空");
        }
        return text;
    } catch (error) {
        throw new Error("获取推文内容失败: " + error.message);
    }
}

/**
 * 在当前页面发布评论回复
 * @param replyContent 回复内容
 */
export async function publishReplyToCurrentPage(replyContent: string, commentNode: any): Promise<boolean> {
    try {
        let replyButton = commentNode.querySelector('button[data-testid="reply"]');
        if (!replyButton) {
            throw new Error("未找到回复按钮");
        }

        const clickReplyButtonEvent = new Event("click", { bubbles: true });
        replyButton.dispatchEvent(clickReplyButtonEvent);
        await waitForElement('div[data-viewportview="true"]');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const editor = document.querySelector('div[data-contents="true"]');
        if (!editor) {
            console.log("未找到编辑器元素");
            throw new Error("编辑器元素未找到");
        }

        if (!editor.closest('[role="dialog"]')) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            if (!editor.closest('[role="dialog"]')) {
                throw new Error("回复对话框未打开");
            }
        }

        // 聚焦编辑器
        (editor as HTMLElement).focus();
        // 使用 ClipboardEvent 粘贴文本
        const pasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
        });
        pasteEvent.clipboardData!.setData("text/plain", replyContent);
        editor.dispatchEvent(pasteEvent);

        await new Promise((resolve) => setTimeout(resolve, 1000));
        //判断是否超长
        let checkDOM = document.querySelector('[data-testid="countdown-circle"]');
        if (checkDOM && checkDOM.children[2]) {
            let num = (checkDOM.children[2] as HTMLElement).innerText;
            if (Number(num) < 0) {
                await closeCommentDialog();
                throw new Error("评论内容过长，无法发送");
            }
        }

        // 查找发布按钮
        const allButtons = document.querySelectorAll("button");
        const publishButton = Array.from(allButtons).find((button) => {
            return ["Reply答", "Reply", "回复", "回覆"].includes(button.textContent || "");
        });

        console.log("sendButton", publishButton);

        if (publishButton) {
            // 如果找到发布按钮，检查是否可点击
            let attempts = 0;
            while (publishButton.disabled && attempts < 10) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
                attempts++;
                console.log(`Waiting for send button to be enabled. Attempt ${attempts}/10`);
            }

            if (publishButton.disabled) {
                console.log("Send button is still disabled after 10 attempts");
                throw new Error("Send button is still disabled after 10 attempts");
            }

            console.log("sendButton clicked");
            const clickEvent = new Event("click", { bubbles: true });
            publishButton.dispatchEvent(clickEvent);
        } else {
            // 如果没找到发布按钮，尝试使用快捷键发布
            console.log("未找到'发送'按钮");
            const keyEvent = new KeyboardEvent("keydown", {
                bubbles: true,
                cancelable: true,
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                metaKey: true,
                composed: true
            });

            // 再次聚焦编辑器并发送快捷键
            (editor as HTMLElement).focus();
            editor.dispatchEvent(keyEvent);
            console.log("CMD+Enter 事件触发完成");
        }

        let toastDOM = await waitSendSuccess();
        const successTexts = ["Your post was sent", "你的帖子已发送", "你的貼文已發送"];
        const isSuccess = successTexts.some((text) => toastDOM.innerText.includes(text));

        if (!isSuccess) {
            await closeCommentDialog();
            throw new Error("评论发送失败," + toastDOM.innerText);
        }

        // 上报已回复推文
        try {
            const currentUrl = window.location.href;
            const tweetId = extractTweetIdFromUrl(currentUrl);
            const userTwitterAccount = await selfLocalStorage.getItem("xUserName");

            if (tweetId && userTwitterAccount) {
                // 向 background 发送上报请求
                // browser.runtime.sendMessage({
                //     action: "reportReply",
                //     data: {
                //         userTwitterAccount: userTwitterAccount,
                //         tweetIds: [tweetId]
                //         // commentedUserTwitterAccount 可以从页面获取，暂时留空或根据需求添加
                //     }
                // });
                // console.log("上报已回复推文成功", tweetId);
            }
        } catch (reportError) {
            console.error("上报已回复推文失败", reportError);
            // 上报失败不影响主流程，仅记录日志
        }

        return true;
    } catch (error) {
        throw new Error("发布评论失败: " + error.message);
    }
}

export async function publishReplyToListPage(replyContent: string): Promise<boolean> {
    try {
        let replyButton = document.querySelector('button[data-testid="reply"]');
        if (!needFirst) {
            replyButton =
                document.querySelectorAll('button[data-testid="reply"]').length > 1
                    ? document.querySelectorAll('button[data-testid="reply"]')[1]
                    : document.querySelector('button[data-testid="reply"]');
        }
        if (!replyButton) {
            throw new Error("未找到回复按钮");
        }

        const clickReplyButtonEvent = new Event("click", { bubbles: true });
        replyButton.dispatchEvent(clickReplyButtonEvent);
        await waitForElement('div[data-viewportview="true"]');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const editor = document.querySelector('div[data-contents="true"]');
        if (!editor) {
            console.log("未找到编辑器元素");
            throw new Error("编辑器元素未找到");
        }

        if (!editor.closest('[role="dialog"]')) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            if (!editor.closest('[role="dialog"]')) {
                throw new Error("回复对话框未打开");
            }
        }

        // 聚焦编辑器
        (editor as HTMLElement).focus();
        // 使用 ClipboardEvent 粘贴文本
        const pasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
        });
        pasteEvent.clipboardData!.setData("text/plain", replyContent);
        editor.dispatchEvent(pasteEvent);

        await new Promise((resolve) => setTimeout(resolve, 1000));
        //判断是否超长
        let checkDOM = document.querySelector('[data-testid="countdown-circle"]');
        if (checkDOM && checkDOM.children[2]) {
            let num = (checkDOM.children[2] as HTMLElement).innerText;
            if (Number(num) < 0) {
                await closeCommentDialog();
                throw new Error("评论内容过长，无法发送");
            }
        }

        // 查找发布按钮
        const allButtons = document.querySelectorAll("button");
        const publishButton = Array.from(allButtons).find((button) => {
            return ["Reply答", "Reply", "回复", "回覆"].includes(button.textContent || "");
        });

        console.log("sendButton", publishButton);

        if (publishButton) {
            // 如果找到发布按钮，检查是否可点击
            let attempts = 0;
            while (publishButton.disabled && attempts < 10) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
                attempts++;
                console.log(`Waiting for send button to be enabled. Attempt ${attempts}/10`);
            }

            if (publishButton.disabled) {
                console.log("Send button is still disabled after 10 attempts");
                throw new Error("Send button is still disabled after 10 attempts");
            }

            console.log("sendButton clicked");
            const clickEvent = new Event("click", { bubbles: true });
            publishButton.dispatchEvent(clickEvent);
        } else {
            // 如果没找到发布按钮，尝试使用快捷键发布
            console.log("未找到'发送'按钮");
            const keyEvent = new KeyboardEvent("keydown", {
                bubbles: true,
                cancelable: true,
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                metaKey: true,
                composed: true
            });

            // 再次聚焦编辑器并发送快捷键
            (editor as HTMLElement).focus();
            editor.dispatchEvent(keyEvent);
            console.log("CMD+Enter 事件触发完成");
        }

        let toastDOM = await waitSendSuccess();
        const successTexts = ["Your post was sent", "你的帖子已发送", "你的貼文已發送"];
        const isSuccess = successTexts.some((text) => toastDOM.innerText.includes(text));

        if (!isSuccess) {
            await closeCommentDialog();
            throw new Error("评论发送失败," + toastDOM.innerText);
        }

        // 上报已回复推文
        try {
            const currentUrl = window.location.href;
            const tweetId = extractTweetIdFromUrl(currentUrl);
            const userTwitterAccount = await selfLocalStorage.getItem("xUserName");

            if (tweetId && userTwitterAccount) {
                // 向 background 发送上报请求
                // browser.runtime.sendMessage({
                //     action: "reportReply",
                //     data: {
                //         userTwitterAccount: userTwitterAccount,
                //         tweetIds: [tweetId]
                //         // commentedUserTwitterAccount 可以从页面获取，暂时留空或根据需求添加
                //     }
                // });
                // console.log("上报已回复推文成功", tweetId);
            }
        } catch (reportError) {
            console.error("上报已回复推文失败", reportError);
            // 上报失败不影响主流程，仅记录日志
        }

        return true;
    } catch (error) {
        throw new Error("发布评论失败: " + error.message);
    }
}
export async function MockCommentX(data: any) {
    // throw new Error("评论发送失败,测试");
    let retrtyCount = 0;
    const { missionId } = data;
    // 辅助函数：等待元素出现
    try {
        //检查当前页面是否加载失败
        let needRetry = await checkNeedRetry();
        if (!needRetry) {
            throw new Error("页面加载失败，已点击重试按钮，请稍后");
        }
        // let { response, tweetId, needCommentContent, selectedTweetText } = await findsSelectedTweetText(missionId, retrtyCount, data);
        // selectedTweetText.scrollIntoView();
        let { response, tweetId, needCommentContent } = await getNeedCommentTweetNew(missionId, data, retrtyCount);

        // let wrapNode = selectedTweetText.closest('article[data-testid="tweet"]');
        // if (!wrapNode) {
        //     throw new Error("未找到需要评论的节点的包裹元素");
        // }
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // let replyButton = wrapNode.querySelector('button[data-testid="reply"]');
        let replyButton = document.querySelector('button[data-testid="reply"]');
        console.log("replyButton", replyButton, response.replyContent);
        if (!replyButton) {
            throw new Error("未找到回复按钮");
        }
        if (!response.replyContent) {
            throw new Error("未生成回复内容");
        }
        const clickReplyButtonEvent = new Event("click", { bubbles: true });
        replyButton.dispatchEvent(clickReplyButtonEvent);
        await waitForElement('div[data-viewportview="true"]');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const editor = document.querySelector('div[data-contents="true"]');
        if (!editor) {
            console.log("未找到编辑器元素");
            throw new Error("编辑器元素未找到");
        }

        if (!editor.closest('[role="dialog"]')) {
            //二次等待回复对话框打开
            await new Promise((resolve) => setTimeout(resolve, 10000));
            if (!editor.closest('[role="dialog"]')) {
                throw new Error("回复对话框未打开");
            }
        }

        // 聚焦编辑器
        (editor as HTMLElement).focus();
        // 使用 ClipboardEvent 粘贴文本
        const combinedText = response.replyContent; //限制最大字符数
        const pasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
        });
        pasteEvent.clipboardData!.setData("text/plain", combinedText);
        editor.dispatchEvent(pasteEvent);

        await new Promise((resolve) => setTimeout(resolve, 1000));
        //判断是否超长
        let checkDOM = document.querySelector('[data-testid="countdown-circle"]');
        if (checkDOM && checkDOM.children[2]) {
            let num = (checkDOM.children[2] as HTMLElement).innerText;
            if (Number(num) < 0) {
                await closeCommentDialog();
                throw new Error("评论内容过长，无法发送");
            }
        }
        // 查找发布按钮
        const allButtons = document.querySelectorAll("button");
        const publishButton = Array.from(allButtons).find((button) => {
            return button.textContent == "Reply答" || button.textContent == "Reply" || button.textContent == "回复" || button.textContent == "回覆";
        });

        console.log("sendButton", publishButton);

        if (publishButton) {
            // 如果找到发布按钮，检查是否可点击
            let attempts = 0;
            while (publishButton.disabled && attempts < 10) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
                attempts++;
                console.log(`Waiting for send button to be enabled. Attempt ${attempts}/10`);
            }

            if (publishButton.disabled) {
                console.log("Send button is still disabled after 10 attempts");
                throw new Error("Send button is still disabled after 10 attempts");
            }

            console.log("sendButton clicked");
            // 点击发布按钮
            const clickEvent = new Event("click", { bubbles: true });
            publishButton.dispatchEvent(clickEvent);
        } else {
            // 如果没找到发布按钮，尝试使用快捷键发布
            console.log("未找到'发送'按钮");
            const keyEvent = new KeyboardEvent("keydown", {
                bubbles: true,
                cancelable: true,
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                metaKey: true,
                composed: true
            });

            // 再次聚焦编辑器并发送快捷键
            (editor as HTMLElement).focus();
            editor.dispatchEvent(keyEvent);
            console.log("CMD+Enter 事件触发完成");
        }

        let toastDOM = await waitSendSuccess();
        if (toastDOM.innerText.indexOf("Your post was sent") === -1 && toastDOM.innerText.indexOf("你的帖子已发送") === -1 && toastDOM.innerText.indexOf("你的貼文已發送") === -1) {
            //需要关闭对话框
            await closeCommentDialog();
            throw new Error("评论发送失败," + toastDOM.innerText);
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        let postTweetId = await findTweetIdWithUserNameFirst(data);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        let res = {
            postTweetId,
            tweetId,
            needCommentContent,
            replyContent: response.replyContent
        };
        console.log("MockCommentX", res, data);
        return res;
    } catch (error) {
        throw new Error("X 发布过程中出错2:" + error.message);
    }
}

export async function MockSingleCommentX(data: any) {
    const { missionId } = data;
    // 辅助函数：等待元素出现
    try {
        let needRetry = await checkNeedRetry();
        if (!needRetry) {
            throw new Error("页面加载失败，已点击重试按钮，请稍后");
        }
        await waitForElement('[data-testid="tweetText"]');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        let contentDOM = document.querySelector('[data-testid="tweetText"]');
        if (!contentDOM) {
            throw new Error("未找到需要评论的节点");
        }
        let needCommentContent = (contentDOM as HTMLElement).innerText;
        if (needCommentContent.length === 0) {
            throw new Error("需要评论的节点内容为空");
        }
        const response = await browser.runtime.sendMessage({
            action: "generateComment",
            data: {
                missionId,
                tweetId: data.tweetId,
                tweetText: needCommentContent
            }
        });
        console.log("来自 background 的评论内容:", response);
        if (!response) {
            throw new Error("回复内容获取失败");
        }
        if (!response.canSend) {
            throw new Error("回复内容不可以发布");
        }
        let replyButton = document.querySelector('button[data-testid="reply"]');
        console.log("replyButton", replyButton, response.replyContent);
        if (!replyButton) {
            throw new Error("未找到回复按钮");
        }
        if (!response.replyContent) {
            throw new Error("未生成回复内容");
        }
        const clickReplyButtonEvent = new Event("click", { bubbles: true });
        replyButton.dispatchEvent(clickReplyButtonEvent);
        await waitForElement('div[data-viewportview="true"]');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const editor = document.querySelector('div[data-contents="true"]');
        if (!editor) {
            console.log("未找到编辑器元素");
            throw new Error("编辑器元素未找到");
        }
        if (!editor.closest('[role="dialog"]')) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            if (!editor.closest('[role="dialog"]')) {
                throw new Error("回复对话框未打开");
            }
        }

        // 聚焦编辑器
        (editor as HTMLElement).focus();
        // 使用 ClipboardEvent 粘贴文本
        const combinedText = response.replyContent; //限制最大字符数
        const pasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
        });
        pasteEvent.clipboardData!.setData("text/plain", combinedText);
        editor.dispatchEvent(pasteEvent);

        await new Promise((resolve) => setTimeout(resolve, 1000));
        //判断是否超长
        let checkDOM = document.querySelector('[data-testid="countdown-circle"]');
        if (checkDOM && checkDOM.children[2]) {
            let num = (checkDOM.children[2] as HTMLElement).innerText;
            if (Number(num) < 0) {
                await closeCommentDialog();
                // const closeBtn = document.querySelector(
                //     '[data-testid="app-bar-close"]'
                // );
                // if (closeBtn) {
                //     (closeBtn as HTMLElement).click();
                //     await new Promise((resolve) => setTimeout(resolve, 1000));
                // }

                // const confirmBtn = document.querySelector(
                //     '[data-testid="confirmationSheetCancel"]'
                // );
                // if (confirmBtn) {
                //     (confirmBtn as HTMLElement).click();
                //     await new Promise((resolve) => setTimeout(resolve, 1000));
                // }
                throw new Error("评论内容过长，无法发送");
            }
        }

        // 查找发布按钮
        const allButtons = document.querySelectorAll("button");
        const publishButton = Array.from(allButtons).find((button) => {
            return button.textContent == "Reply答" || button.textContent == "Reply" || button.textContent == "回复" || button.textContent == "回覆";
        });

        console.log("sendButton", publishButton);

        if (publishButton) {
            // 如果找到发布按钮，检查是否可点击
            let attempts = 0;
            while (publishButton.disabled && attempts < 10) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
                attempts++;
                console.log(`Waiting for send button to be enabled. Attempt ${attempts}/10`);
            }

            if (publishButton.disabled) {
                console.log("Send button is still disabled after 10 attempts");
                throw new Error("Send button is still disabled after 10 attempts");
            }

            console.log("sendButton clicked");
            // 点击发布按钮
            const clickEvent = new Event("click", { bubbles: true });
            publishButton.dispatchEvent(clickEvent);
        } else {
            // 如果没找到发布按钮，尝试使用快捷键发布
            console.log("未找到'发送'按钮");
            const keyEvent = new KeyboardEvent("keydown", {
                bubbles: true,
                cancelable: true,
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                metaKey: true,
                composed: true
            });

            // 再次聚焦编辑器并发送快捷键
            (editor as HTMLElement).focus();
            editor.dispatchEvent(keyEvent);
            console.log("CMD+Enter 事件触发完成");
        }
        let toastDOM = await waitSendSuccess();
        if (toastDOM.innerText.indexOf("Your post was sent") === -1 && toastDOM.innerText.indexOf("你的帖子已发送") === -1 && toastDOM.innerText.indexOf("你的貼文已發送") === -1) {
            await closeCommentDialog();
            throw new Error("评论发送失败," + toastDOM.innerText);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        let postTweetId = await findTweetIdWithUserNameFirst(data);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
            postTweetId,
            needCommentContent,
            replyContent: response.replyContent
        };
    } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        throw new Error("X 发布过程中出错3:" + error.message);
    }
}

let isStopOneClick = false;

export function stopMockOneClickCommentX() {
    isStopOneClick = true;
}

export async function MockOneClickCommentX(data: any) {
    const { aiId } = data;
    const processedIds = new Set<string>();
    const MAX_COMMENTS = 10;
    isStopOneClick = false;

    try {
        if (isStopOneClick) throw new Error("任务已停止");
        console.log("MockOneClickCommentX start", aiId);
        await selfLocalStorage.setItem("oneClickCommentStartTime", new Date().toISOString());

        // 1. 回复当前页面推文 (主贴)
        const mainText = await getPageTweetText(document);
        browser.runtime.sendMessage({
            action: "oneClickCommentStatus",
            data: { log: `获取主贴内容: ${mainText.substring(0, 20)}...` }
        });

        const mainResponse = await browser.runtime.sendMessage({
            action: "generateOneClickComment",
            data: { aiId, tweetText: mainText }
        });

        if (mainResponse && mainResponse.canSend && mainResponse.replyContent) {
            browser.runtime.sendMessage({
                action: "oneClickCommentStatus",
                data: { log: `主贴回复生成中...` }
            });
            await publishReplyToCurrentPage(mainResponse.replyContent, document);

            // 记录主贴 ID
            const mainId = extractTweetIdFromUrl(window.location.href);
            if (mainId) processedIds.add(mainId);

            browser.runtime.sendMessage({
                action: "oneClickCommentStatus",
                data: { log: `主贴回复成功` }
            });
        } else {
            browser.runtime.sendMessage({
                action: "oneClickCommentStatus",
                data: { log: `主贴无需回复或获取失败，跳过` }
            });
        }

        // 循环处理评论
        let currentCount = 0;
        while (currentCount < MAX_COMMENTS) {
            if (isStopOneClick) throw new Error("任务已停止");
            // 2. 等待随机时间并滑动浏览
            browser.runtime.sendMessage({
                action: "oneClickCommentStatus",
                data: { log: `浏览中...等待加载评论` }
            });

            const scrollAmount = Math.floor(Math.random() * 300) + 100;
            window.scrollBy({ top: scrollAmount, behavior: "smooth" });
            await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 10000) + 2000));
            if (isStopOneClick) throw new Error("任务已停止");

            // 3. 找到第一个未评论
            await waitForElement('[data-testid="cellInnerDiv"]');
            const articles = document.querySelectorAll('article[data-testid="tweet"]');
            let commentNode: Element | null = null;

            for (const article of Array.from(articles)) {
                const link = article.querySelector('a[href*="/status/"]');
                if (!link) continue;
                const href = (link as HTMLAnchorElement).href;
                // 排除 status 后面没有 ID 的情况 (e.g. /status/123/analytics)
                const segments = href.split("/");
                const statusIndex = segments.indexOf("status");
                if (statusIndex === -1 || statusIndex + 1 >= segments.length) continue;

                const id = segments[statusIndex + 1];
                const isAnalytics = segments.length > statusIndex + 2 && segments[statusIndex + 2] === "analytics";
                if (isAnalytics) continue;

                if (id && !processedIds.has(id)) {
                    // 简单跳过主贴（假设主贴在最上面，或者通过其他方式判断）
                    // 如果是主贴，通常 href 等于 window.location.href
                    // 这里严格判断 ID
                    const currentUrlId = extractTweetIdFromUrl(window.location.href);
                    if (id === currentUrlId) continue;

                    commentNode = article;
                    break;
                }
            }

            if (!commentNode) {
                // 尝试滚动更多
                await scrollList();
                continue;
            }

            // 获取 ID 并加入集合
            const link = commentNode.querySelector('a[href*="/status/"]');
            const id = extractTweetIdFromUrl((link as HTMLAnchorElement).href);
            if (!id) continue;
            processedIds.add(id);

            // 4. 点击打开该评论
            browser.runtime.sendMessage({
                action: "oneClickCommentStatus",
                data: { log: `打开详情: ${id}` }
            });
            commentNode.scrollIntoView({ behavior: "smooth", block: "center" });
            await new Promise((resolve) => setTimeout(resolve, 2000));
            // (commentNode as HTMLElement).click();
            // 等待页面加载
            await new Promise((r) => setTimeout(r, 3000));
            if (isStopOneClick) throw new Error("任务已停止");

            try {
                // 5. 回复该评论

                const subText = await getPageTweetText(commentNode);
                const subResponse = await browser.runtime.sendMessage({
                    action: "generateOneClickComment",
                    data: { aiId, tweetText: subText }
                });

                if (subResponse && subResponse.replyContent) {
                    await publishReplyToCurrentPage(subResponse.replyContent, commentNode);
                    currentCount++;
                    browser.runtime.sendMessage({
                        action: "oneClickCommentStatus",
                        data: { log: `回复子评论成功 (${currentCount}/${MAX_COMMENTS})` }
                    });
                }
            } catch (innerError) {
                console.error("回复子评论出错", innerError);
                browser.runtime.sendMessage({
                    action: "oneClickCommentStatus",
                    data: { log: `回复子评论出错: ${innerError.message}` }
                });
            }

            // 6. 等待随机时间并滑动
            const scrollAmount2 = Math.floor(Math.random() * 300) + 100;
            window.scrollBy({ top: scrollAmount2, behavior: "smooth" });
            await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 10000) + 2000));

            // 7. 返回
            window.history.back();
            await new Promise((r) => setTimeout(r, 3000));
            if (isStopOneClick) throw new Error("任务已停止");
            await waitForElement('[data-testid="tweetText"]');
        }

        browser.runtime.sendMessage({
            action: "oneClickCommentStatus",
            data: { status: "completed", log: `一键评论任务全部完成` }
        });
    } catch (error) {
        console.error("oneClickComment error:", error);
        browser.runtime.sendMessage({
            action: "oneClickCommentStatus",
            data: {
                status: "error",
                log: error.message || "执行出错"
            }
        });
        await selfLocalStorage.removeItem("oneClick_isRunning");
    }
}
function extractUserNameFromUrl(url: string): string | null {
    // 匹配 x.com/用户名 或 twitter.com/用户名，兼容后续路径
    const match = url.match(/(?:x|twitter)\.com\/([^\/]+)/);
    return match ? match[1] : null;
}
export async function MockInteractCommentersX(data: any) {
    const { aiId } = data;
    const processedUsers = new Set<string>();
    const MAX_USERS = 10;

    // Load self username to exclude
    const myUserName = await selfLocalStorage.getItem("xUserName");
    if (myUserName) {
        processedUsers.add(myUserName);
        // exclude also simple string
        processedUsers.add(`/${myUserName}`);
    }

    //获取主贴 name排除掉
    const mainTweetUserName = await extractUserNameFromUrl(window.location.href);
    if (mainTweetUserName) {
        processedUsers.add(mainTweetUserName);
        // exclude also simple string
        processedUsers.add(`/${mainTweetUserName}`);
    }
    // Reset stop flag for this session? Or assume it's shared global `isStopOneClick`.
    // It seems `isStopOneClick` is global in this module.
    // We should probably reset it or ensure it's false at start.
    isStopOneClick = false;

    try {
        console.log("MockInteractCommentersX start", aiId);
        if (isStopOneClick) throw new Error("任务已停止");
        await selfLocalStorage.setItem("interactCommentersStartTime", new Date().toISOString());

        // 1. 记录主贴页面，并回复主贴
        browser.runtime.sendMessage({
            action: "oneClickCommentStatus",
            data: { log: `开始任务：回复主贴中...` }
        });

        const mainText = await getPageTweetText(document);
        // Reply Main Tweet
        try {
            const mainResponse = await browser.runtime.sendMessage({
                action: "generateOneClickComment",
                data: { aiId, tweetText: mainText }
            });

            if (mainResponse && mainResponse.replyContent) {
                await publishReplyToCurrentPage(mainResponse.replyContent, document);
                browser.runtime.sendMessage({
                    action: "oneClickCommentStatus",
                    data: { log: `主贴回复成功` }
                });
            } else {
                browser.runtime.sendMessage({
                    action: "oneClickCommentStatus",
                    data: { log: `主贴无需回复或获取失败，跳过` }
                });
            }
        } catch (e) {
            console.error("Main tweet reply failed", e);
            browser.runtime.sendMessage({
                action: "oneClickCommentStatus",
                data: { log: `主贴回复出错: ${e.message}` }
            });
        }

        let currentCount = 0;

        while (currentCount < MAX_USERS) {
            if (isStopOneClick) throw new Error("任务已停止");

            // 2. 滑动并寻找评论区的用户 (持续滚动直到找到未处理的用户)
            browser.runtime.sendMessage({
                action: "oneClickCommentStatus",
                data: { log: `寻找第 ${currentCount + 1} 个用户...` }
            });

            let targetUserLink: HTMLAnchorElement | null = null;
            let targetUserName = "";
            let scrollAttempts = 0;
            const maxScrollAttempts = 20;
            let noScrollChangeCount = 0;

            while (!targetUserLink && scrollAttempts < maxScrollAttempts) {
                const startScrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                scrollAttempts++;

                // 持续向下滚动
                const scrollAmount = Math.floor(Math.random() * 300) + 500;
                window.scrollBy({ top: scrollAmount, behavior: "smooth" });
                await new Promise((resolve) => setTimeout(resolve, 1500));

                if (isStopOneClick) throw new Error("任务已停止");

                const endScrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                if (Math.abs(endScrollTop - startScrollTop) < 1) {
                    noScrollChangeCount++;
                } else {
                    noScrollChangeCount = 0;
                }

                if (noScrollChangeCount >= 3) {
                    break;
                }

                // 查询所有评论中的用户
                const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));

                for (const article of articles) {
                    // Find user link
                    const userLinkDiv = article.querySelector('div[data-testid="User-Name"]');
                    if (!userLinkDiv) continue;

                    // 获取 User-Name 区块内的链接
                    const links = userLinkDiv.querySelectorAll('a[href^="/"]');
                    for (const link of Array.from(links)) {
                        const href = link.getAttribute("href");
                        if (!href) continue;

                        // 过滤掉状态链接、话题标签等
                        if (href.includes("/status/")) continue;

                        // 必须是用户个人资料链接，通常格式为 /username
                        const segments = href.split("/").filter(Boolean);
                        if (segments.length !== 1) continue;

                        const possibleUser = segments[0];

                        // 检查是否已处理过
                        if (!processedUsers.has(possibleUser)) {
                            targetUserLink = link as HTMLAnchorElement;
                            targetUserName = possibleUser;
                            break;
                        }
                    }
                    if (targetUserLink) break;
                }
            }

            if (noScrollChangeCount >= 3) {
                browser.runtime.sendMessage({
                    action: "oneClickCommentStatus",
                    data: { log: `页面已滚动到底部，任务提前结束` }
                });
                break;
            }

            if (!targetUserLink) {
                // 达到最大滚动次数仍未找到新用户，结束任务
                browser.runtime.sendMessage({
                    action: "oneClickCommentStatus",
                    data: { log: `达到最大查找次数仍未找到新用户，任务结束` }
                });
                break;
            }

            // Found a user
            processedUsers.add(targetUserName);

            // 3. 点击用户头像/名字进入 Home 页
            browser.runtime.sendMessage({
                action: "oneClickCommentStatus",
                data: { log: `访问用户: ${targetUserName}` }
            });
            targetUserLink.click();

            // Wait for navigation
            await new Promise((r) => setTimeout(r, 4000));
            if (isStopOneClick) throw new Error("任务已停止");

            // Wait for Tweets to load
            try {
                // await waitForElement('[data-testid="tweetText"]', 10000);
                // User might not have tweets, or private.
                // We wait for primary column
                await waitForElement('[data-testid="primaryColumn"]');
            } catch (e) {
                console.log("Timeout waiting for user page, going back");
                const backButton = document.querySelector('[aria-label="Back"]');
                if (backButton) {
                    (backButton as HTMLElement).click();
                } else {
                    window.history.back();
                }

                await new Promise((r) => setTimeout(r, 2000));

                if (document.querySelector('[data-testid="twc-cc-mask"]')) {
                    await closeCommentDialog();
                    const closeBtn = document.querySelector('[aria-label="Close"]');
                    if (closeBtn) (closeBtn as HTMLElement).click();
                    await new Promise((r) => setTimeout(r, 1000));

                    if (backButton) {
                        (backButton as HTMLElement).click();
                    } else {
                        window.history.back();
                    }
                }

                await new Promise((r) => setTimeout(r, 3000));
                continue;
            }

            // 4. 获取最新一条帖子 (排除置顶，且必须是该用户自己发送的)
            // Re-query articles on the new page
            const userTweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
            let targetTweet: Element | null = null;

            for (const tweet of userTweets) {
                // Check for Pinned
                // Inspect standard structure for "Pinned" text or icon
                // data-testid="socialContext" usually contains "Pinned"
                const socialContext = tweet.querySelector('[data-testid="socialContext"]');
                const isPinned = socialContext && (socialContext.textContent?.includes("Pinned") || socialContext.textContent?.includes("置顶") || socialContext.textContent?.includes("固定"));

                if (isPinned) continue;

                // 检查是否为用户本人发送 (排除转推)
                const userNameNode = tweet.querySelector('[data-testid="User-Name"]');
                if (!userNameNode) continue;

                // 检查 User-Name 区块内的链接是否指向目标用户
                // 目标用户的 handle 应该是 /targetUserName
                const isAuthor = Array.from(userNameNode.querySelectorAll("a")).some((link) => {
                    const href = link.getAttribute("href");
                    return href && href.toLowerCase() === `/${targetUserName.toLowerCase()}`;
                });

                if (isAuthor) {
                    targetTweet = tweet;
                    break;
                }
            }

            if (targetTweet) {
                // 5. 回复这条帖子
                browser.runtime.sendMessage({
                    action: "oneClickCommentStatus",
                    data: { log: `正在回复用户 ${targetUserName} 的最新推文...` }
                });

                try {
                    // Scroll to tweet
                    targetTweet.scrollIntoView({ block: "center", behavior: "smooth" });
                    await new Promise((r) => setTimeout(r, 2000));

                    // Click Reply Button inside targetTweet
                    const replyBtn = targetTweet.querySelector('button[data-testid="reply"]');
                    if (replyBtn) {
                        const clickReplyButtonEvent = new Event("click", { bubbles: true });
                        replyBtn.dispatchEvent(clickReplyButtonEvent);

                        await waitForElement('div[data-viewportview="true"]'); // details modal or composer
                        await new Promise((r) => setTimeout(r, 2000));

                        // a. Get Text
                        // targetTweet contains tweetText.
                        const tweetTextNode = targetTweet.querySelector('[data-testid="tweetText"]');
                        const tweetContent = (tweetTextNode as HTMLElement)?.innerText || "";

                        if (tweetContent) {
                            browser.runtime.sendMessage({
                                action: "oneClickCommentStatus",
                                data: { log: `生成回复内容中...` }
                            });
                            // b. Generate Reply
                            const aiResponse = await browser.runtime.sendMessage({
                                action: "generateOneClickComment",
                                data: { aiId, tweetText: tweetContent }
                            });

                            if (aiResponse && aiResponse.replyContent) {
                                // Now we are already in reply modal because we clicked?
                                const editor = document.querySelector('div[data-contents="true"]');
                                if (editor) {
                                    (editor as HTMLElement).focus();
                                    const pasteEvent = new ClipboardEvent("paste", {
                                        bubbles: true,
                                        cancelable: true,
                                        clipboardData: new DataTransfer()
                                    });
                                    pasteEvent.clipboardData!.setData("text/plain", aiResponse.replyContent);
                                    editor.dispatchEvent(pasteEvent);

                                    await new Promise((r) => setTimeout(r, 1500));

                                    // Click Send
                                    const sendBtns = document.querySelectorAll('button[data-testid="tweetButton"]'); // Modal send button usually has this id
                                    const realSendBtn = Array.from(sendBtns).find((b) => !b.disabled);
                                    if (realSendBtn) {
                                        realSendBtn.dispatchEvent(new Event("click", { bubbles: true }));
                                        await waitSendSuccess(); // usage of existing helper
                                        currentCount++;
                                    } else {
                                        // Fallback look for "Reply" text buttons if testid differs
                                        const allButtons = document.querySelectorAll("button");
                                        const fallbackBtn = Array.from(allButtons).find((button) => {
                                            return ["Reply", "回复", "发布", "Post", "Reply答"].includes(button.textContent || "");
                                        });
                                        if (fallbackBtn && !fallbackBtn.disabled) {
                                            fallbackBtn.dispatchEvent(new Event("click", { bubbles: true }));
                                            await waitSendSuccess(); // usage of existing helper
                                            currentCount++;
                                        } else {
                                            throw new Error("无法点击发送按钮（按钮未找到或禁用）");
                                        }
                                    }
                                    browser.runtime.sendMessage({
                                        action: "oneClickCommentStatus",
                                        data: { log: `回复用户 ${targetUserName} 成功` }
                                    });
                                } else {
                                    throw new Error("找不到编辑器");
                                }
                            } else {
                                // Close modal if no content generated
                                browser.runtime.sendMessage({
                                    action: "oneClickCommentStatus",
                                    data: { log: `AI回复生成失败或为空，取消操作` }
                                });
                                const closeBtn = document.querySelector('[data-testid="app-bar-close"]');
                                if (closeBtn) (closeBtn as HTMLElement).click();
                            }
                        } else {
                            browser.runtime.sendMessage({
                                action: "oneClickCommentStatus",
                                data: { log: `未找到推文文本内容，取消操作` }
                            });
                            // 关闭可能打开的弹窗
                            const closeBtn = document.querySelector('[data-testid="app-bar-close"]');
                            if (closeBtn) (closeBtn as HTMLElement).click();
                        }
                    } else {
                        throw new Error("未找到回复按钮");
                    }
                } catch (replyError) {
                    console.error("Reply on user home failed", replyError);
                    browser.runtime.sendMessage({
                        action: "oneClickCommentStatus",
                        data: { log: `回复失败: ${replyError.message}` }
                    });
                    // Try to close modal blindly just in case
                    await closeCommentDialog();
                }
            } else {
                browser.runtime.sendMessage({
                    action: "oneClickCommentStatus",
                    data: { log: `该用户没有合适推文可回复` }
                });
            }

            // 6. 返回 post 主页
            browser.runtime.sendMessage({
                action: "oneClickCommentStatus",
                data: { log: `返回主贴页面` }
            });

            const backButton = document.querySelector('[aria-label="Back"]');
            if (backButton) {
                (backButton as HTMLElement).click();
            } else {
                window.history.back();
            }

            await new Promise((r) => setTimeout(r, 2000));

            if (document.querySelector('[data-testid="twc-cc-mask"]')) {
                await closeCommentDialog();
                const closeBtn = document.querySelector('[aria-label="Close"]');
                if (closeBtn) (closeBtn as HTMLElement).click();
                await new Promise((r) => setTimeout(r, 1000));

                if (backButton) {
                    (backButton as HTMLElement).click();
                } else {
                    window.history.back();
                }
            }

            // Wait for main page restore
            await new Promise((r) => setTimeout(r, 3000));
            if (isStopOneClick) throw new Error("任务已停止");
            await waitForElement('[data-testid="tweetText"]');
        } // end while

        browser.runtime.sendMessage({
            action: "oneClickCommentStatus",
            data: { status: "completed", log: `互动评论任务完成，共回复 ${currentCount} 人` }
        });
    } catch (e) {
        console.error("MockInteractCommentersX Error", e);
        browser.runtime.sendMessage({
            action: "oneClickCommentStatus",
            data: {
                status: "error",
                log: e.message || "执行出错"
            }
        });
        await selfLocalStorage.removeItem("oneClick_isRunning");
    }
}
