import { protocolMap } from '../utils'

const generateIdFunction =
  (ids: Array<[number, number | null]>) => (protocolVersion: number) => {
    for (const [version, id] of ids) {
      if (version <= protocolVersion) return id
    }
    return null
  }

const packetIds = {
  // Clientbound (login)
  CLIENTBOUND_SET_COMPRESSION: generateIdFunction([
    [protocolMap['1.16.4'], 0x03]
  ]),
  CLIENTBOUND_LOGIN_SUCCESS: generateIdFunction([
    [protocolMap['1.16.4'], 0x02]
  ]),
  CLIENTBOUND_LOGIN_PLUGIN_REQUEST: generateIdFunction([
    [protocolMap['1.16.4'], 0x04]
  ]),
  CLIENTBOUND_ENCRYPTION_REQUEST: generateIdFunction([
    [protocolMap['1.16.4'], 0x01]
  ]),
  CLIENTBOUND_DISCONNECT_LOGIN: generateIdFunction([
    [protocolMap['1.16.4'], 0x00]
  ]),

  // Clientbound (play)
  CLIENTBOUND_KEEP_ALIVE: generateIdFunction([
    [protocolMap['1.19.3'], 0x1f],
    [protocolMap['1.19.1'], 0x20],
    [protocolMap['1.19'], 0x1e],
    [protocolMap['1.17'], 0x21],
    [protocolMap['1.16.4'], 0x1f]
  ]),
  CLIENTBOUND_DISCONNECT_PLAY: generateIdFunction([
    [protocolMap['1.19.3'], 0x17],
    [protocolMap['1.19.1'], 0x19],
    [protocolMap['1.19'], 0x17],
    [protocolMap['1.17'], 0x1a],
    [protocolMap['1.16.4'], 0x19]
  ]),
  CLIENTBOUND_LOGIN_PLAY: generateIdFunction([
    [protocolMap['1.19.3'], 0x24],
    [protocolMap['1.19.1'], 0x25],
    [protocolMap['1.19'], 0x23],
    [protocolMap['1.17'], 0x26],
    [protocolMap['1.16.4'], 0x24]
  ]),
  CLIENTBOUND_RESPAWN: generateIdFunction([
    [protocolMap['1.19.3'], 0x3d],
    [protocolMap['1.19.1'], 0x3e],
    [protocolMap['1.19'], 0x3b],
    [protocolMap['1.17'], 0x3d],
    [protocolMap['1.16.4'], 0x39]
  ]),
  CLIENTBOUND_UPDATE_HEALTH: generateIdFunction([
    [protocolMap['1.19.3'], 0x53],
    [protocolMap['1.19.1'], 0x55],
    [protocolMap['1.17'], 0x52],
    [protocolMap['1.16.4'], 0x49]
  ]),
  CLIENTBOUND_DEATH_COMBAT_EVENT: generateIdFunction([
    [protocolMap['1.19.3'], 0x34],
    [protocolMap['1.19.1'], 0x36],
    [protocolMap['1.19'], 0x33],
    [protocolMap['1.17'], 0x35],
    [protocolMap['1.16.4'], 0x31]
  ]),
  CLIENTBOUND_OPEN_WINDOW: generateIdFunction([
    [protocolMap['1.19.3'], 0x2c],
    [protocolMap['1.19.1'], 0x2d],
    [protocolMap['1.19'], 0x2b],
    [protocolMap['1.16.4'], 0x2e]
  ]),
  CLIENTBOUND_CHAT_MESSAGE: generateIdFunction([
    [protocolMap['1.19'], null],
    [protocolMap['1.17'], 0x0f],
    [protocolMap['1.16.4'], 0x0e]
  ]),
  CLIENTBOUND_PLAYER_CHAT_MESSAGE: generateIdFunction([
    [protocolMap['1.19.3'], 0x31],
    [protocolMap['1.19.1'], 0x33],
    [protocolMap['1.19'], 0x30]
  ]),
  CLIENTBOUND_SYSTEM_CHAT_MESSAGE: generateIdFunction([
    [protocolMap['1.19.3'], 0x60],
    [protocolMap['1.19.1'], 0x62],
    [protocolMap['1.19'], 0x5f]
  ]),
  CLIENTBOUND_PING: generateIdFunction([
    [protocolMap['1.19.4'], 0x32],
    [protocolMap['1.19.3'], 0x2e],
    [protocolMap['1.19.1'], 0x2f],
    [protocolMap['1.19'], 0x2d],
    [protocolMap['1.17'], 0x30]
  ]),

  // Serverbound (play)
  SERVERBOUND_KEEP_ALIVE: generateIdFunction([
    [protocolMap['1.19.3'], 0x11],
    [protocolMap['1.19.1'], 0x12],
    [protocolMap['1.19'], 0x11],
    [protocolMap['1.17'], 0x0f],
    [protocolMap['1.16.4'], 0x10]
  ]),
  SERVERBOUND_CLOSE_WINDOW: generateIdFunction([
    [protocolMap['1.19.3'], 0x0f],
    [protocolMap['1.19.1'], 0x0c],
    [protocolMap['1.19'], 0x0b],
    [protocolMap['1.17'], 0x09],
    [protocolMap['1.16.4'], 0x0a]
  ]),
  SERVERBOUND_CLIENT_SETTINGS: generateIdFunction([
    [protocolMap['1.19.3'], 0x07],
    [protocolMap['1.19.1'], 0x08],
    [protocolMap['1.19'], 0x07],
    [protocolMap['1.16.4'], 0x05]
  ]),
  SERVERBOUND_CLIENT_STATUS: generateIdFunction([
    [protocolMap['1.19.3'], 0x06],
    [protocolMap['1.19.1'], 0x07],
    [protocolMap['1.19'], 0x06],
    [protocolMap['1.16.4'], 0x04]
  ]),
  SERVERBOUND_CHAT_MESSAGE: generateIdFunction([
    [protocolMap['1.19.1'], 0x05],
    [protocolMap['1.19'], 0x04],
    [protocolMap['1.16.4'], 0x03]
  ]),
  SERVERBOUND_CHAT_COMMAND: generateIdFunction([
    [protocolMap['1.19.1'], 0x04],
    [protocolMap['1.19'], 0x03],
    [protocolMap['1.16.4'], null]
  ]),
  SERVERBOUND_PONG: generateIdFunction([
    [protocolMap['1.19.4'], 0x20],
    [protocolMap['1.19.3'], 0x1f],
    [protocolMap['1.19.1'], 0x20],
    [protocolMap['1.19'], 0x1f],
    [protocolMap['1.17'], 0x1d]
  ])
}

export default packetIds
