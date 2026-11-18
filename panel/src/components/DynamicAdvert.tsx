import { handleExternalLinkClick } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";


type AdPlacement = 'login' | 'sidebar';
type HostingPartner = {
    name: string;
    link: string;
}

const pickRandomPartner = (placement: AdPlacement): HostingPartner => {
    const partners = [
        { name: 'gportal', link: 'https://www.g-portal.com/FiveM' },
        { name: 'nitrado', link: 'https://server.nitrado.net/offers/fivem' },
        { name: 'nodecraft', link: 'https://nodecraft.com/r/fivem' },
        { name: 'shockbyte', link: 'https://shockbyte.com/partner/FIVEM' },
        { name: 'xrealm', link: 'https://xrealm.com/en/gameserver/fivem-server-hosting' },
        { name: 'zaphosting', link: 'https://zap-hosting.com/fivem2' }
    ];
    let partnerChosen = partners[Math.floor(Math.random() * partners.length)];
    let isCustomer = false;
    if (window.txConsts.providerName) {
        const providerKey = window.txConsts.providerName.toLowerCase().replace(/[^a-z0-9]+/g, '');
        const partnerFound = partners.find(partner => partner.name === providerKey);
        if (partnerFound) {
            partnerChosen = partnerFound;
            isCustomer = true;
        }
    }
    const partnerUrl = new URL(partnerChosen.link);
    partnerUrl.searchParams.set('utm_source', 'txadmin');
    partnerUrl.searchParams.set('utm_medium', isCustomer ? 'customer' : 'advert');
    partnerUrl.searchParams.set('utm_content', placement);
    return {
        name: partnerChosen.name,
        link: partnerUrl.toString(),
    };
}


type DynamicAdvertProps = {
    placement: AdPlacement;
};
export default function DynamicAdvert({ placement }: DynamicAdvertProps) {
    const [advert] = useState(() => pickRandomPartner(placement));
    const isLoginPage = placement === 'login';
    const imgSize = isLoginPage ? '192x64' : '256x80';
    const linkPrefix = window.txConsts.isWebInterface ? '' : 'nui://monitor/web/public/';
    return (
        <a
            href={advert.link}
            onClick={handleExternalLinkClick}
            target='_blank'
            className={cn(
                'relative self-center group shadow-sm',
                'brightness-125 opacity-80 hover:opacity-100',
                'dark:brightness-100 dark:hover:brightness-125',
                isLoginPage ? 'w-48 h-16' : 'w-sidebar h-[80px]'
            )}
        >
            <div
                className='absolute inset-0 -z-10 =animate-pulse blur scale-0 group-hover:scale-100 transition-transform bg-black dark:bg-gradient-to-r dark:from-[#18E889] dark:to-[#01FFFF]'
            />
            <img
                className={cn(
                    'rounded-lg hover:outline outline-2 m-auto hover:saturate-150',
                    isLoginPage ? 'max-w-48 max-h-16' : 'max-w-sidebar max-h-[80px]'
                )}
                src={`${linkPrefix}/img/advert-${advert.name}-${imgSize}.png`}
            />
        </a>
    );
}
