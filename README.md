<p align="center">
    <p align="center">
        <img src="docs/banner.png">
    </p>
    <p align="center">
        In 2019 <b>txAdmin</b> was created, with the objective of making FiveM server management accessible to everyone – no matter their skill level! <br/>
        Today, <b>txAdmin</b> is <i>the</i> <b>full featured</b> web panel & in-game menu to Manage & Monitor your FiveM/RedM Server, in use by over <strong>29.000</strong> servers worldwide at any given time!
    </p>
    <p align="center">
        Join our Discord Server: &nbsp; <a href="https://txadmin.gg/discord"><img src="https://discordapp.com/api/guilds/577993482761928734/widget.png?style=shield"></img></a>
    </p>
    <p align="center">
        <a href="https://zap-hosting.com/txadmin4" target="_blank" rel="noopener">
            <img src="docs/zaphosting.png" alt="zap-hosting"></img>
        </a>
    </p>
</p>

## Main Features
- Recipe-based Server Deployer: create a server in under 60 seconds! ([docs/recipe.md](docs/recipe.md))
- Start/Stop/Restart your server instance or resources
- Full-featured in-game admin menu:
    - Player Mode: NoClip, God, SuperJump
    - Teleport:  waypoint, coords and back
    - Vehicle: Spawn, Fix, Delete, Boost
    - Heal: yourself, everyone
    - Send Announcements
    - Reset World Area
    - Show player IDs
    - Player search/sort by distance, ID, name
    - Player interactions: Go To, Bring, Spectate, Freeze
    - Player troll: make drunk, set fire, wild attack
    - Player ban/warn/dm
- Access control:
    - Login via Cfx or password
    - Admin permission system ([docs/permissions.md](docs/permissions.md))
    - Action logging
- Discord Integration:
    - Server configurable, persistent, auto-updated status embed
    - Command to whitelist players
    - Command to display player infos
- Monitoring:
    - Auto Restart FXServer on crash or hang
    - Server’s CPU/RAM consumption
    - Live Console (with log file, command history and search)
    - Server threads performance chart with player count
    - Server Activity Log (connections/disconnections, kills, chat, explosions and [custom commands](docs/custom-server-log.md))
- Player Manager:
    - [Warning system](https://www.youtube.com/watch?v=DeE0-5vtZ4E) & Ban system
    - Whitelist system (Discord member, Discord Role, Approved License, Admin-only)
    - Take notes about players
    - Keep track of player's play and session time
    - Self-contained player database (no MySQL required!)
    - Clean/Optimize the database by removing old players, or bans/warns/whitelists
- Real-time playerlist
- Scheduled restarts with warning announcements and custom events ([docs/events.md](docs/events.md))
- Translated into over 30 languages ([docs/translation.md](docs/translation.md))
- FiveM's Server CFG editor & validator
- Responsive web interface with Dark Mode 😎
- And much more...

Also, check our [Feature Graveyard](docs/feature-graveyard.md) for the features that are no longer among us (😔 RIP).

## Running txAdmin
- Since early 2020, **txAdmin is a component of FXServer, so there is no need to downloading or installing anything**.
- To start txAdmin, simply run FXServer **without** any `+exec server.cfg` launch argument, and FXServer will automatically start txAdmin.
- On first boot, a `txData` directory will be created to store txAdmin files, and you will need to open the URL provided in the console to configure your account and server.

  
## Configuration & Integrations
- Most configuration can be done inside the txAdmin settings page, but some configs (such as TCP interface & port) are only available through  Environment Variables, please see [docs/env-config.md](docs/env-config.md).
- You can listen to server events broadcasted by txAdmin to allow for custom behavior in your resources, please see [docs/events.md](docs/events.md).


## Contributing & Development
- All PRs should be based on the develop branch, including translation PRs.
- Before putting effort for any significant PR, make sure to join our discord and talk to us, since the change you want to do might not have been done for a reason or there might be some required context.
- If you want to build it or run from source, please check [docs/development.md](docs/development.md).


## License, Credits and Thanks
- This project is licensed under the [MIT License](https://github.com/citizenfx/txAdmin/blob/master/LICENSE);
- ["Kick" button icons](https://www.flaticon.com/free-icon/users-avatar_8188385) made by __SeyfDesigner__ from [www.flaticon.com](https://www.flaticon.com);
- Warning Sounds ([1](https://freesound.org/people/Ultranova105/sounds/136756/)/[2](https://freesound.org/people/Ultranova105/sounds/136754/)) made by __Ultranova105__ are licensed under [CC 3.0 BY](http://creativecommons.org/licenses/by/3.0/);
- [Announcement Sound](https://freesound.org/people/IENBA/sounds/545495/) made by __IENBA__ is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/);
- [Message Sound](https://freesound.org/people/Divinux/sounds/198414/) made by __Divinux__ is licensed under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/);
- Especial thanks to everyone that contributed to this project, especially the very fine Discord folks that provide support for others;
