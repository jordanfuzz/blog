import { defineConfig } from 'astro/config'

export default defineConfig({
    site: 'https://jordan.cooperplanet.com', // update before deploying
    output: 'static',
    build: { format: 'directory' },
})
