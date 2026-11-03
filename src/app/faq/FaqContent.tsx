"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EditorialReveal, RevealLink } from "@/components/ui/EditorialReveal";
import { Dropdown } from "@/components/ui/Dropdown";
import styles from "./page.module.css";

const categories = [
    {
        id: "ca-phe",
        title: "Cà phê của chúng tôi",
        questions: [
            [
                "Coffee Shop có những dòng cà phê nào?",
                "Bộ sưu tập hiện có cà phê Robusta và Arabica, với nhiều lựa chọn khối lượng. Bạn có thể xem hương vị, giống và mức rang trên từng trang sản phẩm.",
            ],
            [
                "Robusta và Arabica khác nhau thế nào?",
                "Robusta thường có vị đậm, thể chất dày và hậu vị rõ. Arabica thường thiên về hương thơm, độ chua và vị ngọt. Hương vị cuối cùng còn phụ thuộc vào vùng trồng, sơ chế, mức rang và cách pha.",
            ],
            ["Cà phê có nguồn gốc từ đâu?", "Chúng tôi giới thiệu cà phê từ cao nguyên Việt Nam. Vùng trồng và thông tin nguồn gốc cụ thể được ghi trong phần “Về sản phẩm” của từng loại cà phê."],
            [
                "Tôi nên bắt đầu với loại cà phê nào?",
                "Nếu thích một tách đậm vị, bạn có thể bắt đầu với Robusta. Nếu thích hương thơm và vị thanh hơn, hãy thử Arabica. Gửi cho chúng tôi cách pha và gu vị của bạn để được tư vấn thêm.",
            ],
        ],
    },
    {
        id: "cach-pha",
        title: "Cách pha",
        questions: [
            [
                "Cà phê nào phù hợp để pha phin?",
                "Robusta là một lựa chọn quen thuộc cho phin và cà phê sữa. Arabica cũng có thể pha phin nếu bạn thích vị thanh hơn. Độ xay và thời gian chiết xuất có ảnh hưởng lớn đến tách cà phê.",
            ],
            [
                "Tôi có thể dùng cà phê này cho máy espresso không?",
                "Bạn có thể chọn hạt cà phê dựa trên gu vị và mức rang, rồi điều chỉnh độ xay cho máy espresso. Hãy cho chúng tôi biết thiết bị đang dùng khi cần tư vấn.",
            ],
            [
                "Nên chọn cà phê hạt hay cà phê xay?",
                "Nếu có máy xay, hãy chọn cà phê hạt và xay ngay trước khi pha. Nếu dùng cà phê xay, bạn nên chọn độ xay phù hợp với phin, máy hoặc dụng cụ lọc của mình.",
            ],
            [
                "Vì sao cà phê của tôi quá đắng hoặc quá nhạt?",
                "Hãy thử thay đổi từng yếu tố: lượng cà phê, lượng nước, độ xay hoặc thời gian pha. Xay mịn hơn và pha lâu hơn thường làm tăng chiết xuất; xay thô hơn và pha nhanh hơn thường làm giảm chiết xuất.",
            ],
        ],
    },
    {
        id: "bao-quan",
        title: "Bảo quản",
        questions: [
            [
                "Nên bảo quản cà phê như thế nào?",
                "Đóng kín túi sau mỗi lần sử dụng, để ở nơi khô ráo, thoáng mát và tránh ánh nắng. Hạn chế để cà phê tiếp xúc với không khí, hơi ẩm và các thực phẩm có mùi mạnh.",
            ],
            [
                "Có nên để cà phê trong tủ lạnh không?",
                "Với túi cà phê dùng hằng ngày, một nơi khô mát và bao bì kín thường thuận tiện hơn. Việc lấy túi ra vào tủ lạnh có thể khiến hơi ẩm ngưng tụ và ảnh hưởng đến hương vị.",
            ],
            ["Cà phê dùng được trong bao lâu?", "Hãy kiểm tra ngày rang, hạn sử dụng và hướng dẫn trên bao bì của sản phẩm bạn mua. Sau khi mở túi, nên dùng sớm để cảm nhận hương thơm rõ hơn."],
        ],
    },
    {
        id: "dat-hang",
        title: "Đặt hàng & giao nhận",
        questions: [
            [
                "Tôi có thể đặt cà phê bằng cách nào?",
                "Chọn loại cà phê, khối lượng và số lượng trên trang Sản phẩm, thêm vào giỏ rồi điền thông tin giao hàng ở bước Thanh toán. Bạn thanh toán khi nhận hàng (COD); cửa hàng sẽ gọi xác nhận trước khi giao.",
            ],
            [
                "Phí giao hàng được tính như thế nào?",
                "Đơn từ 500.000đ được miễn phí giao hàng. Với đơn dưới mức này, phí được hiển thị ở bước Thanh toán hoặc được cửa hàng xác nhận qua điện thoại trước khi gửi hàng.",
            ],
            [
                "Tôi có thể thay đổi thông tin đơn hàng không?",
                "Hãy liên hệ sớm và cung cấp thông tin đơn hàng cùng nội dung cần thay đổi. Chúng tôi sẽ kiểm tra tình trạng xử lý và phản hồi phương án phù hợp.",
            ],
            [
                "Tôi cần làm gì nếu sản phẩm nhận được có vấn đề?",
                "Giữ lại bao bì, thông tin đơn hàng và ảnh chụp tình trạng sản phẩm, sau đó gửi cho chúng tôi qua trang Liên hệ để được kiểm tra và hỗ trợ.",
            ],
        ],
    },
    {
        id: "hop-tac",
        title: "Hợp tác",
        questions: [
            [
                "Tôi muốn tìm cà phê cho quán, có thể liên hệ ở đâu?",
                "Bạn có thể gửi yêu cầu qua trang Liên hệ. Hãy chia sẻ mô hình quán, cách pha, gu hương vị và lượng cà phê dự kiến sử dụng để chúng tôi hiểu rõ nhu cầu.",
            ],
            [
                "Tôi cần tư vấn thêm về sản phẩm thì sao?",
                "Hãy cho chúng tôi biết loại cà phê bạn đang dùng, dụng cụ pha và điều bạn muốn thay đổi trong tách cà phê. Những thông tin này sẽ giúp việc tư vấn cụ thể hơn.",
            ],
        ],
    },
];

function FaqItem({ question, answer, id }: { question: string; answer: string; id: string }) {
    const [open, setOpen] = useState(false);
    return (
        <EditorialReveal>
            <div className={styles.item}>
                <span aria-hidden="true" data-reveal="border" data-reveal-at="0" data-reveal-border className={styles.border} />
                <h6 className={styles.question}>
                    <button id={`${id}-question`} type="button" aria-expanded={open} aria-controls={`${id}-answer`} onClick={() => setOpen(!open)}>
                        <span data-reveal="block" data-reveal-at="0.15" className={styles.questionText}>
                            {question}
                        </span>
                        <span aria-hidden="true" className={`${styles.plus} ${open ? styles.open : ""}`} />
                    </button>
                </h6>
                <div
                    id={`${id}-answer`}
                    role="region"
                    aria-labelledby={`${id}-question`}
                    aria-hidden={!open}
                    inert={!open}
                    className={`${styles.answer} ${open ? styles.expanded : ""}`}
                    onTransitionEnd={(event) => {
                        if (event.target === event.currentTarget && event.propertyName === "grid-template-rows") ScrollTrigger.refresh();
                    }}
                >
                    <div>
                        <p>{answer}</p>
                    </div>
                </div>
            </div>
        </EditorialReveal>
    );
}

export function FaqContent() {
    const rootRef = useRef<HTMLElement>(null);
    const [active, setActive] = useState(categories[0].id);
    const lenis = useLenis();

    useEffect(() => {
        let frame = 0;
        const update = () => {
            const sections = rootRef.current?.querySelectorAll<HTMLElement>("[data-faq-category]");
            let current = categories[0].id;
            sections?.forEach((section) => {
                if (section.getBoundingClientRect().top <= 180) current = section.id;
            });
            setActive(current);
            frame = 0;
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            cancelAnimationFrame(frame);
        };
    }, []);

    const goTo = (id: string) => {
        const target = document.getElementById(id);
        if (!target) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (lenis) lenis.scrollTo(target, { immediate: reduced, duration: 1 });
        else target.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
        setActive(id);
    };

    return (
        <article ref={rootRef} className={styles.page}>
            <div className={styles.mobileNav}>
                <label htmlFor="faq-category">Chủ đề:</label>
                <Dropdown id="faq-category" label="Chủ đề câu hỏi" value={active} onChange={goTo} options={categories.map(({ id, title }) => ({ value: id, label: title }))} />
            </div>
            <div className={styles.container}>
                <EditorialReveal>
                    <header className={styles.hero}>
                        <p data-reveal="lines">FAQs</p>
                        <h1 data-reveal="words" data-reveal-at="0.15">
                            Câu hỏi thường gặp
                        </h1>
                    </header>
                </EditorialReveal>
                <div className={styles.layout}>
                    <nav aria-label="Chủ đề câu hỏi" className={styles.categoryNav}>
                        {categories.map(({ id, title }) => (
                            <button key={id} type="button" aria-current={active === id ? "location" : undefined} onClick={() => goTo(id)}>
                                {title}
                            </button>
                        ))}
                    </nav>
                    <div className={styles.groups}>
                        {categories.map(({ id, title, questions }) => (
                            <section key={id} id={id} data-faq-category aria-labelledby={`${id}-title`} className={styles.group}>
                                <EditorialReveal>
                                    <h2 data-reveal="words" id={`${id}-title`}>
                                        {title}
                                    </h2>
                                </EditorialReveal>
                                {questions.map(([question, answer], index) => (
                                    <FaqItem key={question} id={`${id}-${index}`} question={question} answer={answer} />
                                ))}
                            </section>
                        ))}
                    </div>
                </div>
                <EditorialReveal>
                    <section className={styles.contact} aria-labelledby="faq-contact-title">
                        <p data-reveal="lines">Một tách cà phê, nhiều điều để khám phá.</p>
                        <h2 data-reveal="words" id="faq-contact-title">
                            Bạn vẫn còn câu hỏi?
                        </h2>
                        <RevealLink href="/lien-he/">Trò chuyện với chúng tôi</RevealLink>
                    </section>
                </EditorialReveal>
            </div>
        </article>
    );
}
