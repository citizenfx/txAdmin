/* eslint-disable no-control-regex */
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
import LiveConsoleFooter from "./LiveConsoleFooter";
import LiveConsoleHeader from "./LiveConsoleHeader";
import LiveConsoleSearchBar from "./LiveConsoleSearchBar";
import LiveConsoleSaveSheet from "./LiveConsoleSaveSheet";

import ScrollDownAddon from "./ScrollDownAddon";
import xtermOptions from "./xtermOptions";
import './xtermOverrides.css';
import '@xterm/xterm/css/xterm.css';
import { getSocket } from '@/lib/utils';
import { openExternalLink } from '@/lib/navigation';
import { handleHotkeyEvent } from '@/lib/hotkeyEventListener';
import { txToast } from '@/components/TxToaster';
import { copyTermLine, extractTermLineTimestamp, formatTermTimestamp, getEmptyTermTimestamp, getNumFontVariantsLoaded } from './liveConsoleUtils';
import { getTermLineEventData, getTermLineInitialData, getTermLineRtlData, registerTermLineMarker } from './liveConsoleMarkers';
import { useIsDarkMode } from '@/hooks/theme';
import { darkThemeColors, lightThemeColors, ANSI } from './liveConsoleColors';
import { useTerminalOptions } from './liveConsoleHooks';
import { DensityModes } from './xtermOptions';


//Consts
const keyDebounceTime = 150; //ms

//Main component
export default function LiveConsolePage() {
    const [isSaveSheetOpen, setIsSaveSheetOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [showSearchBar, setShowSearchBar] = useState(false);

    // Terminal settings state
    const { options: savedOptions, updateOptions: updateTerminalOptions } = useTerminalOptions();
    const optionsRef = useRef({ ...savedOptions });

    const termInputRef = useRef<HTMLInputElement>(null);
    const termPrefixRef = useRef({
        ts: 0, //so we can clear the console
        lastEol: true,
        prefix: getEmptyTermTimestamp(optionsRef.current.timestamp),
    });
    const refreshPage = useContentRefresh();
    const isDarkTheme = useIsDarkMode();

    //This is required to update the timestamp, because writeToTerminal is "cached" by the socket useEffect
    useEffect(() => {
        optionsRef.current = { ...savedOptions };
    }, [savedOptions]);

    /**
     * xterm stuff
     */
    const jumpBottomBtnRef = useRef<HTMLButtonElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const term = useMemo(() => new Terminal({
        ...xtermOptions,
        ...savedOptions,
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
            const densitySettings = DensityModes[savedOptions.density];
            Object.assign(term.options, {
                theme: isDarkTheme ? darkThemeColors : lightThemeColors,
                scrollback: savedOptions.scrollback,
                fontSize: densitySettings.fontSize,
                lineHeight: densitySettings.lineHeight,
                letterSpacing: densitySettings.letterSpacing,
            });
            refitTerminal();
            term.refresh(0, term.rows - 1);
        }
    }, [term, isDarkTheme, savedOptions]);

    useEffect(() => {
        if (containerRef.current && jumpBottomBtnRef.current && !term.element) {
            console.log('Live Console xterm.js init');
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
                if (e.code === 'F5' && !e.ctrlKey) {
                    return false;
                } else if (e.code === 'Escape') {
                    return false;
                } else if (e.code === 'KeyF' && (e.ctrlKey || e.metaKey)) {
                    return false;
                } else if (e.code === 'F3') {
                    return false;
                } else if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) {
                    const selection = term.getSelection();
                    if (!selection) return false;
                    copyTermLine(
                        selection,
                        term.element as any,
                        optionsRef.current.copyTimestamp,
                        optionsRef.current.copyChannel,
                        termInputRef.current
                    ).then((res) => {
                        //undefined if no error
                        if (res === false) {
                            txToast.error('Failed to copy to clipboard :(');
                        }
                    }).catch((error) => {
                        txToast.error({
                            title: 'Failed to copy to clipboard:',
                            msg: error.message,
                        });
                    });
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
        }
    }, [term]);

    useEventListener('keydown', (e: KeyboardEvent) => {
        if (e.code === 'F5' && !e.ctrlKey) {
            if (isConnected) {
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
        // NOTE: i'm not trimming because having multiple \n at the end is valid
        let wasEolStripped = false;
        if (lines.length && !lines[lines.length - 1]) {
            lines.pop();
            wasEolStripped = true;
        }

        //extracts timestamp & print each line
        let isNewTs = false;
        for (let i = 0; i < lines.length; i++) {
            isNewTs = false;
            let line = lines[i];
            //tries to extract timestamp
            try {
                const { ts, content } = extractTermLineTimestamp(line);
                if (ts) {
                    isNewTs = true;
                    line = content;
                    termPrefixRef.current.ts = ts;
                    termPrefixRef.current.prefix = formatTermTimestamp(ts, optionsRef.current.timestamp);
                }
            } catch (error) {
                termPrefixRef.current.prefix = getEmptyTermTimestamp(optionsRef.current.timestamp);
                console.warn('Failed to parse timestamp from:', line, (error as any).message);
            }

            //Markers
            let writeCallback: (() => void) | undefined;
            try {
                const res = getTermLineEventData(line)
                    ?? getTermLineInitialData(line)
                    ?? getTermLineRtlData(line); //https://github.com/xtermjs/xterm.js/issues/701
                if (res && res.markerData) {
                    writeCallback = () => registerTermLineMarker(term, res.markerData);
                }
                if (res && res.newLine) {
                    line = res.newLine;
                }
            } catch (error) {
                console.error('Failed to process marker:', (error as any).message);
            }

            //Check if it's last line, and if the EOL was stripped
            const prefixColor = isNewTs ? ANSI.TS_STRONG : ANSI.TS_WEAK;
            const prefix = termPrefixRef.current.lastEol
                ? prefixColor + termPrefixRef.current.prefix
                : '';
            const prefixedLine = prefix + line;
            if (i < lines.length - 1 || wasEolStripped) {
                term.writeln(prefixedLine, writeCallback);
                termPrefixRef.current.lastEol = true;
            } else {
                term.write(prefixedLine, writeCallback);
                termPrefixRef.current.lastEol = false;
            }
        }
    }

    //DEBUG
    // useEffect(() => {
    //     let cnt = 0;
    //     const interval = setInterval(function LoLoLoLoLoLoL() {
    //         cnt++;
    //         const mod = cnt % 60;
    //         term.writeln(
    //             cnt.toString().padStart(6, '0') + ' ' +
    //             '\u001b[1m\u001b[31m=\u001b[0m'.repeat(mod) +
    //             '\u001b[1m\u001b[33m.\u001b[0m'.repeat(60 - mod)
    //         );
    //     }, 100);
    //     return () => clearInterval(interval);
    // }, []);


    /**
     * SocketIO stuff
     */
    const socketStateChangeCounter = useRef(0);
    const pageSocket = useRef<ReturnType<typeof getSocket> | null>(null);

    //Runing on mount only
    useEffect(() => {
        pageSocket.current = getSocket(['liveconsole']);
        pageSocket.current.on('connect', () => {
            console.log("LiveConsole Socket.IO Connected.");
            setIsConnected(true);
        });
        pageSocket.current.on('disconnect', (message) => {
            console.log("LiveConsole Socket.IO Disonnected:", message);
            //Grace period of 500ms to allow for quick reconnects
            //Tracking the state change ID for the timeout not to overwrite a reconnection
            const newId = socketStateChangeCounter.current + 1;
            socketStateChangeCounter.current = newId;
            setTimeout(() => {
                if (socketStateChangeCounter.current === newId) {
                    setIsConnected(false);
                }
            }, 500);
        });
        pageSocket.current.on('error', (error) => {
            console.log('LiveConsole Socket.IO', error);
        });
        pageSocket.current.on('consoleData', function (data) {
            writeToTerminal(data);
        });

        return () => {
            pageSocket.current?.removeAllListeners();
            pageSocket.current?.disconnect();
        }
    }, []);


    //Font loading effect
    //NOTE: on first render, the font might not be loaded yet, in this case we listen for the loadingdone event
    //  and refresh the page when it happens, so the terminal can be properly rendered
    //  Ref: https://github.com/xtermjs/xterm.js/issues/5164
    //  This is a bad solution, we should first check if loaded, and _then_ render the terminal, with timeout if needed
    useEffect(() => {
        if (getNumFontVariantsLoaded('--font-mono', 'INITIAL EFFECT')) return; //we don't need to await anything
        const handleFontLoadingDone = () => {
            getNumFontVariantsLoaded('--font-mono', 'ON FONT LOADING DONE');
            refreshPage();
        };
        document.fonts.addEventListener('loadingdone', handleFontLoadingDone);
        return () => {
            document.fonts.removeEventListener('loadingdone', handleFontLoadingDone);
        };
    }, []);


    /**
     * Action Handlers
     */
    const consoleWrite = (cmd: string) => {
        if (!isConnected || !pageSocket.current) return;
        if (cmd === 'cls' || cmd === 'clear') {
            clearConsole();
        } if (cmd === '\n') {
            term.write(`\n`);
        } else {
            pageSocket.current.emit('consoleCommand', cmd);
        }
    }
    const clearConsole = () => {
        term.clear();
        searchAddon.clearDecorations();
        setShowSearchBar(false);
        term.write(`${ANSI.ORANGE}[console cleared]${ANSI.RESET}\n`);
    }
    const toggleSearchBar = () => {
        setShowSearchBar(!showSearchBar);
    }
    const toggleSaveSheet = () => {
        setIsSaveSheetOpen(!isSaveSheetOpen);
    }
    const inputSuggestions = (cmd: string) => {
        if (termInputRef.current) {
            termInputRef.current.value = cmd;
            termInputRef.current.focus();
        }
        setIsSaveSheetOpen(false);
    }


    return (
        <div className="text-primary flex flex-col h-contentvh w-full bg-card border md:rounded-xl overflow-clip">
            <LiveConsoleHeader
                options={savedOptions}
                setOptions={updateTerminalOptions}
            />

            <div className="flex flex-col relative grow overflow-hidden">
                {/* Connecting overlay */}
                {!isConnected ? (
                    <div className='absolute inset-0 z-20 bg-black/60 flex items-center justify-center'>
                        <div className='flex flex-col gap-6 items-center justify-center text-muted-foreground select-none'>
                            <Loader2Icon className='w-16 h-16 animate-spin' />
                            <h2 className='text-3xl tracking-wider font-light animate-pulse'>
                                &nbsp;&nbsp;&nbsp;Connecting...
                            </h2>
                        </div>
                    </div>
                ) : null}

                <LiveConsoleSaveSheet
                    isOpen={isSaveSheetOpen}
                    closeSheet={() => setIsSaveSheetOpen(false)}
                    toTermInput={(cmd) => inputSuggestions(cmd)}
                />

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

            <LiveConsoleFooter
                termInputRef={termInputRef}
                isConnected={isConnected}
                consoleWrite={consoleWrite}
                consoleClear={clearConsole}
                toggleSaveSheet={toggleSaveSheet}
                toggleSearchBar={toggleSearchBar}
            />
        </div>
    )
}
