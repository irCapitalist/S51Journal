# S51Journal


RSS to Telegram Topic Bot (Cloudflare Workers)

This project is a fully serverless Telegram bot built with TypeScript and deployed on Cloudflare Workers. It periodically fetches RSS feeds from selected international media sources, generates concise summaries, and posts them automatically to a designated Telegram group topic (forum thread).

Key Features :
	> No VPS required
	> Fully serverless architecture
	> GitHub-based automatic deployment
	> Cron-triggered RSS polling
	> Automatic article summarization
	> Telegram Bot API integration
	> Topic-specific message posting (message_thread_id)
	> Architecture Overview

```
S51Journal/
	│
	├── package.json		# فقط نوع پروژه TypeScript/Module را مشخص می‌کند
	├── wrangler.toml		# مشخصات Worker و Cron trigger
	└── src/
		└── index.ts		# کد اصلی برای fetch RSS و ارسال به Telegram
```
