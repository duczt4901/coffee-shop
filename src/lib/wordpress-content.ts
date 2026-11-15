import sanitizeHtml from "sanitize-html";

export function sanitizeWordPressHtml(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: ["p", "br", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "strong", "em", "b", "i", "a", "figure", "figcaption", "img", "hr", "pre", "code"],
        allowedAttributes: { a: ["href", "title"], img: ["src", "alt", "width", "height", "loading"] },
        allowedSchemes: ["https", "mailto", "tel"],
        allowedSchemesByTag: { img: ["https"] },
        allowProtocolRelative: false,
    });
}

export function wordPressText(html: string): string {
    const text = sanitizeHtml(html.replace(/<\/(?:p|h[1-6]|li|blockquote)>|<br\s*\/?>/gi, " "), { allowedTags: [], allowedAttributes: {} });
    // The parser already decoded named entities; only its output escapes remain.
    return text
        .replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (entity) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" })[entity]!)
        .replace(/\s+/g, " ")
        .trim();
}
