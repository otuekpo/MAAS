import { Module } from "@nestjs/common";
import { PgEntitiesService } from "./pg-entities.service";

@Module({
  providers: [PgEntitiesService],
  exports: [PgEntitiesService],
})
export class PgEntitiesModule {}
