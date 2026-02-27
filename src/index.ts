// src/index.ts

const RSS_FEEDS = [

  {
    name: "DailyMail",
    political: "Right-wing populist, conservative-national",
    economic: "Market-oriented, limited macroeconomic analysis",
    url: "https://www.dailymail.co.uk/articles.rss"
  }, // :contentReference[oaicite:7]{index=7}

  {
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

// -- Process Feed 

async function processFeed(feed: any, env: any) {
	
	await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			chat_id: env.CHAT_ID,
			message_thread_id: Number(env.THREAD_ID),
			text: "999",
			parse_mode: "HTML",
			disable_web_page_preview: false
		})
	};
}

// -------------------- Scheduled Worker --------------------

export default {
	async scheduled(event: any, env: any) {
		const feed = await getNextFeed(env);
		await processFeed(feed, env);
	}
};