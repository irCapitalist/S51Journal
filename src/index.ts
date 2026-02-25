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

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function extractTag(content: string, tag: string): string {
  const match = content.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1] : "";
}

async function processFeed(feed: any, env: any) {
  const response = await fetch(feed.url);
  const xml = await response.text();

  const items = xml.match(/<item>([\s\S]*?)<\/item>/g);
  if (!items) return;

  // فقط 2 خبر اول هر منبع (برای جلوگیری از overload)
  for (const item of items.slice(0, 2)) {
    const title = stripHtml(extractTag(item, "title"));
    const link = extractTag(item, "link");
    const description = stripHtml(extractTag(item, "description")).slice(0, 400);

    const message =
      `📰 <b>${title}</b>\n\n` +
      `${description}...\n\n` +
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
}

export default {
  async scheduled(event: any, env: any) {
    for (const feed of RSS_FEEDS) {
      await processFeed(feed, env);
    }
  }
};