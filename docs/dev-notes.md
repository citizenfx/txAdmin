Legend:
- [ ] -> Not started
- [x] -> Completed
- [!] -> Release Blocker
- [?] -> Lower priority or pending investigation

## Before Updating:
- Search for all FIXME:NEXT:UPDATE
- Search for all FIXME:REMOVE:NEXT:UPDATE
- Re-enable diagnostics report


## Newer TODOs
- [ ] be able to VIEW your own permissions on the admins page 
- [ ] save a log of the previous server data paths
- [ ] Use [GetPlayerPeerStatistics](https://docs.fivem.net/natives/?_0x9A928294) somewhere
- [ ] Be able to set a nickname to a player
    - Ref: https://discord.com/channels/577993482761928734/1459523232163041464/1459523232163041464
- [?] Check: E:\TMP\test-cache-size\index.ts
    - I don't recall what is that tho 🤷‍♀️
    - Maybe a way to show to the users the size of their assets

## Feat
- [x] Option to delete player identifiers
    - Ref: https://github.com/tabarra/txAdmin/issues/751
- [ ] Option to delete "expire now" bans
- [ ] Option to delete bans/warns

## Small feat

## Fixes
- [!] radix select/dropdown inside dialog
    - test the settings one as well as the ban form inside the player modal
- [ ] the console lines are shorter on first full render (ctrl+f5) and on f5 it fixes itself
    - didn't happen in v7.2.2, not sure about v7.3.2
    - doesn't seem to be neither fontSize nor lineHeight
    - NOTE: this might solve itself with the WebGL renderer update, so try that first
- [!] if you put the cfg path in the server data path (as in, full path including `server.cfg`), the error message is silly suggesting `.` as the correct path. Instead, it should just detect the server.cfg file and remove it, without warning.
- [!] add new env var to disable tty titles
- [ ] change deployer path picking because `FiveMBasicServerCFXDefault_1B7632.base` is obnoxious
    - [ ] try to avoind doing the hex timestamp, instead just adding a suffix for conflict resolution like windows does
    - [ ] maybe hardcode something for the cfx default recipes to shorten it, or some generic solution
    - [ ] maybe just lowercase it all, with `-` for separation

## Other stuff
- [ ] Review & merge manually https://github.com/tabarra/txAdmin/pull/1004/files
- [!] add stats tracking for the framework team (ask them, idk)
- [!] package updates - test radix stuff
- [!] commit stashed stuff
- [!] check txAdmin-private
- [ ] implement `cleanFullPath.ts` in settings save ui & api for comparison consistency
    - [ ] add it to `setup/save.js -> handleValidateLocalDataFolder()` as well
- probably use the new natives:
    - GET_PLAYER_PEER_STATISTICS 
    - ADD_CONVAR_CHANGE_LISTENER
    - GET_CONVAR_FLOAT
    - GET_CONVAR_BOOL


=======================================================================




- [ ] Layout refactor:
    - não ter espaço em branco abaixo do header
    - `2xl:mx-8 min-w-96` for all pages? (change on MainShell)
    - checar tudo com iframe
    - checar live console (e layers)
    - checar modais
    - checar sheets
    - checar warning bar
    - tirar o servername do menu de server?
    - tirar servername do mobile header?
- NOTE: resoluções mobile
    - 360x510 menor razoável
    - 390x670 mais comum

- [ ] use os.networkInterfaces()?


## Chores + boring stuff
- [ ] fully deprecate the ConVars and `txAdminZapConfig.json`
    - reorganize the globalData.ts exports after that
    - might not even need the separated `getXxxVars.ts` files after that
    - still detect and issue an warning about its deprecation
- [ ] rename "citizenfx" to "fivem" everywhere. Or maybe cfx.re?
- [ ] replace lodash's cloneDeep with one of:
    - https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone (node 17+)
    - https://www.npmjs.com/package/rfdc
- [ ] switch to `game 'common'` and remove `rdr3_warning`
- [ ] check netid uint16 overflow
    - right now the `mutex#netid` is being calculated on [logger](/core/modules/Logger/handlers/server.js#L148)
    - detect netid rollover and set some flag to add some identifiable prefix to the mutex?
    - increase mutex to 6 digits?
    - `/^(?<mutex>\w{5})#(?<netid>\d{1,6})(?:r(?<rollover>\d{1,3}))?$/`
    - write parser, which will return the groups, defaulting rollover to 0
    - NOTE: semver major is good opportunity for this change 
- [ ] check if it makes sense to allow the txAdmin thread to run more than every 50ms
    - node 22 branch -> code/components/citizen-server-monitor/src/MonitorInstance.cpp:307
- [ ] see if it's a good idea to replace `getHostStats.js` with si.osInfo()
    - same for getting process load, instead of fixing the wmic issue
- [ ] xterm changes
    - [ ] deprecate canvas renderer and use the webgl instead
    - [ ] check compatibility with text scaling - `window.devicePixelRatio`
    - [ ] maybe update xterm to v5.6
    - ref: https://github.com/xtermjs/xterm.js/issues/3864
    - ref: https://github.com/xtermjs/xterm.js/issues/4779
    - ref: https://github.com/xtermjs/xterm.js/milestone/78
    - [ ] FIXME: Updating to WebGL might fix the font loading race condition
        - Check the comments on LiveConsolePage.tsx
- [ ] fix circular dependencies
    - search for `circular_dependency`
    - use `madge` (command at the bottom of file)
- [ ] migrate shadcn to use the radix monorepo vis its migration tool
    - ref: https://x.com/shadcn/status/1932819652524355998

## Previous bugs
- [ ] use `ScanResourceRoot()`
    - `ScanResourceRoot('xxx/resources/', (data: object) => {...});`
    - test if a `while true do end` on a resource manifest would cause tx to hang
    - make headless scan mode, running fxs+txa and getting the results

## Pending Improvements
- [ ] Settings Page:
    - [ ] bake in the defaults, so so SwitchText's don't show false initial value
    - [ ] check for pending changes on the navigate-away buttons
    - [ ] use jsonForgivingParse for embed jsons and custom locale
    - [ ] use the standalone json editor page
    - [ ] if you type `E:\FiveM\txData\default.base` in the fxserver settings it will save but show as unsaved because the saved was the `cleanPath()` version `E:/FiveM/txData/default.base`
- [ ] Player drops page
    - [ ] fix: blurred chart lines
        - `imageRendering: 'pixelated'` might fix it
        - try messing with the canvas size +- 0.5px
    - [ ] review page layout: 
        - [ ] make it less card-y
        - [x] fix crashes table is not responsive
        - [x] fix scroll popping in/out
    - [x] switch from `useSWRImmutable` to `useSWR`
    - [ ] add drilldown interval buttons
- Dashboard stuff:
    - [ ] add testing for getServerStatsData
    - full perf chart:
        - [ ] disable `<...>.curve(d3.curveNatural)` on `playerLineGenerator` if more than 20 players?
        - [ ] buttons to show memory usage, maybe hide player count
        - [ ] calculate initial zoom of 30h
            - Initial zoom code: https://observablehq.com/@d3/zoomable-area-chart?intent=fork
        - [ ] use semi-transparent arrows on the sides to indicate there is more to pan to when hovering
        - [ ] show server close reason
        - [ ] don't clear svg on render, use d3 joins
    - Metrics.svRuntime:
        - [ ] write log optimizer and remove the webroute 30h filter
            - [ref](/core/modules/Metrics/svRuntime/config.ts#L33)
            - maybe use rounded/aligned times?
            - check how this code works `d3.timeHours(new Date(1715741829000), new Date())[0]`
    - thread perf chart:
        - [ ] add the good/bad markers?
        - [ ] fix getMinTickIntervalMarker behavior when 0.2
            - maybe just check if it's the hardcoded or color everything blue
            - [ref](/core/modules/WebServer/wsRooms/dashboard.ts#L26)
        - [ ] color should change correctly at the min interval marker point
        - [ ] change the bg color to the color of the average ticket with heavy transparency?
- [ ] being able to /goto, /tpm while on noclip
- [ ] add stats tracking for runtime usage
    - fw team request, probably a new native `GetResourceRuntimes(resName)`

## Database Changes
- [ ] migration to change "revocation" to optional
    - [ ] test the `getRegisteredActions()` filter as object, doing `{revocation: undefined}`
- [ ] add player name history
- [ ] add player session time tracking
    - [ref](/core/playerLogic/playerClasses.ts#L281)
    - [ ] create simple page to list top 100 players by playtime in the last 30d, 14d, 7d, yesterday, today
    - if storing in a linear UInt16Array, 100k players * 120d * 4bytes per date = 48mb
- [ ] on migration, sort all the actions and players, due to the search sorting bug



## other stuff
- Consider using Blob
    - https://developer.mozilla.org/en-US/docs/Web/API/Blob
    - https://chatgpt.com/c/670bf1f6-8ee4-8001-a731-3a219266d4c1


## Refactor: AdminVault
- Adminvault:
    - migrar admins.json
    - pra cada admin do admins.json
    - const admin = new StoredAdmin(rawObj)
- Middleware:
    storedAdmin.getAuthed(csrfToken): AuthedAdmin
- class AuthedAdmin extends StoredAdmin
    - has métodos to edit the admin



## Refactor: Web Route Validation
> validator, it will know if web or api to give the correct response type
> if invalid, it will send the response and return undefined
```ts
import { z, ZodSchema, infer as zodInfer } from "zod";
const checkParse = <T extends ZodSchema<any>>(
  schema: T,
  data: unknown
): zodInfer<T> | undefined => {
  const result = schema.safeParse(data);
  return result.success ? result.data : undefined; //maybe return ZodError instead
};
const userSchema = z.object({
  name: z.string(),
  age: z.number(),
});
const data = { name: "Alice", age: 30 };
const result = checkParse(userSchema, data);
//    /\ Type: { name: string; age: number } | undefined

//Now, apply that to create something for the ctx
const params = ctx.getParams(schema: ZodInstance, errorMessage?: string | false) //false means no auto resp
const query = ctx.getQuery(/*...*/)
const body = ctx.getBody(/*...*/)
if (!params || !query || !body) return; //error resp already sent
```
```ts
// NOTE: current code
const paramsSchemaRes = paramsSchema.safeParse(ctx.params);
const bodySchemaRes = bodySchema.safeParse(ctx.request.body);
if (!paramsSchemaRes.success || !bodySchemaRes.success) {
    return sendTypedResp({
        type: 'error',
        md: true,
        title: 'Invalid Request',
        msg: fromZodError(
            paramsSchemaRes.error ?? bodySchemaRes.error,
            { prefix: null }
        ).message,
    });
}
```



## Other annoying stuff to do
- [ ] headless deployer, without instantiating TxAdmin
- [ ] remove `fs-extra` - right now only used in deployer and setup
- [ ] create a global (or console?) `emsg(e: unknown)` that gets the message from an Error, and returns its message
    - replace all `(error as Error).message` and `(error as any).message`
- [ ] include `list-dependencies.js` as part of the test workflow
    - https://bun.sh/docs/api/transpiler#scan
    - improve to read the parent package deps
    - exit 1 on error
    - detect circular imports
- [ ] testing
    - use playwright
    - [ ] use https://mswjs.io/docs/getting-started
    - [ ] write some automated tests for the auth logic and middlewares
- [ ] ctrl+f doesn't work in the player modal anymore, if on the player or history pages
    - criar um estado "any modal open" pra desabilitar todos hotkeys das páginas?
- [ ] add support for `sv_prometheusBasicAuthUser` & `sv_prometheusBasicAuthPassword`
- [ ] update tailwind

## Refactor: Formatting + Linting
- [ ] fix the eslint config + tailwind sort
    - [alternative](https://biomejs.dev/linter/rules/use-sorted-classes/)
    - search the notes below for "dprint" and "prettier"
    - check how the typescript repo uses dprint
    - use `.git-blame-ignore-revs`
- maybe biome?
- Maybe prettier for all files except ts/js which could be in dprint
- Use the tailwind sorter plugin
- When running prettier, add ignore to the imported external files
https://prettier.io/docs/en/integrating-with-linters.html
https://tailwindcss.com/blog/automatic-class-sorting-with-prettier
- [ ] lua file changes (after PR merges)
    - 4 spaces
    - Upper case for globals
    - alt+shift+f
    - `.git-blame-ignore-revs`

=======================================================================


## Next Up
- Kick as punishment might be needed since minimum ban is 1 hour, possible solutions:
    - Allow for ban minutes
    - Add a "timeout" button that brings a prompt with 1/5/15/30 mins buttons
    - Add a checkbox to the kick modal to mark it as a punishment

- [ ] rethink the flow of opening the menu `/tx <id>` and teleporting to targets
    - need to use mouse, would be better if keyboardo nly
    - the buttons need to be bigger, and tab-selectable, or hotkeys
    - 💡 E se na main window do tx tivesse um <Command>, então vc pode só `F1 > tp 123 > enter` e seria tão rápido quanto usar o chat?
    - 💡 Se abrir o menu via /tx e não for redm, avisar que é melhor fazer bind

- [ ] live console
    - [ ] if socket connects but no data received, add a warning to the console and wipe it after first write
    - [ ] persistent cls via ts offsets
        - make sure it accounts for empty lines created by pressing enter on empty input
    - [ ] improve the bufferization to allow just loading most recent "block" and loading prev blocks via button
    - [ ] console nav button to jump to server start or errors? 
        - Or maybe filter just error lines (with margin)
        - Or maybe even detect all channels and allow you to filter them, show dropdown sorted by frequency

- [ ] Create txCore.logger.system
    - replaces the configChangelog.json
    - implements server.cfg changelog
    - maybe use jsonl, or maybe literally use SQLite
    - kinda replaces txCore.logger.admin
    - on txadmin.exe, maybe implement some type of file signature
    - for sure create a logs page with filter by admin, but dont overcomplicate

- [ ] add average session time tracking to Metrics.playerDrop
- [ ] track resource download times?

- [ ] fazer validação dos dados do banco usando a versão compilada do zod
    - acho que tem essa ferramenta no playground do https://github.com/sinclairzx81/typebox

- [ ] locale file optimization - build 8201 and above
- [ ] easter egg???
    - some old music? https://www.youtube.com/watch?v=nNoaXej0Jeg
    - Having the menu protest when someone fixes their car too much in a short time span?
    - Zeus or crazy thunder effects when someone spams no clip?
    - Increasingly exciting 'tada' sounds when someone bans multiple people in a short time span? (ban 1: Ooh.. / ban 2: OOooh.. / ban 3: OOOOOHHH!)

- [ ] remove more pending DynamicNewBadge/DynamicNewItem (settings page as well)
- [ ] reevaluate globals?.tmpSetHbDataTracking
- [ ] fix socket.io multiple connections - start a single instance when page opens, commands to switch rooms
- [ ] considering lua54 is enabled by default, use new options
- [ ] test `node_version '22'`

- [ ] build: generate fxmanifest files list dynamically
    - node 22 use fs.glob
- [ ] fix remaining imgur links
- [ ] update docs on development?
- [ ] rename to de-capitalize components files that have multiple exports 
- [ ] instead of showing cfg errors when trying to start server, just show "there are errors in your cfg file" and link the user to the cfg editor page
- [ ] break down the discord /info command in /info and /admininfo?
- [ ] enable nui strict mode
    - check if the menu -> tx -> iframe -> legacy iframe is not working
    - check both canary and prod builds
- [ ] Implement `GET_RESOURCE_COMMANDS` available in b12739
    - Ref: https://github.com/citizenfx/fivem/pull/3012
- [ ] cfg parser: resource relative read errors shouldn't trigger warnings
- [ ] check again for the need of lazy loading
- [ ] put in server name in the login page, to help lost admins notice they are in the wrong txAdmin
- [ ] Try to replace all the host stats/data with stuff from the SI lib (eg `systeminformation.processLoad()`).
    - They are already using GWMI: https://github.com/sebhildebrandt/systeminformation/issues/616
    - Pay attention to the boot and shutdown comments
    - NOTE: keep in mind the processor time vs utility difference:
        - https://github.com/citizenfx/fivem/commit/034acc7ed47ec12ca4cfb64a83570cad7dde8f0c
        - https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/cpu-usage-exceeds-100
    - NOTE: Old ref:
        - update stuff that requires WMIC to use PS command directly
        - issue: https://github.com/tabarra/txAdmin/issues/970#issuecomment-2308462733
        - new lib, same dev: https://www.npmjs.com/package/pidusage-gwmi
        - https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/07-working-with-wmi?view=powershell-7.2

- After Node 22:
    - check all `.npm-upgrade.json` for packages that can now be updated
    - Use `/^\p{RGI_Emoji}$/v` to detect emojis 
        - ref: https://v8.dev/features/regexp-v-flag
        - remove `unicode-emoji-json` from dependencies
        - update cleanPlayerNames
    - it will support native bindings, so this might work:
        - https://www.npmjs.com/package/fd-lock
    - change deployer and some other path manipulations to use `path.matchesGlob`
    - replace all `global.*` to `globalThis.*`
    - use `@tsconfig/node22`
    - Update discord.js and remove the hacky error catching solution 
        - ref: https://github.com/discordjs/discord.js/issues/9621#event-9828143455


- [ ] Migrate all log routes
- [ ] Add download modal to log pages

- [ ] Migrate freecam to use IsRawKeyPressed instead of the GTA references

- [ ] Playerlist: implement basic tag system with filters, sorting and Fuse.js
    - the filter dropdown is written already, check `panel/src/layout/playerlistSidebar/Playerlist.tsx`
    - when filterString is present, disable the filter/sort drowdown, as it will show all results sorted by fuse.js
    - might be worth to debounce the search
    - add tags to the players page search box (separate dropdown?)
    - maybe https://shadcnui-expansions.typeart.cc/docs/multiple-selector

- [ ] maybe use [this lib](https://www.npmjs.com/package/ntp-time-sync) to check for clock skew so I can remove the complexity of dealing with possible desync between core and ui on player modal, scheduler, etc;
    - even better: clients2.google.com/time/1/current - there are alternatives
- [ ] slide gesture to open/close the sidebars on mobile
- [ ] new restart schedule in status card
- [ ] ask framework owners to use `txAdmin-locale`



=======================================================================


## Next Page Changes:
### CFG Editor:
- multiple cfg editors
- add backup file to txdata, with the last 100 changes, name of the admin and timestamp

### Setup:
- don't ask for server data location, list txData subfolders and let the user pick or specify
- don't ask for cfg location, assume server.cfg and let the user change

### Master Actions:
- reset fxserver - becomes server add/remove/edit, or just an option in settings -> fxserver
- clean database - "bulk changes" button at the players page
- revoke whitelists - button to whitelist pages
- option to revoke all bans/warns (Issue #910)

### Admin manager:
- stats on admins
    - total count of bans/warns
    - counts of bans/warns in the last 7, 14, 28d
    - revocation %
    - bans/warns %

### Resources:
- release v1:
    - should be stateful, with websocket
    - layout inspired in code editors
    - left sidebar with resource folders, no resources, with buttons to start/stop/restart/etc
    - search bar at the top, searches any folder, has filters
    - filters by default, running, stopped
    - main content will show the resources of the selected folder OR "recently added"
- release v2:
    - by default show only "recently added" resources
    - each resoruce need to have:
        - warning for outdated, button to update
        - warning for script errors
        - performance stats
        - option to add/remove from auto boot
        - option to auto restart on change (dev mode)
        - button to see related insights (http calls, events, etc?)

### Whitelist:
- remove the wl pending join table
- add a "latest whitelists" showing both pending and members (query players + pending and join tables)
- don't forget to keep the "add approval" button
- bulk actions button
    - bulk revoke whitelist

### Action Modal:
- feat requests:
    - be able to delete bans/warns with new permission (Issue #751)
    - top server asked for the option to edit ban duration (expire now / change)
    - Thought: need to add an edit log like the one we have for player notes
    - Thought: maybe we could use some dedicated icons for Expired, Edited, Revoked

### Server Insights page ideas:
- resource load times
- resource streamed assets
- biggest events, or resources kbps out? something to help see which resource is bottlenecking the network
    - apparently this can be done in scheduler quite easily by modifying the definition of `TriggerClientEvent`
- http requests (grouped by resource, grouped by root domain or both?)
    - https://publicsuffix.org/list/
    - https://www.npmjs.com/search?q=effective%20domain
    - https://www.npmjs.com/package/parse-domain
    - https://www.npmjs.com/package/tldts
- performance chart with ram usage
- player count (longer window, maybe with some other data)
    - show the player count at the peaks
- histogram of session time
- chart of new players per day
- top players? 
- map heatmap?!
- player disconnect reasons
- something with server log events like chat messages, kills, leave reasons, etc?
- we must find a way to show player turnover and retention, like % that come back, etc

=======================================================================



### Improved scheduler precision
Talvez mudar a abordagem pra ser uma array e toda vez que a distância até o primeiro item for zero, executar a ação e dar um shift nos valores?
Exemplo:
```js
[
    {time: "12:00", temp: false, skipped: false},
    {time: "18:00", temp: false, skipped: false},
    {time: "22:00", temp: false, skipped: false},
]
```
Se a distância pro [0] for <= 0, executar restart e jogar o 12:00 pro final da array

```js
function scheduleNextExecution() {
  const now = new Date();
  const delay = 60 * 1000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 1000;

  setTimeout(() => {
    yourFunction(); // replace this with your function
    scheduleNextExecution();
  }, delay);
}

function yourFunction() {
  console.log('Function fired at', new Date());
}

scheduleNextExecution();

```
https://www.npmjs.com/search?q=timer
https://www.npmjs.com/search?ranking=popularity&q=scheduler
https://www.npmjs.com/package/node-schedule

> user report
> canceled 18:00 for a 20:00 restart and it wont let me change to 20:00
problema: as vezes querem adiar um restart das settings, mas não é possível



=======================================================================

### Adaptive cards system
- Does not require the new ace system or the API
- Resources can register their adaptive cards interface which will show in the tx nui main tab, or as a player card tab
- The resources add a `ui_cards` definition to their `fxmanifest.lua` which is scanned by txadmin
- When an admin clicks on the button added, it will send a event through stdin to the tx resource which will verify caller and then call the resource export with the required context (eg. player id, admin name, etc). The exported function returns an adaptive card which is sent to txAdmin through fd3.
- This allows for resources to add their own UI to txAdmin, which supports buttons, inputs, etc
- cfx reference: `ext/cfx-ui/src/cfx/apps/mpMenu/parts/LegacyConnectingModal/AdaptiveCardPresenter/AdaptiveCardPresenter.tsx`

```lua
ui_cards 'list' {
    ['playerInfo'] = {
        title = 'RP Info',
        type = 'player', --show in player card
    },
    ['generalStatsNui'] = {
        title = 'RP Stats',
        type = 'mainmenu', --show in nui main menu
    },
    ['generalStatsWeb'] = {
        title = 'RP Stats',
        type = 'web', --show in the web panel
    },
}
```


### New database alternatives:
Databases that i didn't check yet:
https://github.com/indradb/indradb
https://github.com/erikgrinaker/toydb
https://github.com/skytable/skytable
https://github.com/meilisearch/meilisearch
https://github.com/redwood/redwood
https://github.com/arangodb/arangodb
https://github.com/duckdb/duckdb




### txAdmin API/integrations:
- ban/warn/whitelist + revoke action: probably exports with GetInvokingResource() for perms 
- get player info (history, playtime, joindate, etc): state bags
- events: keep the way it is
> Note: confirm with bubble
> Don't forget to add a integrations doc page + to the readme
> for menu and internal stuff to use token-based rest api: ok, just make sure to use the webpipe proxy
> for resource permissions, use resource.* ace thing, which also works for exports

ps.: need to also include the external events reporting thing


### Admin ACE sync:
NOTE: Dec/2023 - why even bother?! Current system works, and we can exports the player permissions via state bags or whatever

On server start, or admins permission change:
- write a `txData/<profile>/txAcePerms.cfg` with:
    - remove_ace/remove_principal to wipe old permissions (would need something like `remove_ace identifier.xxx:xx txadmin.* any`)
    - or just `remove_ace identifier.xxx:xx txadmin.*` which would remove all aces, for all subscopes
    - add_ace/add_principal for each admin
- stdin> `exec xxx.cfg; txaBroadcast xxxxx`

- We should be able to get rid of our menu state management, mainly the part that sends to lua what are the admin ids when something changes
To check of admin perm, just do `IsPlayerAceAllowed(src, 'txadmin.xxxxxx')`
> Don't use, but I'll leave it saved here: https://github.com/citizenfx/fivem/commit/fd3fae946163e8af472b7f739aed6f29eae8105f
- need to find a way to protect against scripts, cfg/console changing these aces
- would be cool to have a `SetProtectedMonitorAces(table)` native dedicated to txadmin to set every admin/resource ace perms

### Easy way of doing on/off duty scripts:
- NOTE: oct 2024 - the idea below changed a bit because of the initial player data, which should have the player admin status
- the current ones out there exist by abusing the auth event:
    - `TriggerEvent("txcl:setAdmin", false, false, "you are offduty")`
- provide an export to register a resource as a onduty validator
- when an auth sets place, reach out to the registered export to validate if someone should get the admin perms or not
    - if not, return an error message displaying a `[resource] <custom message>` as the fail reason
- provide an export to trigger the admin auth of any player
- provide an export to trigger a setAdmin removing the perms


### Reporting system
- Definitely worth to do discord integration, with good embeds (with buttons?)
- Need to show both ingame and on web
- Automatically pull all logs from a player, and the world log from around that time
- Notify admins ingame

### txBanana
- code prototype with ItsANoBrainer#1337 (https://github.com/tabarra/txBanana)
- keybind to toggle gun (grab or put away)
- when you point at player, show above head some info
- when you "shoot" it will open the player menu and hopefully fire a laser or something
- when you right click, slap player (ApplyDamageToPed 5 damage + small psysichs push up and x+y random)

NOTE: better to use some effect in game, it will likely sync between players
https://freesound.org/search/?q=toy+gun&f=&s=score+desc&advanced=0&g=1
https://freesound.org/browse/tags/laser/?page=5#sound
    https://freesound.org/people/nsstudios/sounds/344276/
    https://freesound.org/people/HadaHector/sounds/446383/
    https://freesound.org/people/unfa/sounds/193427/


=======================================


## References

### Locale
https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes

### RedM stuff
https://github.com/femga/rdr3_discoveries
https://vespura.com/doc/natives/

### Ptero stuff
https://github.com/pelican-eggs/games-standalone/blob/main/gta/fivem/egg-five-m.json
https://github.com/pelican-eggs/yolks/blob/master/oses/debian/Dockerfile
https://github.com/pelican-eggs/yolks/commit/57e3ef41ed05109f5e693d2e0d648cf4b161f72c


### New UI stuff
https://www.tremor.so/blocks/landing-zone <<< boa inspiração de componentes
https://stacksorted.com/
https://auto-animate.formkit.com

### Theming stuff:
https://palettte.app/
https://uicolors.app/create
https://www.tailwindshades.com/
https://contrast.tools/?tab=apca
https://atmos.style/contrast-checker
https://tweakcn.com/editor/theme
https://realtimecolors.com/
https://www.learnui.design/blog/color-in-ui-design-a-practical-framework.html
https://www.refactoringui.com/previews/building-your-color-palette
https://www.smashingmagazine.com/2021/07/hsl-colors-css/
Base for themes: https://daisyui.com/docs/themes/
Custom theme creator stuff:
- https://labs.mapbox.com/react-colorpickr/
- https://react-spectrum.adobe.com/react-spectrum/ColorSlider.html#creating-a-color-picker
- https://www.peko-step.com/en/tool/hslrgb_en.html
cfxui colors:
- ext/cfx-ui/src/cfx/apps/mpMenu/styles/themes/fivem-dark.scss
- ext/cfx-ui/src/cfx/styles/_ui.scss


=======================================

## CLTR+C+V
```bash
# repo stuff
npx knip
npm-upgrade
bunx madge --warning --circular --ts-config="core/tsconfig.json" core/index.ts

# react renderin visualizer
<script src="https://unpkg.com/react-scan/dist/auto.global.js"></script>

# other stuff
con_miniconChannels script:monitor*
con_miniconChannels script:runcode
+setr txAdmin-debugMode true
nui_devtools mpMenu
window.invokeNative('changeName', '\u{1160}\u{3164}');

# hang fxserver (runcode)
const duration = 60_000;
console.log(`hanging the thread for ${duration}ms`);
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, duration);
console.log('done');

setInterval(() => {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2);
}, 0);

# stress http post
seq 50000 | parallel --max-args 0 --jobs 10000 "curl -s http://xxxxxxxxxxx:40120/ -d @braces768kb.json --header \"Content-Type: application/json\" > /dev/null"

# check external chart
cdt
cd web/public/
curl -o svMain.json http://localhost:40120/chartData/svMain

# check changes
git diff --unified=0 --no-color | grep '^+' | grep --color 'NOTE'
git diff --unified=0 --no-color | grep '^+' | grep --color 'TODO'
git diff --unified=0 --no-color | grep '^+' | grep --color 'FIXME'
git diff --unified=0 --no-color | grep '^+' | grep --color '!NC'
```
