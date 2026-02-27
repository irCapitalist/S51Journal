// src/index.ts

const RSS_FEEDS = [

  {
    name: "DailyMail",
    political: "Right-wing populist, conservative-national",
    economic: "Market-oriented, limited macroeconomic analysis",
    url: "https://www.dailymail.co.uk/articles.rss"
  }, // :contentReference[oaicite:7]{index=7}

  /*{
    name: "Fox",
    political: "Conservative, right-wing",
    economic: "Free-market capitalism, low-tax, anti-regulation",
    url: "https://moxie.foxnews.com/google-publisher/latest.xml"
  }, // :contentReference[oaicite:6]{index=6}
  
  {
    name: "Guardian",
    political: "Centre-left, social liberal",
    economic: "Pro-welfare state, regulated market economy",
    url: "https://www.theguardian.com/world/rss"
  }, // :contentReference[oaicite:0]{index=0}

  {
    name: "NYT",
    political: "Centre-left, mainstream liberal",
    economic: "Market economy with regulatory oversight and social spending",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml"
  }, // :contentReference[oaicite:1]{index=1}

  {
    name: "CNN",
    political: "Centrist to centre-left",
    economic: "Market-oriented with institutional regulation",
    url: "http://rss.cnn.com/rss/edition.rss"
  }, // :contentReference[oaicite:2]{index=2}

  {
    name: "BBC",
    political: "Institutional centrist, public-service model",
    economic: "Mixed economy coverage, macro policy neutral framing",
    url: "http://feeds.bbci.co.uk/news/rss.xml"
  }, // :contentReference[oaicite:3]{index=3}

  {
    name: "Bloomberg",
    political: "Technocratic, pro-market institutional",
    economic: "Global finance-oriented, capital market focus",
    url: "https://feeds.bloomberg.com/markets/news.rss"
  }, // :contentReference[oaicite:4]{index=4}

  {
    name: "WSJ",
    political: "Centre-right (notably editorial board)",
    economic: "Free-market, deregulation, lower taxation",
    url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml"
  } // :contentReference[oaicite:5]{index=5}
*/
];

// -- KV Round-Robin 

async function getNextFeed(env: any) {
  const total = RSS_FEEDS.length;
  let indexStr = await env.FEED_STATE.get("index");
  let index = indexStr ? parseInt(indexStr) : 0;

  const feed = RSS_FEEDS[index];
  const next = (index + 1) % total;
  await env.FEED_STATE.put("index", next.toString());

  return feed;
}

// -- KV Dedup 

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

// -- Translate 

async function translateToFa(text: string): Promise<string> {
	if (!text) return "";

	// اگر متن قبلاً فارسی باشد ترجمه نکن
	if (/[\u0600-\u06FF]/.test(text)) return text;

	try {
		const url =
			"https://translate.googleapis.com/translate_a/single" +
			`?client=gtx&sl=auto&tl=fa&dt=t&q=${encodeURIComponent(text)}`;

		const res = await fetch(url, {
			headers: { "User-Agent": "Mozilla/5.0" }
		});

		if (!res.ok) return text;

		const data = await res.json();
		return data[0].map((t: any) => t[0]).join("");
	
	} catch {
		return text; // اگر ترجمه شکست خورد متن اصلی ارسال شود
	}
}

// -- Process Feed 

async function processFeed(feed: any, env: any) {
    try {
        const response = await fetch(feed.url, { headers: { "User-Agent": "Mozilla/5.0" } });
        const xml = await response.text();

        const items = xml.match(/<item>([\s\S]*?)<\/item>/gi);
        if (!items) return;

        for (const item of items.slice(0, 2)) {

		    const message = item

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