import { Global, Module } from "@nestjs/common";
import { createDb, type Db } from "@elo/db";

export const DB = Symbol("DB");

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: (): Db => {
        const url = process.env.DATABASE_URL ?? "postgresql://elo:elo@localhost:5432/elo_everything";
        return createDb(url).db;
      },
    },
  ],
  exports: [DB],
})
export class DbModule {}
