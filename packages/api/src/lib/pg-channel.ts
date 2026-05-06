export function urlsChannelForUser(userId: string) {
	// Force lowercase because Postgres case-folds unquoted identifiers in LISTEN
	return `urls_u_${userId.replace(/[^a-zA-Z0-9]/g, "_")}`.toLowerCase();
}
