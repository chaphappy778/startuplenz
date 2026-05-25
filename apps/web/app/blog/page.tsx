// apps/web/app/blog/page.tsx
//
// Blog index. Lists every post sorted newest-first. Each post lives as a
// markdown file in apps/web/content/blog/ — see lib/blog.ts for the reader.

import type { Metadata } from "next";
import Link from "next/link";
import { baseMetadata } from "@/lib/seo";
import { getAllPostsSorted } from "@/lib/blog";

export const metadata: Metadata = baseMetadata({
  title: "Blog — StartupLenz",
  description:
    "Founder writing from StartupLenz: indie business economics, vertical deep-dives, and what we've learned modeling real-world startup costs.",
});

export default function BlogIndexPage() {
  const posts = getAllPostsSorted();

  return (
    <main className="prose-page">
      <header className="prose-page-header">
        <span className="home-section-eyebrow">Blog</span>
        <h1 className="prose-page-title">Notes from building a living calculator</h1>
        <p className="prose-page-lede">
          Vertical deep-dives, founder writing, and what we&rsquo;re learning
          modeling real startup costs for indie operators.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="prose-page-empty">No posts yet. Check back soon.</p>
      ) : (
        <ul className="blog-index-list">
          {posts.map((p) => (
            <li key={p.slug} className="blog-index-row">
              <Link href={`/blog/${p.slug}`} className="blog-index-link">
                <div className="blog-index-meta">
                  <span className="blog-index-date">{p.dateDisplay}</span>
                  {p.author && <span className="blog-index-author">{p.author}</span>}
                </div>
                <h2 className="blog-index-title">{p.title}</h2>
                {p.description && (
                  <p className="blog-index-desc">{p.description}</p>
                )}
                <span className="blog-index-cta">Read →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
