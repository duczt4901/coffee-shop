/** Wrap text nodes without replacing React-owned elements, links or emphasis. */
export function splitWords(root: HTMLElement, wordClass: string, maskClass?: string) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    const words: HTMLSpanElement[] = [];
    const replacements = nodes.map((node) => {
        const fragment = document.createDocumentFragment();
        const inserted: Node[] = [];
        for (const part of node.data.split(/(\s+)/u).filter(Boolean)) {
            let child: Node = document.createTextNode(part);
            if (!/^\s+$/u.test(part)) {
                const word = document.createElement("span");
                word.className = wordClass;
                word.dataset.revealWord = "";
                word.append(child);
                words.push(word);
                child = word;
                if (maskClass) {
                    const mask = document.createElement("span");
                    mask.className = maskClass;
                    mask.append(word);
                    child = mask;
                }
            }
            inserted.push(child);
            fragment.append(child);
        }
        node.replaceWith(fragment);
        return { node, inserted };
    });
    return {
        words,
        revert: () =>
            replacements.forEach(({ node, inserted }) => {
                inserted[0]?.parentNode?.insertBefore(node, inserted[0]);
                inserted.forEach((child) => child.parentNode?.removeChild(child));
            }),
    };
}
