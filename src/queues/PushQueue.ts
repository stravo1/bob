import { logger } from "../utils/logger";
import FrappeClient from "../utils/frappeClient";
import buildPage from "../services/buildPage";
import { readFile, getFileStats } from "../utils/file";

export class PushQueue {
    private queue: Map<string, string> = new Map(); // pageDir -> pageDir (dedupe)
    private processing = false;
    private debounceTimer: NodeJS.Timeout | null = null;
    private readonly debounceDelay: number;
    private readonly client: FrappeClient;

    constructor(client: FrappeClient, debounceDelay: number = 1000) {
        this.client = client;
        this.debounceDelay = debounceDelay;
    }

    add(pageDir: string) {
        // Remove existing entry for this pageDir, then add new one
        this.queue.delete(pageDir);
        this.queue.set(pageDir, pageDir);
        this.scheduleProcessing();
    }

    private scheduleProcessing() {
        // Clear existing debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Set new debounce timer
        this.debounceTimer = setTimeout(() => {
            this.process();
        }, this.debounceDelay);
    }

    private async process() {
        if (this.processing || this.queue.size === 0) {
            return;
        }

        this.processing = true;

        try {
            const pageDirs = Array.from(this.queue.values());
            this.queue.clear();

            logger.info(
                `Processing ${pageDirs.length} queued update${pageDirs.length > 1 ? "s" : ""}...`,
            );

            // Process all items in parallel
            const promises = pageDirs.map((pageDir) => this.processPage(pageDir));

            await Promise.all(promises);
        } finally {
            this.processing = false;

            // Check if new items were added during processing
            if (this.queue.size > 0) {
                this.scheduleProcessing();
            }
        }
    }

    private async processPage(pageDir: string) {
        try {
            const fileMtime = getFileStats(pageDir)?.mtime.getTime() || 0;
            const storedMtime = readFile(`${pageDir}/.last_modified`);
            if (!storedMtime) {
                logger.info(
                    `No .last_modified file found for ${pageDir}. Skipping update.`,
                );
                return;
            }

            const serverMtime = new Date(storedMtime.trim()).getTime();

            if (fileMtime <= serverMtime) {
                logger.info(
                    `No local changes detected for ${pageDir} since last sync. Skipping update to server.`,
                );
                return;
            }

            const { pageData, headHtml, bodyHtml, dataScript, blocks } =
                await buildPage(pageDir);
            const pageName: string = pageData.name as string;

            if (!pageName) {
                logger.error(
                    `No page name found in page.json of ${pageDir}`,
                );
                return;
            }

            const updateMap: Record<string, unknown> = {};
            if (headHtml !== null) {
                updateMap.head_html = headHtml;
            }
            if (bodyHtml !== null) {
                updateMap.body_html = bodyHtml;
            }
            if (dataScript !== null) {
                updateMap.page_data_script = dataScript;
            }
            if (blocks.length > 0) {
                updateMap.draft_blocks = JSON.stringify(blocks);
            }
            updateMap.custom_last_sync_client = global.socketId;

            await this.client.updatePage(pageName, updateMap, storedMtime);
            logger.info(`✓ Updated page: ${pageName}`);
        } catch (err) {
            logger.error(`✗ Failed to process page ${pageDir}: ${(err as Error).message}`);
        }
    }

    async flush() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        await this.process();
    }
}
