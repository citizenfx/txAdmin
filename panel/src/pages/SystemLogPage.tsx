import { Terminal } from '@xterm/xterm';
import { CanvasAddon } from '@xterm/addon-canvas';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useEffect, useMemo, useRef, useState } from "react";
import { useEventListener } from 'usehooks-ts';
import { useContentRefresh } from "@/hooks/pages";
import { debounce, throttle } from 'throttle-debounce';
import { ChevronsDownIcon, Loader2Icon } from "lucide-react";

import './LiveConsole/xtermOverrides.css';
import '@xterm/xterm/css/xterm.css';
import { openExternalLink } from '@/lib/navigation';
import { handleHotkeyEvent } from '@/lib/hotkeyEventListener';
import xtermOptions from './LiveConsole/xtermOptions';
import ScrollDownAddon from './LiveConsole/ScrollDownAddon';
import LiveConsoleSearchBar from './LiveConsole/LiveConsoleSearchBar';
import { useBackendApi } from '@/hooks/fetch';
import { useIsDarkMode } from '@/hooks/theme';
import { darkThemeColors, lightThemeColors } from './LiveConsole/liveConsoleColors';


//Helpers
const keyDebounceTime = 150; //ms
type SystemLogPageProps = {
    pageName: 'console' | 'action';
};


//NOTE: most of this code is yoinked from the live console page
export default function SystemLogPage({ pageName }: SystemLogPageProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [showSearchBar, setShowSearchBar] = useState(false);
    const isDarkTheme = useIsDarkMode();
    const refreshPage = useContentRefresh();
    const getLogsApi = useBackendApi<{ data: string }>({
        method: 'GET',
        path: `/systemLog/${pageName}`,
        throwGenericErrors: true,
    });


    /**
     * xterm stuff
     */
    const jumpBottomBtnRef = useRef<HTMLButtonElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const term = useMemo(() => new Terminal({
        ...xtermOptions,
        theme: isDarkTheme ? darkThemeColors : lightThemeColors,
    }), []);
    const fitAddon = useMemo(() => new FitAddon(), []);
    const searchAddon = useMemo(() => new SearchAddon(), []);
    const termLinkHandler = (event: MouseEvent, uri: string) => {
        openExternalLink(uri);
    };
    const webLinksAddon = useMemo(() => new WebLinksAddon(termLinkHandler), []);

    const sendSearchKeyEvent = throttle(keyDebounceTime, (action: string) => {
        window.postMessage({
            type: 'liveConsoleSearchHotkey',
            action,
        });
    }, { noTrailing: true });

    const refitTerminal = () => {
        if (!containerRef.current || !term.element || !fitAddon) {
            console.log('refitTerminal: no containerRef.current or term.element or fitAddon');
            return;
        }

        const proposed = fitAddon.proposeDimensions();
        if (proposed) {
            term.resize(proposed.cols, proposed.rows);
        } else {
            console.log('refitTerminal: no proposed dimensions');
        }
    }
    useEventListener('resize', debounce(100, refitTerminal));

    useEffect(() => {
        if (term.element) {
            term.options.theme = isDarkTheme ? darkThemeColors : lightThemeColors;
            term.refresh(0, term.rows - 1);
            refitTerminal();
        }
    }, [term, isDarkTheme]);

    useEffect(() => {
        if (containerRef.current && jumpBottomBtnRef.current && !term.element) {
            console.log('xterm init');
            containerRef.current.innerHTML = ''; //due to HMR, the terminal element might still be there
            term.loadAddon(fitAddon);
            term.loadAddon(searchAddon);
            term.loadAddon(webLinksAddon);
            term.loadAddon(new CanvasAddon());
            term.loadAddon(new ScrollDownAddon(jumpBottomBtnRef.current, containerRef.current));
            term.open(containerRef.current);
            term.write('\x1b[?25l'); //hide cursor
            refitTerminal();

            const scrollPageUp = throttle(keyDebounceTime, () => {
                term.scrollLines(Math.min(1, 2 - term.rows));
            }, { noTrailing: true });
            const scrollPageDown = throttle(keyDebounceTime, () => {
                term.scrollLines(Math.max(1, term.rows - 2));
            }, { noTrailing: true });
            const scrollTop = throttle(keyDebounceTime, () => {
                term.scrollToTop();
            }, { noTrailing: true });
            const scrollBottom = throttle(keyDebounceTime, () => {
                term.scrollToBottom();
            }, { noTrailing: true });

            term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
                // Some are handled by the live console element
                if (e.code === 'F5') {
                    return false;
                } else if (e.code === 'Escape') {
                    return false;
                } else if (e.code === 'KeyF' && (e.ctrlKey || e.metaKey)) {
                    return false;
                } else if (e.code === 'F3') {
                    return false;
                } else if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) {
                    document.execCommand('copy');
                    term.clearSelection();
                    return false;
                } else if (e.code === 'PageUp') {
                    scrollPageUp();
                    return false;
                } else if (e.code === 'PageDown') {
                    scrollPageDown();
                    return false;
                } else if (e.code === 'Home') {
                    scrollTop();
                    return false;
                } else if (e.code === 'End') {
                    scrollBottom();
                    return false;
                } else if (handleHotkeyEvent(e)) {
                    return false;
                }
                return true;
            });

            //fetch logs
            getLogsApi({
                success: (resp, toastId) => {
                    setIsLoading(false);
                    writeToTerminal(resp.data);
                    term.writeln('');
                    term.writeln('\u001b[33m[END OF LOG - REFRESH THE PAGE TO LOAD MORE]\u001b');
                },
                error: (message, toastId) => {
                    setIsLoading(false);
                    setLoadError(message);
                },
            });
        }
    }, [term]);

    //Hotkeys
    useEventListener('keydown', (e: KeyboardEvent) => {
        if (e.code === 'F5') {
            if (isLoading) {
                refreshPage();
                e.preventDefault();
            }
        } else if (e.code === 'Escape') {
            searchAddon.clearDecorations();
            setShowSearchBar(false);
        } else if (e.code === 'KeyF' && (e.ctrlKey || e.metaKey)) {
            if (showSearchBar) {
                sendSearchKeyEvent('focus');
            } else {
                setShowSearchBar(true);
            }
            e.preventDefault();
        } else if (e.code === 'F3') {
            sendSearchKeyEvent(e.shiftKey ? 'previous' : 'next');
            e.preventDefault();
        }
    });

    //NOTE: quickfix for https://github.com/xtermjs/xterm.js/issues/4994
    const writeToTerminal = (data: string) => {
        const lines = data.split(/\r?\n/);
        //check if last line isn't empty
        //NOTE: i'm not trimming because having multiple \n at the end is valid
        if (lines.length && !lines[lines.length - 1]) {
            lines.pop();
        }
        //print each line
        for (const line of lines) {
            term.writeln(line);
        }
    }

    //Rendering stuff
    let pageTitle = 'Console Log';
    let pageSubtitle = 'Output of txAdmin to it\'s parent terminal, including usually hidden debug messages.';
    if (pageName === 'action') {
        pageTitle = 'Action Log';
        pageSubtitle = 'Log of all actions taken by txAdmin or any admin.';
    }

    return (
        <div className="text-primary flex flex-col h-full w-full bg-card border md:rounded-xl overflow-clip">
            <div className="flex flex-col flex-shrink px-1 sm:px-4 py-2 space-y-4 border-b">
                <div className="flex items-center space-x-2">
                    <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        height="24"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        width="24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <polyline points="4 17 10 11 4 5" />
                        <line x1="12" x2="20" y1="19" y2="19" />
                    </svg>
                    <p className="font-mono text-sm">{pageTitle} - <span className='text-muted-foreground'>{pageSubtitle}</span></p>
                </div>
            </div>

            <div className="flex flex-col relative grow overflow-hidden">
                {/* Loading overlay */}
                {isLoading && !loadError ? (
                    <div className='absolute inset-0 z-20 bg-black/60 flex items-center justify-center'>
                        <div className='flex flex-col gap-6 items-center justify-center text-muted-foreground select-none'>
                            <Loader2Icon className='w-16 h-16 animate-spin' />
                            <h2 className='text-3xl tracking-wider font-light animate-pulse'>
                                &nbsp;&nbsp;&nbsp;Loading...
                            </h2>
                        </div>
                    </div>
                ) : null}
                {loadError && (
                    <div className='absolute inset-0 z-20 bg-black/60 flex flex-col gap-4 items-center justify-center'>
                        <h2 className='text-2xl tracking-wider font-light text-muted-foreground select-none'>
                            Error fetching {pageTitle}:
                        </h2>
                        <p className='mx-8 max-w-screen-md text-destructive-inline font-mono'>
                            {loadError}
                        </p>
                    </div>
                )}

                {/* Terminal container */}
                <div ref={containerRef} className='absolute top-1 left-2 right-0 bottom-0' />

                {/* Search bar */}
                <LiveConsoleSearchBar
                    show={showSearchBar}
                    setShow={setShowSearchBar}
                    searchAddon={searchAddon}
                />

                {/* Scroll to bottom */}
                <button
                    ref={jumpBottomBtnRef}
                    className='absolute bottom-0 right-2 z-10 hidden opacity-75'
                    onClick={() => { term.scrollToBottom() }}
                >
                    <ChevronsDownIcon className='w-20 h-20 animate-pulse hover:animate-none hover:scale-110' />
                </button>
            </div>
        </div>
    );
}
