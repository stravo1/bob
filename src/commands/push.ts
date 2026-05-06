import { Command } from "commander";
import { logger } from "../utils/logger";

export const pushCommand = new Command("push")
  .description("Push local changes to remote")
  .action(() => {
    logger.info("Pushing...");
    // TODO: upload logic
  });