import { MarkdownInstance } from "astro";

const { MODE } = import.meta.env;

export type Post = {
  title: string;
  slug: string;
  preview: string;
  timestamp: number;
  draft: boolean;
  date: string;
  file: URL;
  Content: any;
  tag: string;
};

export function single(post): Post {
  let s = post.file.pathname.split("/");
  s = s.slice(s.length - 2);
  s[1] = s[1].replace(".md", "");
  const slug = s[1];
  return {
    ...post,
    slug: slug,
    tag: s[0],
    draft: post.file.pathname.split("/").reverse()[1] === "drafts",
    timestamp: new Date(post.date).valueOf(),
  };
}

export function published(
  posts: MarkdownInstance<Record<string, any>>[]
): Post[] {
  return posts
    .map((f) => ({
      date: f.frontmatter.pubDate,
      title: f.frontmatter.title,
      draft: f.frontmatter.draft,
      file: new URL(f.file, "file://"),
      slug: "",
      preview: "",
      Content: f.Content,
      timestamp: new Date(f.frontmatter.pubDate).valueOf(),
    }))
    .filter((post) => post.title)
    .map((post) => single(post))
    .filter((post) => MODE === "development" || !post.draft)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function getRSS(posts: Post[]) {
  return {
    title: "Simple Blog RSS",
    description: "Simple Blog RSS Feed",
    stylesheet: true,
    customData: `<language>en-us</language>`,
    items: posts.map((post: Post) => ({
      title: post.title,
      link: post.slug,
      pubDate: post.date,
    })),
  };
}
