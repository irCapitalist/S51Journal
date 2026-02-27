// src/index.ts

const RSS_FEEDS = [
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
	}, // :contentReference[oaicite:5]{index=5}

	{
		name: "Fox",
		political: "Conservative, right-wing",
		economic: "Free-market capitalism, low-tax, anti-regulation",
		url: "https://moxie.foxnews.com/google-publisher/latest.xml"
	}, // :contentReference[oaicite:6]{index=6}

	{
		name: "Reuters Middle East",
		political: "Mainstream global news, varied coverage",
		economic: "Mixed economy reporting, global markets context",
		url: "https://news.google.com/rss/search?q=site:reuters.com+Middle+East"
	}, // :contentReference[oaicite:8]{index=8}

	{
		name: "DailyMail",
		political: "Right-wing populist, conservative-national",
		economic: "Market-oriented, limited macroeconomic analysis",
		url: "https://www.dailymail.co.uk/articles.rss"
	} // :contentReference[oaicite:7]{index=7}
];

// -------------------- Helpers --------------------

function stripHtml(html: string): string {
	// هر چیزی که بین < و > باشد را حذف می‌کند.
	// <p> ها حذف می‌شود
	// هر تعداد فاصله، newline، tab و… را به یک فاصله ساده تبدیل می‌کند.
	// فاصله‌های ابتدا و انتهای رشته حذف می‌شود.
	return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(text: string): string {
	// decodeHtmlEntities برای تمیز کردن داده ورودی RSS است.
	return text
		.replace(/&apos;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&#39;/g, "'");
}

function escapeHtml(text: string): string {
	// جلوگیری از خطای HTML در تلگرام
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

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

// -------------------- Translate --------------------

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

// -------------------- Process Feed --------------------

async function processFeed(feed: any, env: any) {
	try {
		const response = await fetch(feed.url, { headers: { "User-Agent": "Mozilla/5.0" } });
		const xml = await response.text();
		const items = xml.match(/<item>([\s\S]*?)<\/item>/gi);
		if (!items) return;

		for (const item of items.slice(0, 2)) {
			const title = decodeHtmlEntities(stripHtml(extractCDATA(item, "title")));
			const link = extractCDATA(item, "link") || extractCDATA(item, "guid");
			const rawContent = extractCDATA(item, "content:encoded") || extractCDATA(item, "description") || "";
			const summary = decodeHtmlEntities(stripHtml(rawContent)).slice(0, 500);

			if (!title || !link) continue;
			if (await alreadySent(env, link)) continue;
			
			const translatedTitle = await translateToFa(title);
			const translatedSummary = summary
				? await translateToFa(summary)
				: "";
	
			const message =
				`📰 <b>${escapeHtml(translatedTitle)}</b>\n\n` +

				(translatedSummary
				? `${escapeHtml(translatedSummary)}\n\n`
				: "") +

				`🌍 <i>${escapeHtml(title)}</i>\n\n` +

				`🔗 <a href="${link}">Read full article</a>\n\n` +

				`Source: ${escapeHtml(feed.name)}\n` +
				`Political: ${escapeHtml(feed.political)}\n` +
				`Economic: ${escapeHtml(feed.economic)}`;

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
