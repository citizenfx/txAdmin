import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useWarningBar from "@/hooks/useWarningBar";

export default function TmpWarningBarState() {
    const {
        offlineWarning, setOfflineWarning,
        txUpdateData, setTxUpdateData,
        fxUpdateData, setFxUpdateData,
    } = useWarningBar();

    return (
        <Card className="w-min">
            <CardHeader>
                <CardTitle>Warning Bar States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2 divide-y-2 rounded border p-2">
                    <div className="flex justify-start gap-3">
                        <Button size="sm" onClick={() => setOfflineWarning(false)}>
                            Socket On
                        </Button>
                        <Button size="sm" onClick={() => setOfflineWarning(true)}>
                            Socket Off
                        </Button>
                    </div>
                    <pre className="bg-muted p-2">
                        {JSON.stringify(offlineWarning, null, 2)}
                    </pre>
                </div>

                <div className="space-y-2 divide-y-2 rounded border p-2">
                    <div className="flex justify-start gap-3">
                        <Button size="sm" onClick={() => setTxUpdateData({
                            version: '7.0.1',
                            isImportant: false,
                        })}>
                            txa Minor Update
                        </Button>
                        <Button size="sm" onClick={() => setTxUpdateData({
                            version: '8.0.0',
                            isImportant: true,
                        })}>
                            txa Major Update
                        </Button>
                        <Button size="sm" onClick={() => setTxUpdateData(undefined)}>
                            txa No Update
                        </Button>
                    </div>
                    <pre className="bg-muted p-2">
                        {JSON.stringify(txUpdateData, null, 2)}
                    </pre>
                </div>

                <div className="space-y-2 divide-y-2 rounded border p-2">
                    <div className="flex justify-start gap-3">
                        <Button size="sm" onClick={() => setFxUpdateData({
                            version: '7.0.1',
                            isImportant: false,
                        })}>
                            fxs Minor Update
                        </Button>
                        <Button size="sm" onClick={() => setFxUpdateData({
                            version: '8.0.0',
                            isImportant: true,
                        })}>
                            fxs Major Update
                        </Button>
                        <Button size="sm" onClick={() => setFxUpdateData(undefined)}>
                            fxs No Update
                        </Button>
                    </div>
                    <pre className="bg-muted p-2">
                        {JSON.stringify(fxUpdateData, null, 2)}
                    </pre>
                </div>
            </CardContent>
        </Card>
    );
}
