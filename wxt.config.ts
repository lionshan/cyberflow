import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ["@wxt-dev/module-vue"],
    runner: {
        startUrls: ["https://x.com/home"]
    },
    manifest: {
        permissions: ["storage", "alarms"],
        host_permissions: [
            "https://cyberflow.info/*",
            "http://testkolabc.cyberflow.info/*"
        ],
        name: "Cyberflow"
    }
});
