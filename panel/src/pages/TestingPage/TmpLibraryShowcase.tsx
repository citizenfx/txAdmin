import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import SwitchText from "@/components/SwitchText";
import InlineCode from "@/components/InlineCode";
import TxAnchor from "@/components/TxAnchor";
import DateTimeCorrected from "@/components/DateTimeCorrected";
import { DynamicNewBadge, DynamicNewItem } from "@/components/DynamicNewBadge";
import { 
    PersonStandingIcon, 
    AlertTriangleIcon, 
    InfoIcon, 
    CheckCircleIcon, 
    XCircleIcon
} from "lucide-react";

export default function TmpLibraryShowcase() {
    return (
        <div className="mx-4 space-y-12 pb-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold">UI Library Showcase</h1>
                <p className="text-muted-foreground">A <i>not at all</i> comprehensive overview of some UI components</p>
            </div>

            {/* Buttons Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Buttons</h2>
                
                {/* Button Variants */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Variants</h3>
                    <div className="flex flex-wrap gap-3">
                        <Button variant="default">Default</Button>
                        <Button variant="secondary">Secondary</Button>
                        <Button variant="muted">Muted</Button>
                        <Button variant="destructive">Destructive</Button>
                        <Button variant="warning">Warning</Button>
                        <Button variant="success">Success</Button>
                        <Button variant="info">Info</Button>
                        <Button variant="outline">Outline</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="link">Link</Button>
                    </div>
                </div>

                {/* Button Sizes */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Sizes</h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button size="icon"><PersonStandingIcon /></Button>
                        <Button size="inline">Inline</Button>
                        <Button size="xs">Extra Small</Button>
                        <Button size="sm">Small</Button>
                        <Button size="default">Default</Button>
                        <Button size="lg">Large</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        <InlineCode>inline</InlineCode> is custom - useful for inline text buttons like "click <Button size="inline" variant="link">here</Button> to continue".
                    </p>
                </div>

                {/* Ghost Variants */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Ghost Variants</h3>
                    <div className="flex flex-wrap gap-3">
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="ghost-secondary">Ghost Secondary</Button>
                        <Button variant="ghost-destructive">Ghost Destructive</Button>
                        <Button variant="ghost-warning">Ghost Warning</Button>
                        <Button variant="ghost-success">Ghost Success</Button>
                        <Button variant="ghost-info">Ghost Info</Button>
                        <Button variant="ghost-muted">Ghost Muted</Button>
                    </div>
                </div>

                {/* Outline Variants */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Outline Variants</h3>
                    <div className="flex flex-wrap gap-3">
                        <Button variant="outline">Outline</Button>
                        <Button variant="outline-secondary">Outline Secondary</Button>
                        <Button variant="outline-destructive">Outline Destructive</Button>
                        <Button variant="outline-warning">Outline Warning</Button>
                        <Button variant="outline-success">Outline Success</Button>
                        <Button variant="outline-info">Outline Info</Button>
                        <Button variant="outline-muted">Outline Muted</Button>
                    </div>
                </div>

                {/* Button States */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">States</h3>
                    <div className="flex flex-wrap gap-3">
                        <Button>Normal</Button>
                        <Button disabled>Disabled</Button>
                        <Button><PersonStandingIcon className="mr-2 h-4 w-4" />With Icon</Button>
                    </div>
                </div>
            </section>

            {/* Form Inputs Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Form Inputs</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Text Inputs */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Text Inputs</h3>
                        <div className="space-y-3">
                            <Input placeholder="Default input" />
                            <Input placeholder="Email input" type="email" />
                            <Input placeholder="Password input" type="password" />
                            <Input placeholder="Disabled input" disabled />
                            <Input placeholder="Input with value" defaultValue="Sample text" />
                        </div>
                    </div>

                    {/* Textarea */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Textarea</h3>
                        <div className="space-y-3">
                            <Textarea placeholder="Default textarea" />
                            <Textarea placeholder="Disabled textarea" disabled />
                            <Textarea placeholder="Textarea with content" defaultValue="This is some sample content in the textarea component." />
                        </div>
                    </div>
                </div>

                {/* Checkboxes and Switches */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Checkboxes</h3>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="checkbox1" />
                                <label htmlFor="checkbox1" className="text-sm font-medium">Default checkbox</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="checkbox2" defaultChecked />
                                <label htmlFor="checkbox2" className="text-sm font-medium">Checked checkbox</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="checkbox3" disabled />
                                <label htmlFor="checkbox3" className="text-sm font-medium text-muted-foreground">Disabled checkbox</label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Switches</h3>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <Switch id="switch1" />
                                <label htmlFor="switch1" className="text-sm font-medium">Default switch</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="switch2" defaultChecked />
                                <label htmlFor="switch2" className="text-sm font-medium">Checked switch</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="switch3" disabled />
                                <label htmlFor="switch3" className="text-sm font-medium text-muted-foreground">Disabled switch</label>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Badges Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Badges</h2>
                
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Badge Variants</h3>
                    <div className="flex flex-wrap gap-3">
                        <Badge variant="default">Default</Badge>
                        <Badge variant="secondary">Secondary</Badge>
                        <Badge variant="destructive">Destructive</Badge>
                        <Badge variant="outline">Outline</Badge>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Usage Examples</h3>
                    <div className="flex flex-wrap gap-3">
                        <Badge>New</Badge>
                        <Badge variant="destructive">Error</Badge>
                        <Badge variant="secondary">Beta</Badge>
                        <Badge variant="outline">Coming Soon</Badge>
                        <Badge>v2.1.0</Badge>
                        <Badge variant="secondary">Online</Badge>
                    </div>
                </div>
            </section>

            {/* Alerts Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Alerts</h2>
                
                <div className="space-y-4">
                    <Alert variant="default">
                        <InfoIcon className="h-4 w-4" />
                        <AlertTitle>Default Alert</AlertTitle>
                        <AlertDescription>
                            This is a default alert with some information for the user.
                        </AlertDescription>
                    </Alert>

                    <Alert variant="info">
                        <InfoIcon className="h-4 w-4" />
                        <AlertTitle>Information</AlertTitle>
                        <AlertDescription>
                            This is an informational alert that provides helpful context.
                        </AlertDescription>
                    </Alert>

                    <Alert variant="success">
                        <CheckCircleIcon className="h-4 w-4" />
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>
                            Your action was completed successfully!
                        </AlertDescription>
                    </Alert>

                    <Alert variant="warning">
                        <AlertTriangleIcon className="h-4 w-4" />
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                            Please review this information carefully before proceeding.
                        </AlertDescription>
                    </Alert>

                    <Alert variant="destructive">
                        <XCircleIcon className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            An error occurred while processing your request. Please try again.
                        </AlertDescription>
                    </Alert>
                </div>
            </section>

            {/* SwitchText Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">SwitchText <Badge variant="outline">Custom</Badge></h2>
                <p className="text-sm text-muted-foreground">
                    A custom Switch component that shows different labels based on state, with semantic color variants.
                </p>
                
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Color Variants</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <SwitchText checkedLabel="Default On" uncheckedLabel="Default Off" defaultChecked />
                            <p className="text-xs text-muted-foreground">variant="default"</p>
                        </div>
                        <div className="space-y-2">
                            <SwitchText variant="checkedGreen" checkedLabel="Enabled" uncheckedLabel="Disabled" defaultChecked />
                            <p className="text-xs text-muted-foreground">variant="checkedGreen"</p>
                        </div>
                        <div className="space-y-2">
                            <SwitchText variant="checkedYellow" checkedLabel="Warning On" uncheckedLabel="Warning Off" defaultChecked />
                            <p className="text-xs text-muted-foreground">variant="checkedYellow"</p>
                        </div>
                        <div className="space-y-2">
                            <SwitchText variant="checkedRed" checkedLabel="Danger On" uncheckedLabel="Danger Off" defaultChecked />
                            <p className="text-xs text-muted-foreground">variant="checkedRed"</p>
                        </div>
                        <div className="space-y-2">
                            <SwitchText variant="uncheckedGreen" checkedLabel="Off" uncheckedLabel="Safe" />
                            <p className="text-xs text-muted-foreground">variant="uncheckedGreen"</p>
                        </div>
                        <div className="space-y-2">
                            <SwitchText variant="uncheckedYellow" checkedLabel="Off" uncheckedLabel="Warning" />
                            <p className="text-xs text-muted-foreground">variant="uncheckedYellow"</p>
                        </div>
                        <div className="space-y-2">
                            <SwitchText variant="uncheckedRed" checkedLabel="Off" uncheckedLabel="Danger" />
                            <p className="text-xs text-muted-foreground">variant="uncheckedRed"</p>
                        </div>
                        <div className="space-y-2">
                            <SwitchText variant="redGreen" checkedLabel="Enabled" uncheckedLabel="Disabled" defaultChecked />
                            <p className="text-xs text-muted-foreground">variant="redGreen"</p>
                        </div>
                        <div className="space-y-2">
                            <SwitchText variant="greenRed" checkedLabel="Danger!" uncheckedLabel="Safe" />
                            <p className="text-xs text-muted-foreground">variant="greenRed"</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* InlineCode & TxAnchor Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Text Components <Badge variant="outline">Custom</Badge></h2>
                
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">InlineCode</h3>
                    <p className="text-sm">
                        Use <InlineCode>InlineCode</InlineCode> for inline code snippets like <InlineCode>npm install</InlineCode> or variable names like <InlineCode>myVariable</InlineCode>.
                    </p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">TxAnchor</h3>
                    <p className="text-muted-foreground">
                        Smart anchor component that handles internal navigation and external links properly.
                    </p>

                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Normal text size:</h4>
                        <p>
                            Lorem ipsum dolor <TxAnchor href="/players">Example</TxAnchor>: internal link.
                        </p>
                        <p>
                            Lorem ipsum dolor <TxAnchor href="https://github.com/tabarra/txAdmin">Example</TxAnchor>: external link.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Small text size (text-sm):</h4>
                        <p className="text-sm">
                            Lorem ipsum dolor <TxAnchor href="/dashboard">Example</TxAnchor>: internal link.
                        </p>
                        <p className="text-sm">
                            Lorem ipsum dolor <TxAnchor href="https://discord.gg/txAdmin">Example</TxAnchor>: external link.
                        </p>
                    </div>
                </div>
            </section>

            {/* DateTimeCorrected Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">DateTimeCorrected <Badge variant="outline">Custom</Badge></h2>
                <p className="text-sm text-muted-foreground">
                    Displays timestamps corrected for server/client clock drift. Hover for full date/time.
                </p>
                
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-6">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Date + Time (default)</p>
                            <DateTimeCorrected 
                                tsFetch={Date.now()} 
                                tsObject={Date.now() - 3600000} 
                                serverTime={Date.now()} 
                            />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Date only</p>
                            <DateTimeCorrected 
                                tsFetch={Date.now()} 
                                tsObject={Date.now() - 86400000 * 3} 
                                serverTime={Date.now()}
                                isDateOnly
                            />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">With clock drift warning</p>
                            <DateTimeCorrected 
                                tsFetch={Date.now()} 
                                tsObject={Date.now() - 3600000} 
                                serverTime={Date.now() + 600000}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* DynamicNewBadge Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">DynamicNewBadge & DynamicNewItem <Badge variant="outline">Custom</Badge></h2>
                
                <div className="space-y-4">
                    <Alert variant="info">
                        <InfoIcon className="h-4 w-4" />
                        <AlertTitle>Time-based visibility</AlertTitle>
                        <AlertDescription>
                            These components show content for a limited time after first view. The timestamp is stored in localStorage per feature name.
                            In dev mode (<InlineCode>showAdvanced</InlineCode>), they always show.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <h3 className="text-lg font-medium">DynamicNewBadge</h3>
                        <p className="text-sm text-muted-foreground">
                            Shows a "NEW" badge for X days (default 3) after first seen. Use for highlighting new features in menus/settings.
                        </p>
                        <div className="flex items-center gap-4 p-3 border rounded-lg">
                            <span>Feature Name</span>
                            <DynamicNewBadge featName="showcase-example-1" durationDays={365} />
                            <span className="text-muted-foreground">|</span>
                            <span>Another Feature</span>
                            <DynamicNewBadge featName="showcase-example-2" size="xs" durationDays={365} />
                        </div>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`<DynamicNewBadge featName="unique-feature-id" durationDays={14} />
<DynamicNewBadge featName="another-feature" size="xs" badgeText="BETA" />`}
                        </pre>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-medium">DynamicNewItem</h3>
                        <p className="text-sm text-muted-foreground">
                            Wrapper that conditionally renders children for X days. Use for temporary promotional content or feature highlights.
                        </p>
                        <div className="p-3 border rounded-lg">
                            <DynamicNewItem featName="showcase-example-3" durationDays={365}>
                                <Alert variant="success">
                                    <CheckCircleIcon className="h-4 w-4" />
                                    <AlertTitle>This entire alert is wrapped in DynamicNewItem</AlertTitle>
                                    <AlertDescription>It will disappear after the duration expires.</AlertDescription>
                                </Alert>
                            </DynamicNewItem>
                        </div>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`<DynamicNewItem featName="promo-banner" durationDays={7}>
    <Alert>Your promotional content here</Alert>
</DynamicNewItem>`}
                        </pre>
                    </div>
                </div>
            </section>
        </div>
    );
}
