import { defineConfig } from 'astro/config'
import { visit } from 'unist-util-visit'

const GITHUB_PHOTOS_RE = /^https:\/\/raw\.githubusercontent\.com\/jordanfuzz\/blog\/master\/photos\/(.+)$/

function remarkLocalPhotos() {
    return (tree) => {
        visit(tree, 'image', (node) => {
            const match = node.url.match(GITHUB_PHOTOS_RE)
            if (match) {
                node.url = `/photos/${match[1].replace(/\.jpeg$/, '.jpg')}`
            }
        })
    }
}

export default defineConfig({
    site: 'https://jordan.cooperplanet.com',
    output: 'static',
    build: { format: 'directory' },
    markdown: {
        remarkPlugins: [remarkLocalPhotos],
    },
})
