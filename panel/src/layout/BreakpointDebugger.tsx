import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function BreakpointDebugger() {
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsOverflowing(document.documentElement.scrollWidth > window.innerWidth);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <div className="fixed top-navbarvh w-screen flex flex-row justify-center pointer-events-none select-none z-[9999]">
        <div className={cn(
            "p-2 flex flex-wrap flex-row gap-1 uppercase justify-center items-center w-fit",
            isOverflowing ? 'bg-destructive-hint' : 'bg-zinc-900/75',
        )}>
            <div className={cn(
                isOverflowing ? 'block' : 'hidden',
                'w-full text-center border-b-2 border-red-500',
            )}>
                Overflowing!
            </div>
            <h1 className="px-1 bg-red-500 xs:bg-green-500">xs</h1>
            <h1 className="px-1 bg-red-500 sm:bg-green-500">sm</h1>
            <h1 className="px-1 bg-red-500 md:bg-green-500">md</h1>
            <h1 className="px-1 bg-red-500 lg:bg-green-500">lg</h1>
            <h1 className="px-1 bg-red-500 xl:bg-green-500">xl</h1>
            <h1 className="px-1 bg-red-500 2xl:bg-green-500">2xl</h1>
            <h1 className="px-1 bg-red-500 3xl:bg-green-500">3xl</h1>
        </div>
    </div>;
}
