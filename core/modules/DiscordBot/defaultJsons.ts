export const defaultEmbedJson = JSON.stringify({
    "title": "{{serverName}}",
    "url": "{{serverBrowserUrl}}",
    "description": "You can configure this embed in `txAdmin > Settings > Discord Bot`, and edit everything from it (except footer).",
    "fields": [
        {
            "name": "> STATUS",
            "value": "```\n{{statusString}}\n```",
            "inline": true
        },
        {
            "name": "> PLAYERS",
            "value": "```\n{{serverClients}}/{{serverMaxClients}}\n```",
            "inline": true
        },
        {
            "name": "> F8 CONNECT COMMAND",
            "value": "```\nconnect 123.123.123.123\n```"
        },
        {
            "name": "> NEXT RESTART",
            "value": "```\n{{nextScheduledRestart}}\n```",
            "inline": true
        },
        {
            "name": "> UPTIME",
            "value": "```\n{{uptime}}\n```",
            "inline": true
        }
    ],
    "image": {
        "url": "https://forum-cfx-re.akamaized.net/original/5X/e/e/c/b/eecb4664ee03d39e34fcd82a075a18c24add91ed.png"
    },
    "thumbnail": {
        "url": "https://forum-cfx-re.akamaized.net/original/5X/9/b/d/7/9bd744dc2b21804e18c3bb331e8902c930624e44.png"
    }
});

export const defaultEmbedConfigJson = JSON.stringify({
    "onlineString": "🟢 Online",
    "onlineColor": "#0BA70B",
    "partialString": "🟡 Partial",
    "partialColor": "#FFF100",
    "offlineString": "🔴 Offline",
    "offlineColor": "#A70B28",
    "buttons": [
        {
            "emoji": "1062338355909640233",
            "label": "Connect",
            "url": "{{serverJoinUrl}}"
        },
        {
            "emoji": "1062339910654246964",
            "label": "txAdmin Discord",
            "url": "https://discord.gg/txAdmin"
        },
    ].filter(Boolean)
});
