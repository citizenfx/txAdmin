## Permission System
The permission system allows you to control which admins can perform which actions.
For instance you can allow one admin to only view the console and kick players, but not restart the server and execute arbitrary commands.
The permissions are saved in the `txData/admins.json` file and can be edited through the *Admin Manager* page by the Master admin, or users with `all_permissions` or `manage.admins` permissions.

### Available Permissions
- `all_permissions`: Root permission that allows the user to perform any action. When set, this will remove all other permissions.
- `manage.admins`: Permission to create, edit, and remove other admin accounts.
- `settings.view`: View Settings (no tokens).
- `settings.write`: Change Settings.
- `console.view`: View Console.
- `console.write`: Write Console commands.
- `control.server`: Start/Stop/Restart Server.
- `announcement`: Send announcements.
- `commands.resources`: Start/Stop Resources.
- `server.cfg.editor`: Read/Write server.cfg.
- `txadmin.log.view`: View txAdmin Log.
- `server.log.view`: View server logs.
- `menu.vehicle`: Spawn/Fix Vehicles.
- `menu.clear_area`: Reset world area.
- `menu.viewids`: View Player IDs in-game.
- `players.direct_message`: Send direct messages.
- `players.whitelist`: Whitelist a player.
- `players.warn`: Warn a player.
- `players.kick`: Kick a player.
- `players.ban`: Ban/Unban a player.
- `players.freeze`: Freeze a player's ped.
- `players.heal`: Heal self or everyone.
- `players.playermode`: Toggle NoClip, God Mode, or Superjump.
- `players.spectate`: Spectate a player.
- `players.teleport`: Teleport self or a player.
- `players.troll`: Use the Troll Menu.
- `players.remove_ids`: Remove IDs/HWIDs of player from the database.
