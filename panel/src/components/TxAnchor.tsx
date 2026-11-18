import { cn } from "@/lib/utils";
import { openExternalLink } from '@/lib/navigation';
import { ExternalLinkIcon } from "lucide-react";
import { useLocation } from "wouter";


//Guarantees the icon doesn't break to the next line alone
function InnerExternal({ text }: { text: string }) {
    const words = text.split(/\s+/);
    const lastWord = words.pop();
    const startOfText = words.length ? words.join(' ') + ' ' : null;

    return (
        <>
            {startOfText}
            <span className="whitespace-nowrap">
                {lastWord}
                <ExternalLinkIcon
                    className="inline ml-1 mb-1 h-5 -mr-0.5 [.text-sm_&]:h-4 [.text-sm_&]:ml-0 [.text-sm_&]:-mr-1 [.prose-sm_&]:h-4 [.prose-sm_&]:ml-0 [.prose-sm_&]:-mr-0.5 selection:bg-inherit"
                />
            </span>
        </>
    );
}

type TxAnchorType = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    className?: string;
    rel?: string;
};
export default function TxAnchor({ children, href, className, rel, ...rest }: TxAnchorType) {
    const setLocation = useLocation()[1];
    const isExternal = href?.startsWith('http') || href?.startsWith('//');
    const onClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        if (!href) return;
        e.preventDefault();
        if (isExternal) {
            openExternalLink(href);
        } else {
            setLocation(href ?? '/');
        }
    }
    return (
        <a
            {...rest}
            rel={rel ?? 'noopener noreferrer'}
            href={href}
            className={cn(
                'text-accent no-underline hover:underline cursor-pointer',
                className
            )}
            onClick={onClick}
        >
            {isExternal && typeof children === 'string'
                ? <InnerExternal text={children} />
                : children
            }
        </a>
    );
}
