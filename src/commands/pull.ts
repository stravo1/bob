import { Command } from "commander";
import FrappeClient from "../lib/frappeClient";
import writePage from "../lib/writePage";
import { existsSync } from "fs";
import { deleteDir, readDir, readFile } from "../utils/file";
import { safeFileName } from "../utils/misc";

const CONFIG_FILE = "config.json";

export const pull = async (client: FrappeClient) => {
    try {
        const pages = await client.getPages();
        for (const page of pages) {
            writePage(client, page); // Replace "output" with your desired output directory
        }
        // delete pageDirs which are not present in the pages list
        // get list of pageDirs in the output directory
        const path = await import("path");
        const outputDir = path.join(process.cwd(), "pages");
        if (existsSync(outputDir)) {
            const pageDirs = readDir(outputDir);
            for (const pageDir of pageDirs) {
                if (!pages.some((page: any) => safeFileName(`${page.name || page.element || "unnamed"}_${page.pageId}`) === pageDir)) {
                    deleteDir(path.join(outputDir, pageDir));
                    console.log(
                        `Deleted local directory for removed page: ${pageDir}`,
                    );
                }
            }
        }
    } catch (error) {
        console.error("Error occurred while fetching pages:", error);
    }
};

export const pullCommand = new Command("pull")
    .description("Manually pull latest data from site")
    .action(() => {
        console.log("Pulling...");
        const pwd = process.cwd();
        const config = JSON.parse(
            existsSync(CONFIG_FILE) ? readFile(CONFIG_FILE) || "{}" : "{}",
        );
        const client = new FrappeClient(config.siteUrl, config.authToken);
        pull(client);
    });
