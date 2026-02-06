import amqp from "amqplib";
import type { Channel, ChannelModel, Connection } from "./types/amqplib";

let channelPromise: Promise<Channel> | null = null;

async function createChannel(): Promise<Channel> {
	const url = process.env.RABBITMQ_URL;
	if (!url) throw new Error("Missing RABBITMQ_URL");

	const conn = (await amqp.connect(url)) as unknown as Connection;
	const ch = (await (
		conn as unknown as ChannelModel
	).createChannel()) as Channel;

	conn.on("close", () => {
		channelPromise = null;
	});
	conn.on("error", () => {
		channelPromise = null;
	});

	return ch;
}

export async function getRabbitChannel(): Promise<Channel> {
	if (!channelPromise) channelPromise = createChannel();
	return channelPromise;
}

export async function publishJson(opts: {
	exchange: string;
	routingKey: string;
	payload: unknown;
}) {
	const ch = await getRabbitChannel();

	await ch.assertExchange(opts.exchange, "topic", { durable: true });

	const body = Buffer.from(JSON.stringify(opts.payload));

	const ok = ch.publish(opts.exchange, opts.routingKey, body, {
		contentType: "application/json",
		persistent: true,
	});

	return ok;
}
