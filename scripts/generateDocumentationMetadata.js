// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const grayMatter = require('gray-matter');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const slugify = require('slugify');

function getSubdirectories(rootDir) {
    return fs.readdirSync(rootDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
}

function getFrontmatter(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return grayMatter(fileContent);
}

function sortByParagraphNumber(a, b) {
    // directories first
    if (a.isDirectory() && !b.isDirectory()) {
        return -1;
    }
    if (!a.isDirectory() && b.isDirectory()) {
        return 1;
    }

    const aParts = a.name.split('.').map(part => parseInt(part));
    const bParts = b.name.split('.').map(part => parseInt(part));

    for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        if (aParts[i] !== bParts[i]) {
            return aParts[i] - bParts[i];
        }
    }

    return aParts.length - bParts.length;
}

function sortByOrdinal(itemA, itemB) {
    return itemA?.ordinal - itemB.ordinal;
}

function listContentsRecursively(fullPath, docsRelativePath, results = []) {
    const filesAndDirectories = fs.readdirSync(fullPath, { withFileTypes: true });
    filesAndDirectories.sort(sortByParagraphNumber);
    filesAndDirectories.forEach(item => {
        const itemPath = path.join(fullPath, item.name);
        const itemRelativePath = path.join(docsRelativePath, item.name);
        if (item.isDirectory()) {
            const sectionNumber = path.basename(itemPath).split(' ')[0];
            const children = listContentsRecursively(itemPath, itemRelativePath)?.sort(sortByOrdinal);
            results.push({
                slug: slugify(item.name),
                path: itemRelativePath,
                title: item.name,
                ordinal: sectionNumber,
                children: children
            });
        } else {
            if (path.extname(itemPath).toLowerCase() === '.md') {
                const { data } = getFrontmatter(itemPath);
                const fileNameWithoutExtension = path.parse(item.name).name;
                const slug = slugify(fileNameWithoutExtension);
                results.push({
                    path: itemRelativePath,
                    fileName: item.name,
                    ...data,
                    slug
                });
            }
        }
    });

    return results;
}

// Write metadata for each version
function processVersions(fullPath, relativeDir) {
    const subdirectories = getSubdirectories(fullPath);

    for (const version of subdirectories) {
        const versionPath = path.join(fullPath, version);
        relativeDir = path.join(relativeDir, version);
        const versionContent = listContentsRecursively(versionPath, relativeDir);
        fs.writeFileSync(path.join(versionPath, 'index.js'), `const allDocs = ${JSON.stringify(versionContent, null, 2)};\n\nexport default allDocs;`);
        console.log('Wrote file ' + path.join(versionPath, 'index.js'));
    }
}

function generateDocumentationMetadata(fullPath) {
    const subdirectories = getSubdirectories(fullPath);
    const sortedVersions = subdirectories.sort((a, b) => parseFloat(a) - parseFloat(b));
    const indexContent = `const availableVersions = ${JSON.stringify(sortedVersions)};\n\nexport default availableVersions;`;
    fs.writeFileSync(path.join(fullPath, 'index.js'), indexContent);
}

const docsRelativeDir = './_content/docs';
const fullPath = path.normalize(path.join(process.cwd(), docsRelativeDir));
console.log('Generating documentation metadata for folder ', docsRelativeDir);
generateDocumentationMetadata(fullPath);
processVersions(fullPath, docsRelativeDir);
