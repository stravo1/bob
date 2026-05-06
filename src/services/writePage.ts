import { makeDir, writeFile, fileExists } from "../utils/file";
import FrappeClient from "../utils/frappeClient";
import writeBlock from "./writeBlock";
import { safeFileName } from "../utils/misc";
import { logger } from "../utils/logger";

const writePage = async (
    client: FrappeClient,
    page: any,
    outputDir: string = "pages",
) => {
    logger.info(`Writing page: ${page.name}`);
    const pageDetails = await client.getPage(page.name);
    if (pageDetails) {
        if (
            global.lastSyncTimestamp !== "" &&
            pageDetails.modified === global.lastSyncTimestamp &&
            pageDetails.custom_last_sync_client === global.socketId
        ) {
            logger.info(
                `No changes detected for page: ${page.name}. Skipping write.`,
            );
            return;
        }
        // Write page details to a file in the output directory
        const dirName = safeFileName(
            `${pageDetails.page_title}_${pageDetails.name}`,
        );

        const pwd = process.cwd();
        const pageDir = `${pwd}/${outputDir}/${dirName}`;

        // check if pageDir already exists, create if not
        if (!fileExists(pageDir)) {
            makeDir(pageDir);
        }

        const draftBlocks = pageDetails.draft_blocks;
        const blocks = JSON.parse(draftBlocks || pageDetails.blocks || "[]");
        for (const block of blocks) {
            await writeBlock(block, `${pageDir}/blocks`, pageDetails.modified);
        }

        delete pageDetails.draft_blocks;
        delete pageDetails.blocks;

        writeFile(
            `${pageDir}/page.json`,
            JSON.stringify(pageDetails, null, 2),
            pageDetails.modified,
        );

        if (pageDetails.page_data_script) {
            writeFile(
                `${pageDir}/data_script.py`,
                pageDetails.page_data_script,
                pageDetails.modified,
            );
        }
        if (pageDetails.head_html) {
            writeFile(
                `${pageDir}/head.html`,
                pageDetails.head_html,
                pageDetails.modified,
            );
        }
        if (pageDetails.body_html) {
            writeFile(
                `${pageDir}/body.html`,
                pageDetails.body_html,
                pageDetails.modified,
            );
        }
        // write page last modified timestamp to a file
        writeFile(
            `${pageDir}/.last_modified`,
            pageDetails.modified,
            pageDetails.modified,
        );
        return dirName;
    } else {
        logger.error(`Failed to fetch details for page: ${page.name}`);
        return null;
    }
};

export default writePage;
