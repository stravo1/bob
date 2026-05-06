import { readFile, fileExists, readDir } from "../utils/file";

interface Block extends Record<string, unknown> {
    blockId: string;
    blockName?: string;
    element?: string;
    children?: Block[];
    [key: string]: unknown;
}

interface Page {
    pageData: Record<string, unknown>;
    headHtml: string | null;
    bodyHtml: string | null;
    dataScript: string | null;
    blocks: Block[];
}

const buildPage = async (pageDir: string): Promise<Page> => {
    // Read page.json
    const pageJsonPath = `${pageDir}/page.json`;
    const pageJsonContent = readFile(pageJsonPath);
    const pageData = pageJsonContent ? JSON.parse(pageJsonContent) : {};

    // Read optional files
    const headHtmlPath = `${pageDir}/head.html`;
    const bodyHtmlPath = `${pageDir}/body.html`;
    const dataScriptPath = `${pageDir}/data_script.py`;

    const headHtml = fileExists(headHtmlPath) ? readFile(headHtmlPath) : null;
    const bodyHtml = fileExists(bodyHtmlPath) ? readFile(bodyHtmlPath) : null;
    const dataScript = fileExists(dataScriptPath)
        ? readFile(dataScriptPath)
        : null;

    // Read blocks recursively
    const blocksDir = `${pageDir}/blocks/root`;
    const blocks: Block[] = [];

    const readBlocksRecursively = (blockDir: string): Block | null => {
        const blockJsonPath = `${blockDir}/block.json`;
        const blockContent = readFile(blockJsonPath);

        if (!blockContent) return null;

        const block: Block = JSON.parse(blockContent);
        const children: Block[] = [];

        // Use the order defined in block.json's children array
        // @ts-ignore
        const childrenIds = block.children as string[];
        if (Array.isArray(childrenIds) && childrenIds.length > 0) {
            for (const childId of childrenIds) {
                // Try to find the child directory
                // The directory naming pattern is: {blockName}_{blockId} or just root
                const allEntries = readDir(blockDir);
                const potentialDirs = allEntries.filter(
                    (entry) => entry.endsWith(`_${childId}`),
                );

                if (potentialDirs.length > 0) {
                    const childBlock = readBlocksRecursively(
                        `${blockDir}/${potentialDirs[0]}`,
                    );
                    if (childBlock) {
                        children.push(childBlock);
                    }
                }
            }
        }

        // Attach children to block
        if (children.length > 0) {
            block.children = children;
        }

        // Read client script if exists
        const clientScriptPath = `${blockDir}/client_script.js`;
        if (fileExists(clientScriptPath)) {
            block.blockClientScript = readFile(clientScriptPath);
        }

        // Read data script if exists
        const dataScriptBlockPath = `${blockDir}/data_script.py`;
        if (fileExists(dataScriptBlockPath)) {
            block.blockDataScript = readFile(dataScriptBlockPath);
        }

        return block;
    };

    // Read all blocks starting from root
    if (fileExists(blocksDir)) {
        const rootBlock = readBlocksRecursively(blocksDir);
        if (rootBlock) {
            blocks.push(rootBlock);
        }
    }

    return {
        pageData,
        headHtml,
        bodyHtml,
        dataScript,
        blocks,
    };
};

export default buildPage;