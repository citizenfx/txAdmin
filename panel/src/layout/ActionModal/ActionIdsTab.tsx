import { ModalTabInner } from "@/components/modal-tabs";
import type { DatabaseActionType } from "../../../../core/modules/Database/databaseTypes";
import MultiIdsList from "@/components/MultiIdsList";


export default function ActionIdsTab({ action }: { action: DatabaseActionType }) {
    return (
        <ModalTabInner className="flex flex-col gap-4">
            <MultiIdsList
                type='id'
                src='action'
                idsOffline={action.ids}
            />
            <MultiIdsList
                type='hwid'
                src='action'
                idsOffline={('hwids' in action && action.hwids) ? action.hwids : []}
            />
        </ModalTabInner>
    );
}
