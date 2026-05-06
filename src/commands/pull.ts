import { Command } from "commander";
import FrappeClient from "../lib/frappeClient";
import writePage from "../lib/writePage";
import { deleteDir, readDir, readFile, fileExists } from "../utils/file";
import { logger } from "../utils/logger";
import path from "path";

const CONFIG_FILE = "config.json";

export const pull = async (client: FrappeClient) => {
    try {
        const pages = await client.getPages();
        const dirList = [];
        for (const page of pages) {
            const dirName = await writePage(client, page);
            if (dirName) {
                dirList.push(dirName);
            }
        }

        // delete pageDirs which are not present in the pages list
        const outputDir = path.join(process.cwd(), "pages");
        if (fileExists(outputDir)) {
            const pageDirs = readDir(outputDir);
            for (const pageDir of pageDirs) {
                if (!dirList.some((dirName: string) => dirName === pageDir)) {
                    deleteDir(path.join(outputDir, pageDir));
                    logger.info(
                        `Deleted local directory for removed page: ${path.join(outputDir, pageDir)}`,
                    );
                }
            }
        }
    } catch (error) {
        logger.error("Error occurred while fetching pages:", error);
    }
};

export const pullCommand = new Command("pull")
    .description("Manually pull latest data from site")
    .action(() => {
        logger.info("Pulling...");
        const pwd = process.cwd();
        const config = JSON.parse(
            fileExists(CONFIG_FILE) ? readFile(CONFIG_FILE) || "{}" : "{}",
        );
        const client = new FrappeClient(config.siteUrl, config.authToken);
        pull(client);
    });
