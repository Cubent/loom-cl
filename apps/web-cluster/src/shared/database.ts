import { PgClient } from "@effect/sql-pg";
import { Config, Effect, Layer, Option } from "effect";

export const DatabaseLive = Layer.unwrapEffect(
	Effect.gen(function* () {
		const url = yield* Config.redacted(Config.string("DATABASE_URL"));

		return PgClient.layer({ url });
	}),
);

export const ShardDatabaseLive = Layer.unwrapEffect(
	Effect.gen(function* () {
		const url = yield* Config.option(
			Config.redacted(Config.string("SHARD_DATABASE_URL")),
		);

		return yield* Option.match(url, {
			onNone: () =>
				Effect.gen(function* () {
					return Layer.succeed(
						PgClient.PgClient,
						yield* PgClient.PgClient,
					);
				}),
			onSome: (url) => Effect.succeed(PgClient.layer({ url })),
		});
	}),
);
