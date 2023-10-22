# EnderChat

[![Discord server for EnderChat and other projects](https://dcbadge.vercel.app/api/server/MFSJa9TpPS)](https://discord.gg/MFSJa9TpPS)

A React Native app for Android/iOS to chat on Minecraft servers from your phone.

Disclaimer: This app is NOT an official Minecraft product. It is not associated with Mojang in any way.

## Features (still being worked on)

- Fully open-source with no ads! Easily report issues through GitHub and get a direct response.
- Supports connecting to Minecraft 1.16.4 through Minecraft 1.20.2 servers. (Older versions planned.)
- Supports all Minecraft chat features, which sometimes trip up other chat apps.
- Send join messages and commands on connecting to a server.
- Health change indicator and respawn on death support.
- Tested to be performant and efficient on old phones.
- [Many other features planned!](https://github.com/retrixe/EnderChat/issues)

## Installation

[The latest versions of EnderChat are published to GitHub Releases.](https://github.com/retrixe/EnderChat/releases)

### Android

[EnderChat is available to download from the Play Store!](https://play.google.com/store/apps/details?id=com.enderchat) Alternatively, APKs are available to download for each EnderChat release [here.](https://github.com/retrixe/EnderChat/releases)

### iOS

**Note:** iOS support is currently untested and may have bugs and/or performance issues, since I don't have a Mac to properly support iOS as a target platform. Contributions to improve iOS support are welcome though!

IPAs are available to download for each EnderChat release [here.](https://github.com/retrixe/EnderChat/releases) These can be sideloaded on your iPhone using techniques like AltStore.

There are no plans to publish EnderChat to the iOS App Store for now. ***While the license allows redistribution, I request people not to abuse this privilege and publish EnderChat to the App Store without my permission.***

## Development

Development on this application is similar to any other React Native app. However, you must follow the instructions [here](https://wiki.vg/Microsoft_Authentication_Scheme) to get Microsoft Login working, by obtaining a client ID and placing it in a `config.json` file at the top-level, which must be formatted like so:

```json
{"clientId": "", "scope": "XboxLive.signin offline_access"}
```

## License

```markdown
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.
```

The `src/minecraft` folder is independent of the rest of the project, and is licensed under the terms of the MIT license. Refer to the folder's own `README.md` and `LICENSE` files for more information.

## Privacy Policy

EnderChat does not collect any data from its users. The data that is collected and sent to third-parties is required for the app to function, and is as follows:

1. Data sent to the Minecraft server you are connecting to. This data includes, but is not limited to, pings to receive server info, chat messages, commands, tab completion events, detection and usage of EnderChat-specific features, server-side settings and account details necessary for connecting to the server.
2. Data sent to Microsoft for authenticating your purchased copy of Minecraft, which enables you to connect to online mode Minecraft servers.

Analytics may be added in the future, but are currently not present.
