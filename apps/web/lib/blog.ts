// apps/web/lib/blog.ts
//
// Markdown-driven blog post reader. Posts live as plain `.md` files in
// `apps/web/content/blog/`, with YAML frontmatter for metadata.
//
// Frontmatter shape (all fields except `title` optional):
//   ---
//   title:       "Post title"
//   slug:        "post-slug"   ← if omitted, the filename is used
//   date:        2026-05-24
//   description: "..."
//   author:      "..."
//   canonical:   "https://..."
//   ---
//
// Posts are read at build time for /blog/[slug] static generation and at
// request time when SSR (since the root layout is force-dynamic). Both
// paths use the same readers below; the filesystem access happens inside
// the Next.js process so this only works server-side.

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;          // ISO string for sortable comparison
  dateDisplay: string;   // e.g. "May 24, 2026"
  author: string | null;
  canonical: string | null;
}

export interface BlogPost extends BlogPostMeta {
  /** Rendered HTML body of the post (no leading H1 — frontmatter title is the H1). */
  html: string;
}

function isoOf(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function displayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** List every `.md` file in the blog dir; returns slugs (filenames sans `.md`). */
export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

/** Read + parse a single post by its slug. Returns null if no such file exists. */
export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  // Configure marked for headless server-side use. No raw HTML passthrough
  // since we control these files, but `breaks: false` keeps standard CommonMark.
  const html = marked.parse(content, { async: false, breaks: false }) as string;

  const iso = isoOf(data.date);

  return {
    slug: typeof data.slug === "string" && data.slug.length > 0 ? data.slug : slug,
    title: typeof data.title === "string" && data.title.length > 0 ? data.title : slug,
    description: typeof data.description === "string" ? data.description : "",
    date: iso,
    dateDisplay: displayDate(iso),
    author: typeof data.author === "string" ? data.author : null,
    canonical: typeof data.canonical === "string" ? data.canonical : null,
    html,
  };
}

/** Get every post sorted newest-first, with the rendered HTML stripped. */
export function getAllPostsSorted(): BlogPostMeta[] {
  return getAllPostSlugs()
    .map((s) => getPostBySlug(s))
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(({ html: _html, ...meta }) => meta);
}
