"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type ExperienceRuntimeValue = {
    started: boolean;
    start: () => void;
};

const ExperienceRuntimeContext = createContext<ExperienceRuntimeValue>({
    started: true,
    start: () => undefined,
});

export function ExperienceRuntime({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [homeStarted, setHomeStarted] = useState(false);
    const started = pathname !== "/" || homeStarted;
    const start = useCallback(() => setHomeStarted(true), []);

    const value = useMemo(
        () => ({ started, start }),
        [start, started],
    );

    return (
        <ExperienceRuntimeContext.Provider value={value}>
            {children}
        </ExperienceRuntimeContext.Provider>
    );
}

export function useExperienceRuntime(): ExperienceRuntimeValue {
    return useContext(ExperienceRuntimeContext);
}
