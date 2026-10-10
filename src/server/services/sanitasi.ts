import sanitizeHtml from "sanitize-html";

/**
 * HTML berita disanitasi di server sebelum disimpan, dan hanya dirender dari field tersanitasi
 * (PRD v3.1 Bagian 17). Daftar putih ketat: tanpa script, style, iframe, atau atribut event.
 */
export function sanitasiHtml(kotor: string): string {
  return sanitizeHtml(kotor, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "a", "img", "hr"],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height"],
    },
    allowedSchemes: ["https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, rel: "noopener noreferrer", ...(attribs.target ? { target: "_blank" } : {}) },
      }),
    },
  });
}
