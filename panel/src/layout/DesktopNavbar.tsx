import * as React from 'react';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
import { useRoute } from 'wouter';
import MainPageLink from '@/components/MainPageLink';
import { cva } from 'class-variance-authority';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdminPerms } from '@/hooks/auth';

const buttonVariants = cva(
    `group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 ring-offset-background  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`,
    {
        variants: {
            variant: {
                default: "hover:bg-primary hover:text-primary-foreground",
                secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            },
        },
    }
);

type HeaderMenuLinkProps = {
    href: string;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
};
function HeaderMenuLink(props: HeaderMenuLinkProps) {
    const [isActive] = useRoute(props.href);
    return (
        <NavigationMenuLink asChild active={isActive}>
            {props.disabled ? (
                <Tooltip>
                    <TooltipTrigger className="cursor-help">
                        <a className={cn(
                            buttonVariants({ variant: 'default' }),
                            "pointer-events-none opacity-50",
                            props.className,
                        )}>
                            {props.children}
                        </a>
                    </TooltipTrigger>
                    <TooltipContent side='bottom' className="text-destructive-inline text-center">
                        You do not have permission <br />
                        to access this page.
                    </TooltipContent>
                </Tooltip>
            ) : (
                <MainPageLink
                    href={props.href}
                    isActive={isActive}
                    className={cn(
                        buttonVariants({ variant: isActive ? 'secondary' : 'default' }),
                        props.className,
                    )}
                >
                    {props.children}
                </MainPageLink>
            )}
        </NavigationMenuLink>
    );
}

function HeaderMenuItem(props: HeaderMenuLinkProps) {
    return (
        <NavigationMenuItem>
            <HeaderMenuLink href={props.href} disabled={props.disabled} className={props.className}>
                {props.children}
            </HeaderMenuLink>
        </NavigationMenuItem>
    );
}


//NOTE: breaking NavigationMenuItem into a separate menu because the dropdown is positioned wrong otherwise
export default function DesktopNavbar() {
    const { hasPerm } = useAdminPerms();

    return (
        <div className='space-x-1 flex flex-row select-none'>
            <NavigationMenu>
                <NavigationMenuList>
                    {/* TODO: copypaste for new menu items */}
                    {/* <DynamicNewItem featName='xxxxxxxx' durationDays={7}>
                        <div className="ml-1 mb-2 rounded-md size-2 bg-accent" />
                    </DynamicNewItem> */}
                    <HeaderMenuItem href="/players">
                        Players
                    </HeaderMenuItem>
                    <HeaderMenuItem href="/history">
                        History
                    </HeaderMenuItem>
                    <HeaderMenuItem href="/insights/player-drops">
                        Player Drops
                    </HeaderMenuItem>
                    <HeaderMenuItem href="/allowlist">
                        Allowlist
                    </HeaderMenuItem>
                    <HeaderMenuItem href="/admins" disabled={!hasPerm('manage.admins')}>
                        Admins
                    </HeaderMenuItem>
                    <HeaderMenuItem href="/settings" disabled={!hasPerm('settings.view')}>
                        Settings
                    </HeaderMenuItem>
                </NavigationMenuList>
            </NavigationMenu>

            <NavigationMenu>
                <NavigationMenuList className='aaaaaaaaaaa'>
                    <NavigationMenuItem>
                        <NavigationMenuTrigger
                            onClick={(e) => {
                                //To prevent very annoying behavior where you go click on the menu 
                                //item and it will close the menu because it just opened on hover
                                if (e.currentTarget.dataset['state'] === 'open') {
                                    e.preventDefault();
                                }
                            }}
                        >
                            System
                        </NavigationMenuTrigger>
                        <NavigationMenuContent className="flex flex-col gap-2 p-4 list-none">
                            <HeaderMenuLink
                                className="w-36 justify-start"
                                href="/system/master-actions"
                            >
                                Master Actions
                            </HeaderMenuLink>
                            <HeaderMenuLink
                                className="w-36 justify-start"
                                href="/system/diagnostics"
                            >
                                Diagnostics
                            </HeaderMenuLink>
                            <HeaderMenuLink
                                className="w-36 justify-start"
                                href="/system/console-log"
                                disabled={!hasPerm('txadmin.log.view')}
                            >
                                Console Log
                            </HeaderMenuLink>
                            <HeaderMenuLink
                                className="w-36 justify-start"
                                href="/system/action-log"
                                disabled={!hasPerm('txadmin.log.view')}
                            >
                                Action Log
                            </HeaderMenuLink>
                        </NavigationMenuContent>
                    </NavigationMenuItem>
                </NavigationMenuList>
            </NavigationMenu>
        </div>
    );
}
