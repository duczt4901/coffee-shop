"use client";
import { faqContent as content } from "@/data/page-content";
import { faqImages } from "@/data/page-images";
import { SkeletonImage } from "@/components/ui/SkeletonImage";

import { useEffect, useRef, useState } from "react";
import { EditorialReveal, RevealLink } from "@/components/ui/EditorialReveal";
import { Dropdown } from "@/components/ui/Dropdown";
import { useEnhancedDisclosure } from "@/components/ui/useEnhancedDisclosure";
import styles from "./page.module.css";

const categories = [
    {
        id: "ca-phe",
        title: content.faq_title_1,
        questions: [
            [content.faq_question_answer_1, content.faq_question_answer_2],
            [content.faq_question_answer_3, content.faq_question_answer_4],
            [content.faq_question_answer_5, content.faq_question_answer_6],
            [content.faq_question_answer_7, content.faq_question_answer_8],
        ],
    },
    {
        id: "cach-pha",
        title: content.faq_title_2,
        questions: [
            [content.faq_question_answer_9, content.faq_question_answer_10],
            [content.faq_question_answer_11, content.faq_question_answer_12],
            [content.faq_question_answer_13, content.faq_question_answer_14],
            [content.faq_question_answer_15, content.faq_question_answer_16],
        ],
    },
    {
        id: "bao-quan",
        title: content.faq_title_3,
        questions: [
            [content.faq_question_answer_17, content.faq_question_answer_18],
            [content.faq_question_answer_19, content.faq_question_answer_20],
            [content.faq_question_answer_21, content.faq_question_answer_22],
        ],
    },
    {
        id: "dat-hang",
        title: content.faq_title_4,
        questions: [
            [content.faq_question_answer_23, content.faq_question_answer_24],
            [content.faq_question_answer_25, content.faq_question_answer_26],
            [content.faq_question_answer_27, content.faq_question_answer_28],
            [content.faq_question_answer_29, content.faq_question_answer_30],
        ],
    },
    {
        id: "hop-tac",
        title: content.faq_title_5,
        questions: [
            [content.faq_question_answer_31, content.faq_question_answer_32],
            [content.faq_question_answer_33, content.faq_question_answer_34],
        ],
    },
];

function FaqItem({ question, answer, id }: { question: string; answer: string; id: string }) {
    const { detailsRef, panelRef, enhanced, open, nativeOpen, setOpen } = useEnhancedDisclosure();
    const expanded = !enhanced || open;

    return (
        <EditorialReveal>
            <details ref={detailsRef} className={`${styles.item} ${enhanced ? styles.enhanced : ""}`} open={nativeOpen || undefined}>
                <summary
                    id={`${id}-question`}
                    className={styles.question}
                    aria-expanded={enhanced ? open : undefined}
                    aria-controls={`${id}-answer`}
                    onClick={(event) => {
                        if (!enhanced) return;
                        event.preventDefault();
                        setOpen(!open);
                    }}
                >
                    <span data-reveal-title className={styles.questionRow}>
                        <span aria-hidden="true" data-reveal="border" data-reveal-border className={styles.border} />
                        <span data-reveal="block" className={styles.questionText}>
                            {question}
                        </span>
                        <span aria-hidden="true" className={`${styles.plus} ${open ? styles.open : ""}`} />
                    </span>
                </summary>
                <div
                    ref={panelRef}
                    id={`${id}-answer`}
                    role="region"
                    aria-labelledby={`${id}-question`}
                    aria-hidden={enhanced ? !open : undefined}
                    inert={!expanded}
                    className={`${styles.answer} ${expanded ? "" : styles.collapsed}`}
                >
                    <div>
                        <p>{answer}</p>
                    </div>
                </div>
            </details>
        </EditorialReveal>
    );
}

export function FaqContent() {
    const rootRef = useRef<HTMLElement>(null);
    const [active, setActive] = useState(categories[0].id);

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
        target.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
        setActive(id);
    };

    return (
        <article ref={rootRef} className={styles.page}>
            <div className={styles.mobileNav}>
                <label htmlFor="faq-category">{content.faq_label_1}</label>
                <Dropdown id="faq-category" label="Chủ đề câu hỏi" value={active} onChange={goTo} options={categories.map(({ id, title }) => ({ value: id, label: title, href: `#${id}` }))} />
            </div>
            <div className={styles.container}>
                <EditorialReveal>
                    <header className={styles.hero}>
                        <p data-reveal="lines">{content.faq_p_1}</p>
                        <h1 data-reveal="words">{content.faq_h1_1}</h1>
                        {faqImages.faq_image_intro && <SkeletonImage src={faqImages.faq_image_intro} alt="" width={1600} height={900} sizes="(min-width: 1000px) 50vw, 100vw" className="my-8 aspect-video w-full object-cover" />}
                    </header>
                </EditorialReveal>
                <div className={styles.layout}>
                    <nav aria-label="Chủ đề câu hỏi" className={styles.categoryNav}>
                        {categories.map(({ id, title }) => (
                            <a
                                key={id}
                                href={`#${id}`}
                                aria-current={active === id ? "location" : undefined}
                                onClick={(event) => {
                                    event.preventDefault();
                                    goTo(id);
                                }}
                            >
                                {title}
                            </a>
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
                        <p data-reveal="lines">{content.faq_p_2}</p>
                        <h2 data-reveal="words" id="faq-contact-title">
                            {content.faq_h2_1}
                        </h2>
                        <RevealLink href="/lien-he/">{content.faq_reveallink_1}</RevealLink>
                    </section>
                </EditorialReveal>
            </div>
        </article>
    );
}
