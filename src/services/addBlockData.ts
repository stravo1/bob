import { readDir, readFile, writeFile } from "../utils/file";

const addIndividualBlockData = (
    blockDir: string,
    blockDataMap: Record<string, any>,
) => {
    const blockDetails = JSON.parse(readFile(`${blockDir}/block.json`) || "{}");
    const blockId = blockDetails.blockId;
    if (blockId) {
        const blockData = blockDataMap[blockId] || {};
        writeFile(
            `${blockDir}/block_data.json`,
            JSON.stringify(blockData, null, 2),
            blockDetails.modified,
        );
        if (blockDetails.children && blockDetails.children.length) {
            for (const childId of blockDetails.children) {
                const allEntries = readDir(blockDir);
                const potentialDirs = allEntries.filter((entry) =>
                    entry.endsWith(`_${childId}`),
                );
                if (potentialDirs.length > 0) {
                    addIndividualBlockData(
                        `${blockDir}/${potentialDirs[0]}`,
                        blockDataMap,
                    );
                }
            }
        }
    }
};

export const addBlockData = (
    pageDir: string,
    blockDataMap: Record<string, any>,
) => {
    console.log(`Adding block data for page directory: ${pageDir}`, blockDataMap); // Log the page directory being processed
    const rootDir = `${pageDir}/blocks/root`;
    addIndividualBlockData(rootDir, blockDataMap);
};
