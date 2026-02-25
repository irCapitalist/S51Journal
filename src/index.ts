

export default {
	async scheduled(event: any, env: any) {
		await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
			method:  "POST",
			headers: {"Content-Type": "application/json"},
			body:    JSON.stringify({
				chat_id: env.CHAT_ID,
				message_thread_id: Number(env.THREAD_ID),
				text: "s51journal is alive." })
		});
	}
};