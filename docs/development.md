# txAdmin Development
If you are interested in development of txAdmin, this short guide will help setup your environment. 
Before starting, please make sure you are familiar with the basics of NodeJS & ecosystem.
> **Note:** This guide does not cover translations, [which are very easy to do!](./translation.md)  


## Requirements
- Windows, as the builder doesn't work for other OSs;
- NodeJS v22.9 or newer;
- FXServer;


## Project Structure
- `core`: Node Backend & Modules. This part is transpiled by `tsc` and then bundled with `esbuild`;
    - `boot`: Code used/triggered during the boot process.
    - `deployer`: Responsible for deploying new servers.
    - `lib`: Collection of stateles utils, helpers and business logic.
    - `modules`: The classes that compose the txAdmin instance, they are stateful, provide specific functionalities and are interconnected with each other.
    - `routes`: All the web routes, contain all the logic referenced in the HTTP router.
    - `testing`: Contains top-level testing utilities.
- `resource`: The in-game resource that runs under the `monitor` name. These files will be synchronized with the deploy path when running the `dev:main` npm script;
- `menu`: React source code for txAdmin's NUI Menu. It is transpiled & built using Vite;
- `web`: Legacy SSR templates & static assets used for the txAdmin's web panel. It uses EJS as templating engine, and will soon be deprecated in favor of `panel`;
- `panel`: The new UI built with React and Vite;
- `scripts`: The scripts used for development only;
- `shared`: Stuff used across multiple workspaces like small functions and type definitions.


## Preparing the environment
1. First, clone the txAdmin repository into a folder outside the fxserver directory;
```sh
git clone https://github.com/citizenfx/txAdmin
```
2. Install dependencies & prepare commit hook;
```sh
# In your root folder run the following
npm install
npm run prepare
```
3. At the root of the project, create a `.env` file with `TXDEV_FXSERVER_PATH` pointing to the path of your FXServer folder.
```
TXDEV_FXSERVER_PATH='E:/FiveM/10309/'
```


## Development Workflows

### Core/Panel/Resource
This workflow is controlled by `scripts/build/*`, which is responsible for:
- Watching and copying static files (resource, docs, license, entry file, etc) to the deploy path;
- Watching and re-transpiling the core files, and then bundling and deploying it;
- Run FXServer (in the same terminal), and restarting it when the core is modified (like `nodemon`, but fancy).
  
In dev mode, core will redirect the panel `index.html` to use Vite, so you first need to start it, and only then start the builder:
```sh
# run vite
cd panel
npm run dev

# In a new terminal - run the builder
cd core
npm run dev
```
  
### NUI Menu
```sh
cd nui

#To run Vite on game dev mode:
npm run dev

#To run Vite on browser dev mode:
npm run browser
```
Keep in mind that for every change you will need to restart the `monitor` resource, and unless you started the server with `+setr txAdmin-debugMode true` txAdmin will detect that as a crash and restart your server.  
Also, when running in game mode, it takes between 10 and 30 seconds for the vite builder to finish for you to be able to restart the `monitor` resource ingame.

### Resource event naming rules:
- The event prefix must be `tx<cl|sv>:` indicating where it is registered.
- Events that request something (like permission) from the server starts with `txsv:req`.
- Events can have verbs like `txsv:checkAdminStatus` or `txcl:setServerCtx`.
- Since most events are menu related, scoping events to menu is not required.

### Testing & Building
The building process is normally done in the GitHub Action workflow only, but if you _must_ build it locally, that can be done with the command below. The output will be on the `dist/` folder.
```sh
npm run test --workspaces
GITHUB_REF="refs/tags/v9.9.9" npm run build
```
> FIXME: add linting & typechecking back into the workflow above


## Notes regarding the Settings system
- `config.json` now only contains the changed, non-default values.
- `DEFAULT_NULL` is only for values that cannot and should not have defaults, like `fxRunner.dataPath`, `discordBot.token`, etc. Note how `fxRunner.cfgPath` does have a default.
- All schemas must have a default, even if `null`.
- The objective of the `schema.fixer` is to fix invalid values, not apply defaults for missing values.
- The `schema.fixer` is only used during boot, not during any saves.
- Only use `SYM_FIXER_FATAL` for settings that are very important, so txAdmin rather not boot than to boot with an unexpected config.
- The objective of the schema is to guarantee that the values are of the correct type (shouldn't cause TypeErrors), but does not check anything dynamic like existence of files, or anything that goes beyond one schema (eg. if bot enabled, token is required).
- Validator transformers are only to "polish" the value, like removing duplicates and sorting values, not to fix invalid values.


## Note regarding the Legacy UI

**⚠Warning: The /web/ ui is considered legacy and will be migrated to /panel/.**

**DO NOT** Modify `css/coreui.css`. Either do a patch in the `custom.css` or modify the SCSS variables.  
This doc is a reference if you are trying to re-build the `css/coreui.css` from the SCSS source.  
The only thing I changed from CoreUI was the `aside-menu` size from 200px to 300px in `scss/_variables.scss : $aside-menu-width`.  
You can find the other variable names in `node_modules/@coreui/coreui/scss/coreui`.

```bash
git clone https://github.com/coreui/coreui-free-bootstrap-admin-template.git coreui
cd coreui
npm i

# If you want to make sure you used the same version of CoreUI
git checkout 0cb1d81a8471ff4b6eb80c41b45c61a8e2ab3ef6

# Edit your stuff and then to compile:
npx node-sass --output-style expanded --source-map true --source-map-contents true --precision 6 src/scss/style.scss src/css/style.css
```

Then copy the `src/css/style.css` to txAdmin's folder.
  
