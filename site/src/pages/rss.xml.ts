import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import type { APIContext } from 'astro'

export async function GET(context: APIContext) {
    const posts = await getCollection('posts', ({ data }) => !data.draft)
    const sorted = posts.sort(
        (a, b) => b.data.date.localeCompare(a.data.date),
    )
    return rss({
        title: "Jordan's Blog",
        description: 'Personal posts about life, travel, games, and projects.',
        site: context.site!,
        items: sorted.map((post) => ({
            title: post.data.title,
            pubDate: new Date(post.data.date + 'T00:00:00'),
            description: post.data.description ?? undefined,
            link: `/posts/${post.id}/`,
        })),
    })
}
