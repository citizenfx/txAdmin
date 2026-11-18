import { Button } from "@/components/ui/button";
import { PersonStandingIcon } from "lucide-react";
import TmpHexHslConverter from "./TmpHexHslConverter";
import TxAnchor from "@/components/TxAnchor";

export default function TmpColors() {
    return <>
        <div className="mx-4 space-y-8">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Color System Overview</h2>
                <p className="text-muted-foreground text-sm">Semantic colors, hint backgrounds, and inline text variants</p>
            </div>

            <div className="flex flex-wrap gap-8">
                {/* Base Semantic Colors */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold mb-3">Base Colors</h3>
                    <div className="space-y-2 w-56">
                        <div className="w-full p-3 bg-primary text-primary-foreground rounded">primary</div>
                        <div className="w-full p-3 bg-secondary text-secondary-foreground rounded">secondary</div>
                        <div className="w-full p-3 bg-muted text-muted-foreground rounded">muted</div>
                        <div className="w-full p-3 bg-info text-info-foreground rounded">info</div>
                        <div className="w-full p-3 bg-success text-success-foreground rounded">success</div>
                        <div className="w-full p-3 bg-warning text-warning-foreground rounded">warning</div>
                        <div className="w-full p-3 bg-destructive text-destructive-foreground rounded">destructive</div>
                        <div className="w-full p-3 bg-accent text-accent-foreground rounded">accent</div>
                        <div className="w-full p-3 bg-card text-card-foreground border rounded">card + border</div>
                    </div>
                </div>

                {/* Hint Colors - For Toast/Warning Backgrounds */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold mb-3">Hint Colors</h3>
                    <p className="text-sm text-muted-foreground mb-3">Used for toast/warning backgrounds</p>
                    <div className="space-y-2 w-56">
                        <div className="w-full p-3 bg-info-hint rounded border border-info/70">
                            <span className="font-medium">info-hint</span>
                            <br />
                            <span className="text-sm opacity-75">Toast background</span>
                        </div>
                        <div className="w-full p-3 bg-success-hint text-foreground rounded border border-success/70">
                            <span className="font-medium">success-hint</span>
                            <br />
                            <span className="text-sm opacity-75">Toast background</span>
                        </div>
                        <div className="w-full p-3 bg-warning-hint text-foreground rounded border border-warning/70">
                            <span className="font-medium">warning-hint</span>
                            <br />
                            <span className="text-sm opacity-75">Toast background</span>
                        </div>
                        <div className="w-full p-3 bg-destructive-hint text-foreground rounded border border-destructive/70">
                            <span className="font-medium">destructive-hint</span>
                            <br />
                            <span className="text-sm opacity-75">Toast background</span>
                        </div>
                    </div>
                </div>

                {/* Inline Text Colors */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold mb-3">Inline Text Colors</h3>
                    <p className="text-sm text-muted-foreground mb-3">Better contrast for text on light mode</p>
                    <div className="space-y-2 w-56">
                        {/* On default background */}
                        <div className="space-y-2 p-3 bg-background border rounded">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">On Background</div>
                            <div className="text-info-inline">info-inline text</div>
                            <div className="text-success-inline">success-inline text</div>
                            <div className="text-warning-inline">warning-inline text</div>
                            <div className="text-destructive-inline">destructive-inline text</div>
                        </div>

                        {/* On card background */}
                        <div className="space-y-2 p-3 bg-card border rounded">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">On Card</div>
                            <div className="text-info-inline">info-inline text</div>
                            <div className="text-success-inline">success-inline text</div>
                            <div className="text-warning-inline">warning-inline text</div>
                            <div className="text-destructive-inline">destructive-inline text</div>
                        </div>

                        {/* Comparison with regular colors */}
                        <div className="space-y-2 p-3 bg-card border rounded">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Regular vs Inline</div>
                            <div className="flex justify-between text-sm">
                                <span className="text-destructive">regular</span>
                                <span className="text-destructive-inline">inline</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-warning">regular</span>
                                <span className="text-warning-inline">inline</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Button Variants by Color */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-3">Button Variants by Color</h3>

                    {/* Primary/Default */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Primary</h4>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="default">default</Button>
                            <Button size="sm" variant="outline">outline</Button>
                            <Button size="sm" variant="ghost">ghost</Button>
                        </div>
                    </div>

                    {/* Secondary */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Secondary</h4>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary">secondary</Button>
                            <Button size="sm" variant="outline-secondary">outline-secondary</Button>
                            <Button size="sm" variant="ghost-secondary">ghost-secondary</Button>
                        </div>
                    </div>

                    {/* Destructive */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Destructive</h4>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="destructive">destructive</Button>
                            <Button size="sm" variant="outline-destructive">outline-destructive</Button>
                            <Button size="sm" variant="ghost-destructive">ghost-destructive</Button>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Warning</h4>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="warning">warning</Button>
                            <Button size="sm" variant="outline-warning">outline-warning</Button>
                            <Button size="sm" variant="ghost-warning">ghost-warning</Button>
                        </div>
                    </div>

                    {/* Success */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Success</h4>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="success">success</Button>
                            <Button size="sm" variant="outline-success">outline-success</Button>
                            <Button size="sm" variant="ghost-success">ghost-success</Button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Info</h4>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="info">info</Button>
                            <Button size="sm" variant="outline-info">outline-info</Button>
                            <Button size="sm" variant="ghost-info">ghost-info</Button>
                        </div>
                    </div>

                    {/* Muted */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Muted</h4>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="muted">muted</Button>
                            <Button size="sm" variant="outline-muted">outline-muted</Button>
                            <Button size="sm" variant="ghost-muted">ghost-muted</Button>
                        </div>
                    </div>

                    {/* Special Variants */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Special</h4>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" disabled>disabled</Button>
                            <Button size="sm"><PersonStandingIcon className="w-4 h-4 mr-1" />with icon</Button>
                            <Button size="icon" variant="outline"><PersonStandingIcon /></Button>
                            <Button size="sm" variant="link">link</Button>
                            <TxAnchor href="https://www.google.com">external link</TxAnchor>
                        </div>
                    </div>

                    {/* Anchors */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Anchors</h4>
                        <div className="flex flex-wrap gap-2">
                            <TxAnchor href="/settings">internal link</TxAnchor>
                            <TxAnchor href="https://www.google.com">external link</TxAnchor>
                        </div>
                    </div>
                </div>
            </div>

            {/* Color Converter Tool */}
            <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Color Converter</h3>
                <TmpHexHslConverter />
            </div>
        </div>
    </>;
}
