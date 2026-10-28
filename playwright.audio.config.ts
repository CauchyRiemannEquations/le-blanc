import {defineConfig} from '@playwright/test';
import base from './playwright.config';

// Never reuse another contributor's dev server while validating this worktree.
export default defineConfig(base,{
 use:{...base.use,baseURL:'http://127.0.0.1:4317'},
 webServer:{command:'npm run dev -- --port 4317 --strictPort',url:'http://127.0.0.1:4317',reuseExistingServer:false},
});
