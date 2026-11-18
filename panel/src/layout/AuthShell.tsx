import { Route, Switch } from "wouter";
import Login from "../pages/auth/Login";
import CfxreCallback from "../pages/auth/CfxreCallback";
import AddMasterPin from "../pages/auth/AddMasterPin";
import AddMasterCallback from "../pages/auth/AddMasterCallback";
import { Card } from "../components/ui/card";
import { LogoFullSquareGreen } from "@/components/Logos";
import { useThemedImage } from "@/hooks/theme";
import { handleExternalLinkClick } from "@/lib/navigation";
import { AuthError } from "@/pages/auth/errors";
import DynamicAdvert from "@/components/DynamicAdvert";

function AuthContentWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-center">
            {children}
        </div>
    );
}


export default function AuthShell() {
    const customLogoUrl = useThemedImage(window.txConsts.providerLogo);
    return (
        <div className="min-h-screen flex items-center justify-center pattern-dots">
            <div className="w-full min-w-[20rem] xs:max-w-[25rem] my-4 xs:mx-4">
                {customLogoUrl ? (
                    <img
                        className='max-w-36 xs:max-w-56 max-h-16 xs:max-h-24 m-auto'
                        src={customLogoUrl}
                        alt={window.txConsts.providerName}
                    />
                ) : (
                    <LogoFullSquareGreen className="w-36 xs:w-52 mx-auto" />
                )}

                <Card className="min-h-80 mt-4 xs:mt-8 mb-4 flex items-center justify-center bg-card/40 rounded-none xs:rounded-lg">
                    <Switch>
                        <Route path="/login">
                            <Login />
                        </Route>
                        <Route path="/login/callback">
                            <AuthContentWrapper>
                                <CfxreCallback />
                            </AuthContentWrapper>
                        </Route>
                        <Route path="/addMaster/pin">
                            <AuthContentWrapper>
                                <AddMasterPin />
                            </AuthContentWrapper>
                        </Route>
                        <Route path="/addMaster/callback">
                            <AuthContentWrapper>
                                <AddMasterCallback />
                            </AuthContentWrapper>
                        </Route>
                        <Route path="/:fullPath*">
                            <AuthContentWrapper>
                                <AuthError
                                    error={{
                                        errorTitle: '404 | Not Found',
                                        errorMessage: 'Something went wrong.',
                                    }}
                                />
                            </AuthContentWrapper>
                        </Route>
                    </Switch>
                </Card>

                <div className="mx-auto flex flex-wrap gap-4 justify-center mb-2">
                    <DynamicAdvert placement='login' />
                    <a
                        href='https://discord.gg/uAmsGa2'
                        onClick={handleExternalLinkClick}
                        target='_blank'
                        className='w-48 h-16 relative group shadow-sm opacity-90 hover:opacity-100 brightness-110
                        dark:brightness-95 dark:hover:brightness-110'
                    >
                        <div className='absolute inset-0 -z-10 animate-pulse blur 
                        scale-0 group-hover:scale-100 transition-transform bg-black
                        dark:bg-gradient-to-t dark:from-[#8567EC] dark:to-[#BD5CBF]' />
                        <img
                            className='rounded-lg max-w-48 max-h-16 m-auto'
                            src="img/discord.png"
                        />
                    </a>
                </div>

                <div className="text-center text-muted-foreground text-sm font-light">
                    tx: <strong>v{window.txConsts.txaVersion}</strong>
                    &nbsp;|
                    fx: <strong>b{window.txConsts.fxsVersion}</strong>
                </div>
            </div>
        </div>
    );
}
