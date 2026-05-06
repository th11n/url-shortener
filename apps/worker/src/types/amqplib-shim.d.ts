declare module "amqplib" {
	export function connect(
		url: string | Options.Connect,
		socketOptions?: unknown,
	): Promise<ChannelModel>;

	const _default: {
		connect: typeof connect;
	};

	export default _default;
}
