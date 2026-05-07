import { appendFile } from "../utils/file";

const generateGitIgnoreContent = (): string => {
    return `
.*
*block_data.json
app.log
config.json
`;
};

export const generateGitIgnore = (): void => {
    appendFile(".gitignore", generateGitIgnoreContent());
};
