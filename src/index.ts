// src/index.ts

const RSS_FEEDS = [
  { name: "Guardian", url: "https://www.theguardian.com/world/rss" },
  { name: "NYT", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml" },
  { name: "CNN", url: "http://rss.cnn.com/rss/edition.rss" },
  { name: "BBC", url: "http://feeds.bbci.co.uk/news/rss.xml" },
  { name: "Bloomberg", url: "https://feeds.bloomberg.com/markets/news.rss" },
  { name: "WSJ", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml" },
  { name: "Fox", url: "https://moxie.foxnews.com/google-publisher/latest.xml" },
  { name: "DailyMail", url: "https://www.dailymail.co.uk/articles.rss" }
];

// -------------------- Helpers --------------------

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'");
}

/*function extractCDATA(content: string, tag: string): string {
  const regex = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    "i"
  );
  const match = content.match(regex);
  return match ? match[1] : "";
}*/

function extractCDATA(content: string, tag: string): string {
  const regex = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    "i"
  );
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

function extractLink(item: string, feedUrl: string): string {
  // 1. standard <link>value</link>
  let link = extractCDATA(item, "link");
  if (link) return link;

  // 2. <guid> fallback
  link = extractCDATA(item, "guid");
  if (link && link.startsWith("http")) return link;

  // 3. <atom:link href="...">
  const atomMatch = item.match(/<atom:link[^>]+href="([^"]+)"/i);
  if (atomMatch) return atomMatch[1];

  // 4. fallback به homepage سایت
  return feedUrl;
}

// -------------------- KV Round-Robin --------------------

async function getNextFeed(env: any) {
  const total = RSS_FEEDS.length;
  let indexStr = await env.FEED_STATE.get("index");
  let index = indexStr ? parseInt(indexStr) : 0;

  const feed = RSS_FEEDS[index];
  const next = (index + 1) % total;
  await env.FEED_STATE.put("index", next.toString());

  return feed;
}

// -------------------- KV Dedup --------------------

async function alreadySent(env: any, link: string) {
  const keyBuf = new TextEncoder().encode(link);
  const hashBuf = await crypto.subtle.digest("SHA-1", keyBuf);
  const hash = Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const exists = await env.SENT_HASHES.get(hash);
  if (exists) return true;

  await env.SENT_HASHES.put(hash, "1", { expirationTtl: 7 * 24 * 60 * 60 }); // 7 روز
  return false;
}

// -------------------- Process Feed --------------------

async function processFeed(feed: any, env: any) {
  try {
    const response = await fetch(feed.url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const xml = await response.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/gi);
    if (!items) return;

    for (const item of items.slice(0, 2)) {
      const title = decodeHtmlEntities(stripHtml(extractCDATA(item, "title")));
      const link = extractCDATA(item, "link") || extractCDATA(item, "guid"); //extractLink(item) || feed.url;//extractCDATA(item, "link") || extractCDATA(item, "guid") || feed.url;
      const rawContent = extractCDATA(item, "content:encoded") || extractCDATA(item, "description") || "";
      const summary = decodeHtmlEntities(stripHtml(rawContent)).slice(0, 500);

      if (!title || !link) continue;
      if (await alreadySent(env, link)) continue;

      const message =
        `📰 <b>${title}</b>\n\n` +
        (summary ? `${summary}\n\n` : "") +
        `🔗 <a href="${link}">Read full article</a>\n\n` +
        `Source: ${feed.name}`;

      await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.CHAT_ID,
          message_thread_id: Number(env.THREAD_ID),
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: false
        })
      });
    }
  } catch (e) {
    console.error(`Error processing feed ${feed.name}:`, e);
  }
}

// -------------------- Scheduled Worker --------------------

export default {
  async scheduled(event: any, env: any) {
    const feed = await getNextFeed(env);
    await processFeed(feed, env);
  }
};