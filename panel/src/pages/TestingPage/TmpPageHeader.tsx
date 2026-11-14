import { PageHeader, PageHeaderChangelog, PageHeaderLinks } from "@/components/page-header";
import { AmpersandIcon, Settings2Icon } from "lucide-react";

const Divider = () => <AmpersandIcon className="size-6 mx-auto" />
const Wrapper = ({ children }: { children: React.ReactNode }) => <div className="border border-transparent hover:border-fuchsia-500">{children}</div>

export default function TmpPageHeader() {
    return (
        <div className="w-full h-full flex flex-col gap-4">
            <Wrapper>
                <PageHeader title="Simple" icon={<Settings2Icon />} />
            </Wrapper>
            <Divider />
            <Wrapper>
                <PageHeader title="Simple + custom" icon={<Settings2Icon />}>
                    <div className="text-xs">
                        example
                    </div>
                </PageHeader>
            </Wrapper>
            <Divider />
            <Wrapper>
                <PageHeader title="Simple + links" icon={<Settings2Icon />}>
                    <PageHeaderLinks
                        topLabel="Documentation"
                        topLink="https://github.com/citizenfx/txAdmin"
                        bottomLabel="Support"
                        bottomLink="https://txadmin.gg/discord"
                    />
                </PageHeader>
            </Wrapper>
            <Divider />
            <Wrapper>
                <PageHeader title="Simple + changelog" icon={<Settings2Icon />}>
                    <PageHeaderChangelog
                        changelogData={[{ author: 'tabarra', keys: [], ts: Date.now() }]}
                    />
                </PageHeader>
            </Wrapper>
            <Divider />
            <Wrapper>
                <PageHeader
                    icon={<Settings2Icon />}
                    title="Breadcrumbs"
                    parentName="Parent"
                    parentLink="/parent"
                />
            </Wrapper>
            <Divider />
            <Wrapper>
                <PageHeader
                    icon={<Settings2Icon />}
                    title="Breadcrumbs"
                    parentName="Parent"
                    parentLink="/parent"
                >
                    <PageHeaderChangelog
                        changelogData={[{ author: 'tabarra', keys: [], ts: 1741168243520 }]}
                    />
                </PageHeader>
            </Wrapper>
            <Divider />
            <Wrapper>
                <PageHeader title="Simple + empty changelog" icon={<Settings2Icon />}>
                    <PageHeaderChangelog
                        changelogData={[]}
                    />
                </PageHeader>
            </Wrapper>
        </div>
    )
}
