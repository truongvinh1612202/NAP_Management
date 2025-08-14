var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { rmSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import pkg from './package.json';
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var command = _a.command;
    rmSync('dist-electron', { recursive: true, force: true });
    var isServe = command === 'serve';
    var isBuild = command === 'build';
    var sourcemap = isServe || !!process.env.VSCODE_DEBUG;
    return {
        base: './', // Use relative paths for better Electron compatibility
        resolve: {
            alias: {
                '@': path.join(__dirname, 'src')
            },
        },
        plugins: [
            react(),
            electron({
                main: {
                    // Shortcut of `build.lib.entry`
                    entry: 'electron/main/index.ts',
                    onstart: function (args) {
                        if (process.env.VSCODE_DEBUG) {
                            console.log(/* For `.vscode/.debug.script.mjs` */ '[startup] Electron App');
                        }
                        else {
                            args.startup();
                        }
                    },
                    vite: {
                        build: {
                            sourcemap: sourcemap,
                            minify: isBuild,
                            outDir: 'dist-electron/main',
                            rollupOptions: {
                                external: __spreadArray(__spreadArray([], Object.keys('dependencies' in pkg ? pkg.dependencies : {}), true), [
                                    '../generated/client/index.js',
                                ], false)
                            },
                        },
                    },
                },
                preload: {
                    // Shortcut of `build.rollupOptions.input`.
                    // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
                    input: 'electron/preload/index.ts',
                    vite: {
                        build: {
                            sourcemap: sourcemap ? 'inline' : undefined, // #332
                            minify: isBuild,
                            outDir: 'dist-electron/preload',
                            rollupOptions: {
                                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
                            },
                        },
                    },
                },
                // Ployfill the Electron and Node.js API for Renderer process.
                // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
                // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
                renderer: {},
            }),
        ],
        server: process.env.VSCODE_DEBUG && (function () {
            var url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL);
            return {
                host: url.hostname,
                port: +url.port,
            };
        })(),
        clearScreen: false,
    };
});
