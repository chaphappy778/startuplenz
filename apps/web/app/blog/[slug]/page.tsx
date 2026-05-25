// apps/web/app/blog/[slug]/page.tsx
//
// Individual blog post page. Generates one statically-rendered route per
// markdown file under `apps/web/content/blog/`. Frontmatter drives the
// SEO metadata (title, description, canonical) + the Article JSON-LD.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { baseMetadata, SITE_URL } from "@/lib/seo";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return baseMetadata({
      title: "Post not found — StartupLenz",
      description: "The post you're looking for doesn't exist.",
    });
  }
  return baseMetadata({
    title: `${post.title} — StartupLenz`,
    description: post.description,
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const url = post.canonical ?? `${SITE_URL}/blog/${post.slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: post.author
      ? { "@type": "Person", name: post.author }
      : { "@type": "Organization", name: "ChapHaus LLC" },
    publisher: { "@type": "Organization", name: "StartupLenz" },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
  };

  return (
    <main className="prose-page blog-post-page">
      <header className="prose-page-header">
        <Link href="/blog" className="blog-back-link">
          ← All posts
        </Link>
        <span className="home-section-eyebrow">Blog</span>
        <h1 className="prose-page-title">{post.title}</h1>
        <div className="blog-post-meta">
          <span>{post.dateDisplay}</span>
          {post.author && <span>· {post.author}</span>}
        </div>
        {post.description && (
          <p className="prose-page-lede">{post.description}</p>
        )}
      </header>

      {/* Rendered markdown body. Safe because content comes from our own
          markdown files in the repo, not user input. */}
      <article
        className="prose blog-post-body"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      <footer className="blog-post-footer">
        <Link href="/blog" className="blog-back-link">
          ← Back to all posts
        </Link>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
    </main>
  );
}
