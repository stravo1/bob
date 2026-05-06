import { logger } from "../utils/logger";
import FrappeClient from "../utils/frappeClient";
import writePage from "../services/writePage";

export class PullQueue {
    private queue: Map<string, any> = new Map(); // pageName -> page
    private processing = false;
    private writing: Set<string> = new Set(); // pageName -> currently writing
    private debounceTimer: NodeJS.Timeout | null = null;
    private readonly debounceDelay: number;
    private readonly client: FrappeClient;

    constructor(client: FrappeClient, debounceDelay: number = 1000) {
        this.client = client;
        this.debounceDelay = debounceDelay;
    }

    add(page: any) {
        // If page is currently being written, replace with latest version
        // It will be reprocessed after current write completes
        this.queue.delete(page.name);
        this.queue.set(page.name, page);

        // If this page is currently being written, we'll reprocess after write completes
        if (this.writing.has(page.name)) {
            logger.info(`[QUEUE] Page ${page.name} updated while writing, will reprocess with latest version`);
        }

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
            const pages = Array.from(this.queue.values());
            this.queue.clear();

            logger.info(
                `Processing ${pages.length} remote update${pages.length > 1 ? "s" : ""}...`,
            );

            // Process all items in parallel
            const promises = pages.map((page) => this.processPage(page));

            await Promise.all(promises);
        } finally {
            this.processing = false;

            // Check if new items were added during processing
            if (this.queue.size > 0) {
                this.scheduleProcessing();
            }
        }
    }

    private async processPage(page: any) {
        const pageName = page.name;
        
        try {
            // Mark as writing
            this.writing.add(pageName);
            
            await writePage(this.client, page);
            logger.info(`✓ Pulled page: ${pageName}`);
        } catch (err) {
            logger.error(`✗ Failed to pull page ${pageName}: ${(err as Error).message}`);
        } finally {
            // Mark as done writing
            this.writing.delete(pageName);

            // If page was updated while writing, reprocess immediately with latest version
            if (this.queue.has(pageName)) {
                logger.info(`[REQUEUE] Page ${pageName} has newer updates, reprocessing...`);
                const latestPage = this.queue.get(pageName)!;
                this.queue.delete(pageName);
                // Process immediately without debounce
                await this.processPage(latestPage);
            }
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
