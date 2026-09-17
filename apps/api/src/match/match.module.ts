import { Module } from "@nestjs/common";
import { LadderModule } from "../ladder/ladder.module.js";
import { WorkspaceModule } from "../workspace/workspace.module.js";
import { MatchController } from "./match.controller.js";
import { MatchService } from "./match.service.js";

@Module({
  imports: [LadderModule, WorkspaceModule],
  controllers: [MatchController],
  providers: [MatchService],
  exports: [MatchService],
})
export class MatchModule {}
