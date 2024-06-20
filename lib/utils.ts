import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { MERMAID_SNIPPET, mdToHtml } from './customMarked'
import { insertIdsToHeaders, processCodeBlocks, processHeaders, processJavascriptBlocks, processMigrationGuideLinks, processTripleQuoteCodeBlocks, updateMarkdownHtmlStyleTags, updateMarkdownImagePaths } from './markdownToHtml'
import { MarkdownFileMetadata, VersionDocType } from '@/types/types'
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s.-]/g, '') // Remove special characters
    .replace(/[\s]+/g, '-') // Replace spaces with hyphens
    .replace(/[-]+/g, '-') // Replace consecutive hyphens with a single hyphen
    .replace(/\.md$/, '') // Remove the ".md" extension
    .trim() // Trim leading/trailing whitespace
}

function compileMarkdownToHTML(markdown: string, startingSectionNumber: string): {
  html: string
  anchorLinks: VersionDocType['anchorLinks']
} {
  const { content } = matter(markdown)
  const markedHtml = mdToHtml(content)
  const { html, anchorLinks } = insertIdsToHeaders(markedHtml, startingSectionNumber)
  return {
    html,
    anchorLinks,
  }
}

export async function getVersionIndex(version: string) {
  const rootFolder = `_content/docs/${version}`;
  if (!fs.existsSync(rootFolder) || !fs.statSync(rootFolder).isDirectory()) {
    return null;
  }
  const allDocs = (await import(`_content/docs/${version}/index.js`)).default;
  return allDocs;
}

export const readMarkdownFile = async function(filePath: string, imagesPath: string = '') {
  const fullPath = path.normalize(path.join(process.cwd(), filePath));
  let markdown = fs.readFileSync(fullPath, 'utf8');
  markdown = processMarkdown(markdown, imagesPath);
  return markdown;
};

export const readAndConcatMarkdownFiles = async function(parentItem: MarkdownFileMetadata, imagesPath: string = '') {
  let markdownAll = '';
  parentItem.children.forEach(element => {
    const cwdPath = path.resolve(process.cwd());
    const fullPath = path.normalize(path.join(cwdPath, element.path));
    const markdown = fs.readFileSync(fullPath, 'utf8');
    const { content } = matter(markdown);
    markdownAll += content;
  });

  markdownAll = processMarkdown(markdownAll, imagesPath);

  const compiled = compileMarkdownToHTML(markdownAll, parentItem.ordinal);
  // inject script to make mermaid js work its magic
  if (compiled.html.includes(MERMAID_SNIPPET)) {
    compiled.html += `<script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <script>
    mermaid.initialize({
      startOnLoad:true,
      htmlLabels:true,
      theme: 'base'
    });
    </script>
    `
  }

  return compiled;
};

/** cleans up html tags from a given string (used for cleaning up a heading from badges in documentation toc)  */
export const cleanTags = (htmlString: string) => {
  return htmlString.replace(/<[^>]+>/g, '');
}

const processMarkdown = (markdown: string, imagesPath: string) => {
  markdown = updateMarkdownImagePaths(markdown, imagesPath);
  markdown = updateMarkdownHtmlStyleTags(markdown);
  markdown = processHeaders(markdown);
  markdown = processMigrationGuideLinks(markdown);

  // these are dependent to be run in this order
  markdown = processJavascriptBlocks(markdown);
  markdown = processTripleQuoteCodeBlocks(markdown);
  markdown = processCodeBlocks(markdown);
  return markdown;
}

export const getMarkdownContentAsHtml = async function(mdFilePath: string, imagesFilePath: string) {
  const markdown = await readMarkdownFile(mdFilePath, imagesFilePath);
  const html = mdToHtml(markdown);
  return html;
}
