export type Product = {
    slug: string;
    name: string;
    category: string;
    tagline: string;
    sizeLabel: string;
    price: string;
    image: string;
    accent: string;
    origin: string;
    process: string;
    varieties: string;
    altitude: string;
    roast: string;
    story: string;
    badge?: string;
};

export const products: Product[] = [
    {
        slug: "trung-toan-coffee-robusta",
        name: "TrungToan Coffee Robusta",
        category: "Robusta",
        tagline: "Đậm, tròn vị với hậu vị chocolate và hạt rang.",
        sizeLabel: "200 g",
        price: "119.000 vnđ",
        image: "/images/product/coffee1.png",
        accent: "#c85b3c",
        origin: "Lâm Đồng, Việt Nam",
        process: "Natural",
        varieties: "Robusta",
        altitude: "900–1.100 m",
        roast: "Rang đậm cho phin và espresso",
        story: "Hạt Robusta được chọn từ những mùa thu hoạch chín, cho cấu trúc dày, vị ngọt tự nhiên và một tách cà phê Việt Nam thật rõ nét.",
    },
    {
        slug: "trung-toan-coffee-arabica",
        name: "TrungToan Coffee Arabica",
        category: "Arabica",
        tagline: "Thanh, ngọt và thơm với sắc trái cây chín.",
        sizeLabel: "200 g",
        price: "119.000 vnđ",
        image: "/images/product/coffee2.png",
        accent: "#187a70",
        origin: "Cầu Đất, Lâm Đồng",
        process: "Washed",
        varieties: "Catimor, Typica",
        altitude: "1.400–1.600 m",
        roast: "Rang vừa cho pour over và espresso",
        story: "Khí hậu mát của cao nguyên làm chậm quá trình chín, giúp hạt phát triển hương hoa, vị quả chín và độ chua trong trẻo.",
    },
    {
        slug: "trung-toan-coffee-robusta-500g",
        name: "TrungToan Coffee Robusta Large Pack",
        category: "Robusta",
        tagline: "Gói lớn cho nhịp pha đều đặn mỗi ngày.",
        sizeLabel: "500 g",
        price: "219.000 vnđ",
        image: "/images/product/coffee3.png",
        accent: "#6bbbd4",
        origin: "Di Linh, Lâm Đồng",
        process: "Honey",
        varieties: "Robusta tuyển chọn",
        altitude: "1.000–1.200 m",
        roast: "Rang vừa đậm cho phin",
        story: "Một profile cân bằng cho thói quen uống cà phê hằng ngày: hương caramel, thân vị chắc và dư vị êm kéo dài.",
        badge: "BEST SELLER",
    },
    {
        slug: "trung-toan-coffee-robusta-1000g",
        name: "TrungToan Coffee Robusta Grand Pack",
        category: "Robusta",
        tagline: "Vị cà phê nguyên bản trong gói lớn tiết kiệm.",
        sizeLabel: "1000 g",
        price: "389.000 vnđ",
        image: "/images/product/coffee4.png",
        accent: "#d5a633",
        origin: "Đắk Nông, Việt Nam",
        process: "Natural",
        varieties: "Robusta",
        altitude: "800–1.000 m",
        roast: "Rang đậm cho phin và cà phê sữa",
        story: "Hạt được rang để giữ chất đậm quen thuộc, vị cacao và độ ngọt lâu, phù hợp cho gia đình hoặc quầy pha chế nhỏ.",
    },
];

export function getProduct(slug: string): Product | undefined {
    return products.find((product) => product.slug === slug);
}
