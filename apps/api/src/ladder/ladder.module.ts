import { Module } from "@nestjs/common";
import { WorkspaceModule } from "../workspace/workspace.module.js";
import { LadderController } from "./ladder.controller.js";
import { LadderService } from "./ladder.service.js";

@Module({
  imports: [WorkspaceModule],
  controllers: [LadderController],
  providers: [LadderService],
  exports: [LadderService],
})
export class LadderModule {}
