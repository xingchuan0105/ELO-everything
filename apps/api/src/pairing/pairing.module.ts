import { Module } from "@nestjs/common";
import { LadderModule } from "../ladder/ladder.module.js";
import { MatchModule } from "../match/match.module.js";
import { WorkspaceModule } from "../workspace/workspace.module.js";
import { PairingController } from "./pairing.controller.js";
import { PairingService } from "./pairing.service.js";

@Module({
  imports: [LadderModule, WorkspaceModule, MatchModule],
  controllers: [PairingController],
  providers: [PairingService],
})
export class PairingModule {}
