// 声明 Chrome 扩展 API 类型
declare const chrome: {
    storage: {
        local: {
            get(
                keys: string[],
                callback: (result: { [key: string]: any }) => void
            ): void;
            set(items: { [key: string]: any }, callback: () => void): void;
            remove(keys: string[], callback: () => void): void;
        };
    };
};

export const selfLocalStorage = {
    getItem(key: string): Promise<string | null> {
        return new Promise((resolve) => {
            if (typeof chrome !== "undefined" && chrome.storage) {
                chrome.storage.local.get(
                    [key],
                    (result: { [key: string]: any }) => {
                        resolve(result[key] || null);
                    }
                );
            } else {
                resolve(localStorage.getItem(key));
            }
        });
    },
    setItem(key: string, value: string): Promise<void> {
        return new Promise((resolve) => {
            if (typeof chrome !== "undefined" && chrome.storage) {
                chrome.storage.local.set({ [key]: value }, () => {
                    resolve();
                });
            } else {
                localStorage.setItem(key, value);

                resolve();
            }
        });
    },
    removeItem(key: string): Promise<void> {
        return new Promise((resolve) => {
            if (typeof chrome !== "undefined" && chrome.storage) {
                chrome.storage.local.remove([key], () => {
                    resolve();
                });
                return;
            } else {
                localStorage.removeItem(key);
                resolve();
            }
        });
    }
};
