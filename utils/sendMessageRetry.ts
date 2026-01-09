export async function sendMessageWithRetry(
    tabId: number,
    message: any,
    maxRetries: number = 3,
    retryDelay: number = 1000
): Promise<any> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await new Promise((resolve, reject) => {
                browser.tabs.sendMessage(tabId, message, (response) => {
                    if (browser.runtime.lastError) {
                        reject(new Error(browser.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
        } catch (error) {
            console.warn(`sendMessage失败，第${attempt + 1}次重试:`, error);
            if (attempt < maxRetries - 1) {
                await new Promise((res) => setTimeout(res, retryDelay));
            } else {
                throw error;
            }
        }
    }
}
