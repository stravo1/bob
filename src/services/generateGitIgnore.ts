import { appendFile } from "../utils/file";

const generateGitIgnoreContent = (): string => {
    return `
.*
app.log
config.json
`;
};

export const generateGitIgnore = (): void => {
    appendFile(".gitignore", generateGitIgnoreContent());
};
