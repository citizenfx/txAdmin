# Environment Configuration

Starting from txAdmin v8.0.0, **you can now customize txAdmin through `TXHOST_*` environment variables** documented in this page.  
Those configurations are usually required for Game Server Providers (GSPs) and advanced server owners, and allow them to force txAdmin and FXServer to use specific ports/interfaces, customize the location of the txData directory, force a max player slot count, etc.  
  
> [!WARNING]
> The `txAdminPort`, `txAdminInterface`, and `txDataPath` ConVars, as well as the `txAdminZapConfig.json` file are now considered **deprecated** and will cease to work in an upcoming update.  
> If the new and old configs are present at the same time, the new one will take priority.  
> Setting `TXHOST_IGNORE_DEPRECATED_CONFIGS` to `true` will disable the old config and silence the respective warnings.

> [!IMPORTANT]  
> All ConVars but `serverProfile` became `TXHOST_*` env vars, and you should avoid using it as the concept of txAdmin profiles will likely be deprecated soon.  
> If setting multiple servers, **we strongly encourage you to set up separate txDatas for your servers.** As otherwise the `admins.json` file will conflict.

> [!CAUTION]
> Although the configuration below is useful for Game Server Providers (GSPs), **this is in no way, shape, or form an endorsement or permission for anyone to become an unauthorized GSP**.  
> Please refer to the FiveM [Creator Platform License Agreement](https://fivem.net/terms).


## Setup

The specific way to set up those variables vary from system to system, and there are usually multiple ways even within the same system. But these should work for most people:  
- Windows:
    - Edit your existing `start_<version>_<profile>.bat` to add the `set VAR_NAME=VALUE` commands before the `./<...>/FXServer.exe` line.
    - Alternatively, you can create a `env.bat` file with the `set` commands, then start your server with `call env.bat && FXServer.exe`, which will run the `env.bat` before running `FXServer.exe`.
- Linux:
    - Edit your existing `run.sh` to add the  `export VAR_NAME=VALUE` commands before the `exec $SCRIPTPATH/[...]` line.
    - Alternatively, you can create a `env.sh` file with the `export` commands, then start your server with `source env.sh && ./run.sh`
- Docker: 
    - Create a `.env` file with the vars like: `VAR_NAME=VALUE`
    - Load it using the `--env-file=.env` flag in your docker run command.
- Pterodactyl: You will likely need to contact your GSP or edit the "egg" being used.

> [!TIP]
> For security reasons, those environment variables **should** be set specifically for the boot process and **must not** be widely available for other processes.
> If they are to be written to a file (such as `.env`), the file should only be readable for the txAdmin process and not its children processes. 


## Variables Available

### General
- **TXHOST_DATA_PATH**
    - **Default value:** 
        - **Windows:** `<fxserver_root>/../txData` — sits in the folder parent of the folder containing `fxserver.exe` (aka "the artifact").
        - **Linux:** `<fxserver_root>/../../../txData` — sits in the folder that contains your `run.sh`.
    - The path to the txData folder, which contains the txAdmin logs, configs, and data. This is also the default place suggested for deploying new servers (as a subfolder). It is usually set to `/home/container` when running on Pterodactyl.
    - <mark>NOTE:</mark> This variable takes priority over the deprecated `txDataPath` ConVar.
- **TXHOST_GAME_NAME**
    - **Default value:** _undefined_.
    - **Options:** `['fivem','redm']`.
    - Restricts to only running either FiveM or RedM servers.
    - The setup page will only show recipes for the game specified
- **TXHOST_MAX_SLOTS**
    - **Default value:** _undefined_.
    - Enforces the server `sv_maxClients` is set to a number less than or equal to the variable value.
- **TXHOST_QUIET_MODE**
    - **Default value:** `false`.
    - If true, do not pipe the FXServer's stdout/stderr to txAdmin's stdout, meaning that you will only be able to see the server output by visiting the txAdmin Live Console page.
    - If enabled, server owners won't be able to disable it in `txAdmin -> Settings -> FXServer` page.
    - <mark>NOTE:</mark> We recommend that Game Server Providers enable this option.
- **TXHOST_API_TOKEN**
    - **Default value:** _undefined_.
    - **Options:** `disabled` or a string matching `/^[A-Za-z0-9_-]{16,48}$/`.
    - The token to be able to access the `/host/status` endpoint via the `x-txadmin-envtoken` HTTP header, or the `?envtoken=` URL parameter.
    - If token is _undefined_: endpoint disabled & unavailable.
    - If token is string `disabled`: endpoint will be publicly available without any restrictions.
    - If token is present: endpoint requires the token to be present.

### Networking
- **TXHOST_TXA_URL:**
    - **Default value:** _undefined_.
    - If present, that is the URL that will show on txAdmin as its public URL on the boot message.
    - This is useful for when running inside a container using `0.0.0.0:40120` as interface/port.
- **TXHOST_TXA_PORT**
    - **Default value:** `40120`.
    - Which TCP port txAdmin should bind & listen to.
    - This variable cannot be `30120` to prevent user confusion.
    - <mark>NOTE:</mark> This variable takes priority over the deprecated `txAdminPort` ConVar.
- **TXHOST_FXS_PORT**
    - **Default value:** _undefined_.
    - Forces the FXServer to bind to the specified port by enforcing or replacing the `endpoint_add_*` commands in `server.cfg`.
    - This variable cannot be `40120` to prevent user confusion.
- **TXHOST_INTERFACE**
    - **Default value:** `0.0.0.0`.
    - Which interface txAdmin will bind and enforce FXServer to bind to.
    - <mark>NOTE:</mark> This variable takes priority over the deprecated `txAdminInterface` ConVar.

### Provider
- **TXHOST_PROVIDER_NAME**
    - **Default value:** `Host Config`.
    - A short name to identify this hosting provider.
    - The value must be between 2 and 16 characters long and can only contain letters, numbers, underscores, periods, hyphens, and spaces. Must not start or end with special chars, and must not have two subsequent special chars.
    - This will usually show in warnings regarding configuration or user actions that go against any `TXHOST_*` variable.
- **TXHOST_PROVIDER_LOGO**
    - **Default value:** _undefined_.
    - The URL for the hosting provider logo which will appear at the login page.
    - The maximum image size is **224x96**.
    - You can create a theme-aware URL by including a `{theme}` placeholder in the URL, which will be replaced by `light` or `dark` at runtime, depending on the theme being used, eg. `https://.../logo_{theme}.png`.


### Defaults 
- **TXHOST_DEFAULT_DB<HOST|PORT|USER|PASS|NAME>**
    - **Default value:** _undefined_.
    - To be used only for auto-filling the config steps when deploying a new server and can be overwritten during manual deployment or after that by modifying their `server.cfg`.
    - All the values will be considered strings, and no validation will be done to them.
- **TXHOST_DEFAULT_CFXKEY**
    - **Default value:** _undefined_.
    - To be used only for auto-filling the config steps when deploying a new server and can be overwritten during manual deployment or after that by modifying their `server.cfg`.
    - The value should be a `cfxk_xxxxxxxxxxxxxxxxxxxxx_xxxxxx` key, which individuals can obtain in the [Cfx.re Portal](https://portal.cfx.re/).
    - This is also very useful for developers who need to go through the txAdmin Setup & Deployer frequently.
- **TXHOST_DEFAULT_ACCOUNT**
    - **Default value:** _undefined_.
    - This variable is used by GSPs for setting up an `admins.json` automatically on first boot.
    - It contains a username, FiveM ID, and password (as bcrypt hash) separated by colons:
        - **Username:** If a FiveM ID is provided, this must match the username of the FiveM account used by the second parameter. Otherwise, it accepts any username valid for txAdmin accounts (same rule used by the [FiveM Forum](https://forum.cfx.re/)).
        - **FiveM ID:** The numeric ID of a FiveM account, same as the one visible as in-game identifier. For instance, the value should be `271816` for someone with the in-game identifier `fivem:271816`. When set, the admin will be able to login using the Cfx.re button instead of requiring a password.
        - **Password:** A bcrypt-hashed password to be used as the "backup password".
    - The account must at least have either FiveM ID or password set. If an account has no password, on first access the owner will be queried to change their password.
    - Examples:
        - `tabarra:271816`
        - `tabarra:271816:$2a$11$K3HwDzkoUfhU6.W.tScfhOLEtR5uNc9qpQ685emtERx3dZ7fmgXCy`
        - `tabarra::$2a$11$K3HwDzkoUfhU6.W.tScfhOLEtR5uNc9qpQ685emtERx3dZ7fmgXCy`

> [!NOTE]  
> More variables are still being considered, like options to configure reverse proxy IPs, security locks, etc.  
> Please feel free to provide feedback and suggestions.


## Examples

### Migrate old `start.bat`
Replace this:
```batch
@echo off
"E:/FiveM/13079//FXServer.exe" +set serverProfile "server2" +set txAdminPort "40125"
pause
```
With this:
```batch
@echo off
set TXHOST_DATA_PATH=E:\FiveM\txData-dev
set TXHOST_TXA_PORT=40125
"E:/FiveM/13079//FXServer.exe"
pause
```
> [!NOTE]
> Replace `"E:/FiveM/13079//FXServer.exe"` with the path you see in your existing `*.bat`.


### Setting up a dev server on Windows with a `env.bat` file:
```batch
@REM Deployer defaults
set TXHOST_DEFAULT_CFXKEY=cfxk_11hIT156dX0F0ekFVsuda_fQ0ZYS
set TXHOST_DEFAULT_DBHOST=127.0.0.1
set TXHOST_DEFAULT_DBPORT=3306
set TXHOST_DEFAULT_DBUSER=root
set TXHOST_DEFAULT_DBPASS=4b6c3_1919_ab04df6
set TXHOST_DEFAULT_DBNAME=coolrp_dev

@REM Prevent conflicting with main server
set TXHOST_DATA_PATH=C:/test-server/txData
set TXHOST_FXS_PORT=30125
set TXHOST_MAX_SLOTS=8
```

### Setting a GSP configuration on Docker with a `.env` file:
```dotenv
# So txAdmin suggests the right path during setup
TXHOST_DATA_PATH=/home/container

# Deployer defaults
TXHOST_DEFAULT_DBHOST=123.123.123
TXHOST_DEFAULT_DBPORT=3306
TXHOST_DEFAULT_DBUSER=u538241
TXHOST_DEFAULT_DBPASS=4b6c3_1919_ab04df6
TXHOST_DEFAULT_DBNAME=db538241

# Customer FiveM-linked account
TXHOST_DEFAULT_ACCOUNT=tabarra:271816

# Provider details
TXHOST_PROVIDER_NAME=ExampleHosting
TXHOST_PROVIDER_LOGO=https://github.com/tabarra/txAdmin/raw/master/docs/banner.png
```
