import { writeFile } from "node:fs/promises";
import { pageFields, pageImageFields } from "./generate-pages.mjs";

const groups = Object.entries(pageFields).map(([name, page]) => ({
    key: `group_coffee_${name}`,
    title: `Coffee-shop · ${page.title}`,
    fields: Object.entries(page.fields).map(([key, field]) => ({
        key: `field_coffee_${key}`,
        label: field.label,
        name: key,
        type: field.default.length > 100 ? "textarea" : "text",
        instructions: "Chỉ nhập chữ; bố cục và kiểu chữ được giữ trên coffee-shop. Cập nhật rồi build lại để website nhận nội dung mới.",
        required: 0,
        default_value: field.default,
        maxlength: 10000,
        rows: 3,
        new_lines: "",
    })),
    location: [[{ param: "page", operator: "==", value: String(page.id) }]],
    position: "normal",
    style: "default",
    active: true,
    show_in_rest: 1,
    description: `Nội dung website lavuon.cafe${page.path}. Phần sản phẩm nổi bật dùng chung field ở Trang chủ.`,
}));
await writeFile(new URL("../wordpress/acf-page-fields.json", import.meta.url), `${JSON.stringify(groups, null, 2)}\n`);
const imageGroups = Object.entries(pageFields).map(([name, page]) => ({
    key: `group_coffee_${name}_images`,
    title: `Coffee-shop · Ảnh · ${page.title}`,
    fields: Object.entries(pageImageFields[name] ?? {}).map(([key, field]) => ({
        key: `field_coffee_${key}`, name: key, label: field.label, type: "image",
        instructions: `${field.transparent ? "Dùng PNG/WebP nền trong suốt, giữ bố cục và khoảng trống của ảnh mẫu. " : ""}Để trống dùng ảnh mặc định. Cập nhật rồi build/deploy để website nhận ảnh mới.`,
        return_format: "id", preview_size: "medium", library: "all", required: 0,
        max_size: 10, mime_types: field.transparent ? "png,webp" : "jpg,jpeg,png,webp",
    })),
    location: [[{ param: "page", operator: "==", value: String(page.id) }]],
    position: "normal", style: "default", active: true, show_in_rest: 1,
}));
await writeFile(new URL("../wordpress/acf-page-images.json", import.meta.url), `${JSON.stringify(imageGroups, null, 2)}\n`);
console.log("Exported wordpress/acf-page-fields.json for ACF → Tools → Import.");
