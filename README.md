# S51Journal

__

Important warning! Because Telegram is filtered, it was not possible to test your system locally with tools such as wrangler-cli, and constantly using a VPN and changing your IP makes Cloudflare suspect you as a bot.

Therefore, the only way to test and debug is to deploy each time with a push. As a result, many commits have technical issues. Also, the latest version is always being tested and updated; to avoid having too many branches, no separate branch is created for deploying the stable version, so make sure to use the code and verify that there are no bugs.

Also, use commits that are labeled "Clean code".

__

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
	
	> Translate to Persian automatically

```
S51Journal/
	│
	├── package.json		# فقط نوع پروژه TypeScript/Module را مشخص می‌کند
	├── wrangler.toml		# مشخصات Worker و Cron trigger
	└── src/
		└── index.ts		# کد اصلی برای fetch RSS و ارسال به Telegram
```

هشدار مهم!
بعلت فیلتر بودن تلگرام امکان تستت برروی سیستم لوکال با ابزار هایی مثل wrangler-cli ممکن نبود
همچنین استفاده دائم از فیلترشکن و تغییر ای پی باعث مشکوک شدن کلودفلر به شما بعنوان ربات میشود.

با این تفاسیر تنها راه تست و دیباگ هربار دیپلوی کردن با push میباشد از این رو بسیاری از کمیت ها دارای اشکالات فنی است.
همچنین آخرین نسخه همواره درحال تست و بروزرسانی است برای زیاد نشدن تعداد برنچ ها برنچ دیگری برای دیپلوی نسخه استیبل ایجاد نمیشود لذا
حتما در بکار بردن کد و از عدم وجود باگ اطمینان حاصل کنید.

حتما نیز از کمیت هایی که با برچسب "Clean code" هستند استفاده کنید.

