import { Module } from "@nestjs/common";
import { LadderModule } from "../ladder/ladder.module.js";
import { WorkspaceModule } from "../workspace/workspace.module.js";
import { CompetitorController } from "./competitor.controller.js";
import { CompetitorService } from "./competitor.service.js";

@Module({
  imports: [LadderModule, WorkspaceModule],
  controllers: [CompetitorController],
  providers: [CompetitorService],
  exports: [CompetitorService],
})
export class CompetitorModule {}
