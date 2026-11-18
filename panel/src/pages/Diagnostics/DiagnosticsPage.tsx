import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { ProcessTree } from "@/pages/Diagnostics/process-tree";
import { numberToLocaleString } from "@/lib/utils";
import { DiagnosticsInfoTree } from "./info-tree";
import { DiagnosticsInfoList } from "./info-list";
import { ReportDialog } from "./report-dialog";
import type { DiagnosticsDataApiResp } from "@shared/diagnosticsTypes";
import useSWR from "swr";
import { useBackendApi } from "@/hooks/fetch";
import { useState } from "react";
import TxAnchor from "@/components/TxAnchor";
import CardContentOverlay from "@/components/CardContentOverlay";


export default function DiagnosticsPage() {
    const [reportDialogOpen, setReportDialogOpen] = useState(false);

    const getDataApi = useBackendApi<DiagnosticsDataApiResp>({
        method: 'GET',
        path: '/diagnostics/getDiagnostics',
    });

    const swr = useSWR('/diagnostics/getDiagnostics', async () => {
        const data = await getDataApi({});
        if (!data) throw new Error('empty_response');
        if ('error' in data) throw new Error(data.error);
        return data;
    }, { revalidateOnFocus: false });


    if (!swr.data) {
        return (
            <div className="w-full h-1/3 relative">
                <CardContentOverlay
                    error={swr.error?.message}
                    loading={swr.isValidating ? 'Loading...' : false}
                    className="bg-transparent dark:bg-transparent"
                />
            </div>
        )
    }
    return (
        <div className="w-full space-y-4">
            {/* Diagnostics Report Card */}
            {/* FIXME:NEXT:UPDATE: reenable this */}
            {/* <Card className="bg-info-hint border-info">
                <CardHeader className="bg-transparent pb-2">
                    <CardTitle>Diagnostics Report</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground">
                            To receive support, it is recommended that you send the diagnostics data directly to the
                            Support Team. <br />
                            After that, share the report ID with the support team in <TxAnchor
                                href="https://discord.gg/uAmsGa2"
                                className="font-semibold tracking-wide text-primary"
                            >
                                discord.gg/txAdmin
                            </TxAnchor>.
                        </p>
                        <Button
                            className="whitespace-nowrap"
                            onClick={() => setReportDialogOpen(true)}
                        >
                            Review Details & Send Data
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card> */}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="space-y-4">
                    {/* Runtime Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>txAdmin Runtime</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Object.entries(swr.data.runtime).map(([key, value]) => (
                                <DiagnosticsInfoTree key={key} title={key} tree={value} />
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    {/* Host Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Host</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DiagnosticsInfoList list={swr.data.host} />
                        </CardContent>
                    </Card>

                    {/* Server Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Server</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DiagnosticsInfoList list={swr.data.server} />
                        </CardContent>
                    </Card>

                    {/* Processes Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Processes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ProcessTree processes={swr.data.processes} />
                        </CardContent>
                    </Card>

                    <div className="italic text-center text-sm text-muted-foreground">
                        Loaded in {numberToLocaleString(swr.data.loadTime)} ms
                    </div>
                </div>
            </div>

            <ReportDialog
                open={reportDialogOpen}
                onOpenChange={setReportDialogOpen}
            />
        </div>
    )
}
