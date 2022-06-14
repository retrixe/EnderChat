// LOW-TODO: Missing translations, extra translations and lack of text styling.
const translations: { [translation: string]: string } = {
  'multiplayerWarning.header': 'Caution: Third-Party Online Play',
  'multiplayerWarning.message':
    'Caution: Online play is offered by third-party servers that are not owned, operated, or supervised by Mojang Studios or Microsoft. During online play, you may be exposed to unmoderated chat messages or other types of user-generated content that may not be suitable for everyone.',
  'multiplayerWarning.check': 'Do not show this screen again',
  'multiplayer.title': 'Play Multiplayer',
  'multiplayer.texturePrompt.line1':
    'This server recommends the use of a custom resource pack.',
  'multiplayer.texturePrompt.line2':
    'Would you like to download and install it automagically?',
  'multiplayer.requiredTexturePrompt.line1':
    'This server requires the use of a custom resource pack.',
  'multiplayer.requiredTexturePrompt.line2':
    'Rejecting this custom resource pack will disconnect you from this server.',
  'multiplayer.requiredTexturePrompt.disconnect':
    'Server requires a custom resource pack',
  'multiplayer.texturePrompt.failure.line1':
    "Server resource pack couldn't be applied",
  'multiplayer.texturePrompt.failure.line2':
    'Any functionality that requires custom resources might not work as expected',
  'multiplayer.texturePrompt.serverPrompt': '%s\n\nMessage from server:\n%s',
  'multiplayer.applyingPack': 'Applying resource pack',
  'multiplayer.downloadingTerrain': 'Loading terrain...',
  'multiplayer.downloadingStats': 'Retrieving statistics...',
  'multiplayer.stopSleeping': 'Leave Bed',
  'multiplayer.message_not_delivered':
    "Can't deliver chat message, check server logs: %s",
  'multiplayer.player.joined': '%s joined the game',
  'multiplayer.player.joined.renamed':
    '%s (formerly known as %s) joined the game',
  'multiplayer.player.left': '%s left the game',
  'multiplayer.status.and_more': '... and %s more ...',
  'multiplayer.status.cancelled': 'Cancelled',
  'multiplayer.status.cannot_connect': "Can't connect to server",
  'multiplayer.status.cannot_resolve': "Can't resolve hostname",
  'multiplayer.status.finished': 'Finished',
  'multiplayer.status.incompatible': 'Incompatible version!',
  'multiplayer.status.no_connection': '(no connection)',
  'multiplayer.status.ping': '%s ms',
  'multiplayer.status.old': 'Old',
  'multiplayer.status.pinging': 'Pinging...',
  'multiplayer.status.quitting': 'Quitting',
  'multiplayer.status.unknown': '???',
  'multiplayer.status.unrequested': 'Received unrequested status',
  'multiplayer.status.request_handled': 'Status request has been handled',
  'multiplayer.disconnect.authservers_down':
    'Authentication servers are down. Please try again later, sorry!',
  'multiplayer.disconnect.banned': 'You are banned from this server',
  'multiplayer.disconnect.banned.reason':
    'You are banned from this server.\nReason: %s',
  'multiplayer.disconnect.banned.expiration':
    '\nYour ban will be removed on %s',
  'multiplayer.disconnect.banned_ip.reason':
    'Your IP address is banned from this server.\nReason: %s',
  'multiplayer.disconnect.banned_ip.expiration':
    '\nYour ban will be removed on %s',
  'multiplayer.disconnect.duplicate_login':
    'You logged in from another location',
  'multiplayer.disconnect.flying': 'Flying is not enabled on this server',
  'multiplayer.disconnect.generic': 'Disconnected',
  'multiplayer.disconnect.idling': 'You have been idle for too long!',
  'multiplayer.disconnect.illegal_characters': 'Illegal characters in chat',
  'multiplayer.disconnect.invalid_entity_attacked':
    'Attempting to attack an invalid entity',
  'multiplayer.disconnect.invalid_packet': 'Server sent an invalid packet',
  'multiplayer.disconnect.invalid_player_data': 'Invalid player data',
  'multiplayer.disconnect.invalid_player_movement':
    'Invalid move player packet received',
  'multiplayer.disconnect.invalid_vehicle_movement':
    'Invalid move vehicle packet received',
  'multiplayer.disconnect.ip_banned':
    'You have been IP banned from this server',
  'multiplayer.disconnect.kicked': 'Kicked by an operator',
  'multiplayer.disconnect.incompatible': 'Incompatible client! Please use %s',
  'multiplayer.disconnect.outdated_client':
    'Incompatible client! Please use %s',
  'multiplayer.disconnect.outdated_server':
    'Incompatible client! Please use %s',
  'multiplayer.disconnect.server_shutdown': 'Server closed',
  'multiplayer.disconnect.slow_login': 'Took too long to log in',
  'multiplayer.disconnect.unverified_username': 'Failed to verify username!',
  'multiplayer.disconnect.not_whitelisted':
    'You are not white-listed on this server!',
  'multiplayer.disconnect.server_full': 'The server is full!',
  'multiplayer.disconnect.name_taken': 'That name is already taken',
  'multiplayer.disconnect.unexpected_query_response':
    'Unexpected custom data from client',
  'multiplayer.disconnect.missing_tags':
    'Incomplete set of tags received from server.\nPlease contact server operator.',
  'multiplayer.socialInteractions.not_available':
    'Social Interactions are only available in Multiplayer worlds',
  'multiplayer.disconnect.missing_public_key':
    'Missing profile public key.\nThis server requires secure profiles.',
  'multiplayer.disconnect.invalid_public_key_signature':
    'Invalid signature for profile public key.\nTry restarting your game.',
  'multiplayer.disconnect.invalid_public_key':
    'Unable to parse profile public key.',
  'multiplayer.disconnect.out_of_order_chat':
    'Out-of-order chat packet received. Did your system time change?',
  'disconnect.genericReason': '%s',
  'disconnect.unknownHost': 'Unknown host',
  'disconnect.disconnected': 'Disconnected by Server',
  'disconnect.lost': 'Connection Lost',
  'disconnect.kicked': 'Was kicked from the game',
  'disconnect.timeout': 'Timed out',
  'disconnect.closed': 'Connection closed',
  'disconnect.loginFailed': 'Failed to log in',
  'disconnect.loginFailedInfo': 'Failed to log in: %s',
  'disconnect.loginFailedInfo.serversUnavailable':
    'The authentication servers are currently not reachable. Please try again.',
  'disconnect.loginFailedInfo.invalidSession':
    'Invalid session (Try restarting your game and the launcher)',
  'disconnect.loginFailedInfo.insufficientPrivileges':
    'Multiplayer is disabled. Please check your Microsoft account settings.',
  'disconnect.quitting': 'Quitting',
  'disconnect.endOfStream': 'End of stream',
  'disconnect.overflow': 'Buffer overflow',
  'disconnect.spam': 'Kicked for spamming',
  'disconnect.exceeded_packet_rate': 'Kicked for exceeding packet rate limit',
  'chat.editBox': 'chat',
  'chat.cannotSend': 'Cannot send chat message',
  'chat.disabled.options': 'Chat disabled in client options',
  'chat.disabled.launcher':
    'Chat disabled by launcher option. Cannot send message',
  'chat.disabled.profile':
    'Chat not allowed by account settings. Cannot send message',
  'chat.type.text': '<%s> %s',
  'chat.type.text.narrate': '%s says %s',
  'chat.type.emote': '* %s %s',
  'chat.type.announcement': '[%s] %s',
  'chat.type.admin': '[%s: %s]',
  'chat.type.advancement.task': '%s has made the advancement %s',
  'chat.type.advancement.challenge': '%s has completed the challenge %s',
  'chat.type.advancement.goal': '%s has reached the goal %s',
  'chat.type.team.text': '%s <%s> %s',
  'chat.type.team.sent': '-> %s <%s> %s',
  'chat.type.team.hover': 'Message Team',
  'chat.link.confirm': 'Are you sure you want to open the following website?',
  'chat.link.warning': "Never open links from people that you don't trust!",
  'chat.copy': 'Copy to Clipboard',
  'chat.copy.click': 'Click to Copy to Clipboard',
  'chat.link.confirmTrusted':
    'Do you want to open this link or copy it to your clipboard?',
  'chat.link.open': 'Open in Browser',
  'chat.coordinates': '%s, %s, %s',
  'chat.coordinates.tooltip': 'Click to teleport',
  'chat.queue': '[+%s pending lines]',
  'chat.square_brackets': '[%s]'
}

export default translations
