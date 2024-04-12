import { protocolMap } from '../utils'

const generateIdFunction =
  (ids: Array<[number, number | null]>) => (protocolVersion: number) => {
    for (const [version, id] of ids) {
      if (version <= protocolVersion) return id
    }
    return null
  }

const packetIds = {
  // ===================
  // Clientbound (login)
  // ===================
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

  // ===========================
  // Clientbound (configuration)
  // ===========================
  CLIENTBOUND_DISCONNECT_CONFIGURATION: generateIdFunction([
    [protocolMap['1.20.2'], 0x01]
  ]),
  CLIENTBOUND_FINISH_CONFIGURATION: generateIdFunction([
    [protocolMap['1.20.2'], 0x02]
  ]),
  CLIENTBOUND_KEEP_ALIVE_CONFIGURATION: generateIdFunction([
    [protocolMap['1.20.2'], 0x03]
  ]),
  CLIENTBOUND_PING_CONFIGURATION: generateIdFunction([
    [protocolMap['1.20.2'], 0x04]
  ]),
  CLIENTBOUND_ADD_RESOURCE_PACK_CONF: generateIdFunction([
    [protocolMap['1.20.3'], 0x07],
    [protocolMap['1.20.2'], 0x06]
  ]),

  // ===========================
  // Serverbound (configuration)
  // ===========================
  SERVERBOUND_KEEP_ALIVE_CONFIGURATION: generateIdFunction([
    [protocolMap['1.20.2'], 0x03]
  ]),
  SERVERBOUND_PONG_CONFIGURATION: generateIdFunction([
    [protocolMap['1.20.2'], 0x04]
  ]),
  SERVERBOUND_RESOURCE_PACK_RESPONSE_CONF: generateIdFunction([
    [protocolMap['1.20.2'], 0x05]
  ]),

  // ==================
  // Clientbound (play)
  // ==================
  CLIENTBOUND_KEEP_ALIVE_PLAY: generateIdFunction([
    [protocolMap['1.20.2'], 0x24],
    [protocolMap['1.19.4'], 0x23],
    [protocolMap['1.19.3'], 0x1f],
    [protocolMap['1.19.1'], 0x20],
    [protocolMap['1.19'], 0x1e],
    [protocolMap['1.17'], 0x21],
    [protocolMap['1.16.4'], 0x1f]
  ]),
  CLIENTBOUND_DISCONNECT_PLAY: generateIdFunction([
    [protocolMap['1.20.2'], 0x1b],
    [protocolMap['1.19.4'], 0x1a],
    [protocolMap['1.19.3'], 0x17],
    [protocolMap['1.19.1'], 0x19],
    [protocolMap['1.19'], 0x17],
    [protocolMap['1.17'], 0x1a],
    [protocolMap['1.16.4'], 0x19]
  ]),
  CLIENTBOUND_LOGIN_PLAY: generateIdFunction([
    [protocolMap['1.20.2'], 0x29],
    [protocolMap['1.19.4'], 0x28],
    [protocolMap['1.19.3'], 0x24],
    [protocolMap['1.19.1'], 0x25],
    [protocolMap['1.19'], 0x23],
    [protocolMap['1.17'], 0x26],
    [protocolMap['1.16.4'], 0x24]
  ]),
  CLIENTBOUND_RESPAWN: generateIdFunction([
    [protocolMap['1.20.3'], 0x45],
    [protocolMap['1.20.2'], 0x43],
    [protocolMap['1.19.4'], 0x41],
    [protocolMap['1.19.3'], 0x3d],
    [protocolMap['1.19.1'], 0x3e],
    [protocolMap['1.19'], 0x3b],
    [protocolMap['1.17'], 0x3d],
    [protocolMap['1.16.4'], 0x39]
  ]),
  // AKA Set Health
  CLIENTBOUND_UPDATE_HEALTH: generateIdFunction([
    [protocolMap['1.20.3'], 0x5b],
    [protocolMap['1.20.2'], 0x59],
    [protocolMap['1.19.4'], 0x57],
    [protocolMap['1.19.3'], 0x53],
    [protocolMap['1.19.1'], 0x55],
    [protocolMap['1.17'], 0x52],
    [protocolMap['1.16.4'], 0x49]
  ]),
  // AKA Combat Death
  CLIENTBOUND_DEATH_COMBAT_EVENT: generateIdFunction([
    [protocolMap['1.20.2'], 0x3a],
    [protocolMap['1.19.4'], 0x38],
    [protocolMap['1.19.3'], 0x34],
    [protocolMap['1.19.1'], 0x36],
    [protocolMap['1.19'], 0x33],
    [protocolMap['1.17'], 0x35],
    [protocolMap['1.16.4'], 0x31]
  ]),
  // AKA Open Screen
  CLIENTBOUND_OPEN_WINDOW: generateIdFunction([
    [protocolMap['1.20.2'], 0x31],
    [protocolMap['1.19.4'], 0x30],
    [protocolMap['1.19.3'], 0x2c],
    [protocolMap['1.19.1'], 0x2d],
    [protocolMap['1.19'], 0x2b],
    [protocolMap['1.16.4'], 0x2e]
  ]),
  CLIENTBOUND_ACTION_BAR: generateIdFunction([
    [protocolMap['1.20.3'], 0x4a],
    [protocolMap['1.20.2'], 0x48],
    [protocolMap['1.19.4'], 0x46],
    [protocolMap['1.19.3'], 0x42],
    [protocolMap['1.19.1'], 0x43],
    [protocolMap['1.19'], 0x40],
    [protocolMap['1.17'], 0x41]
  ]),
  CLIENTBOUND_TITLE: generateIdFunction([
    [protocolMap['1.17'], null],
    [protocolMap['1.16.4'], 0x4f]
  ]),
  CLIENTBOUND_CHAT_MESSAGE: generateIdFunction([
    [protocolMap['1.19'], null],
    [protocolMap['1.17'], 0x0f],
    [protocolMap['1.16.4'], 0x0e]
  ]),
  CLIENTBOUND_PLAYER_CHAT_MESSAGE: generateIdFunction([
    [protocolMap['1.20.2'], 0x37],
    [protocolMap['1.19.4'], 0x35],
    [protocolMap['1.19.3'], 0x31],
    [protocolMap['1.19.1'], 0x33],
    [protocolMap['1.19'], 0x30]
  ]),
  CLIENTBOUND_SYSTEM_CHAT_MESSAGE: generateIdFunction([
    [protocolMap['1.20.3'], 0x69],
    [protocolMap['1.20.2'], 0x67],
    [protocolMap['1.19.4'], 0x64],
    [protocolMap['1.19.3'], 0x60],
    [protocolMap['1.19.1'], 0x62],
    [protocolMap['1.19'], 0x5f]
  ]),
  CLIENTBOUND_PING_PLAY: generateIdFunction([
    [protocolMap['1.20.2'], 0x33],
    [protocolMap['1.19.4'], 0x32],
    [protocolMap['1.19.3'], 0x2e],
    [protocolMap['1.19.1'], 0x2f],
    [protocolMap['1.19'], 0x2d],
    [protocolMap['1.17'], 0x30]
  ]),
  CLIENTBOUND_START_CONFIGURATION: generateIdFunction([
    [protocolMap['1.20.3'], 0x67],
    [protocolMap['1.20.2'], 0x65]
  ]),
  // AKA Resource Pack Send
  // AKA Resource Pack
  CLIENTBOUND_ADD_RESOURCE_PACK_PLAY: generateIdFunction([
    [protocolMap['1.20.3'], 0x44],
    [protocolMap['1.20.2'], 0x42],
    [protocolMap['1.19.4'], 0x40],
    [protocolMap['1.19.3'], 0x3c],
    [protocolMap['1.19.2'], 0x3d],
    [protocolMap['1.19'], 0x3a],
    [protocolMap['1.17'], 0x3c],
    [protocolMap['1.16.4'], 0x38]
  ]),

  // ==================
  // Serverbound (play)
  // ==================
  SERVERBOUND_KEEP_ALIVE_PLAY: generateIdFunction([
    [protocolMap['1.20.3'], 0x15],
    [protocolMap['1.20.2'], 0x14],
    [protocolMap['1.19.4'], 0x12],
    [protocolMap['1.19.3'], 0x11],
    [protocolMap['1.19.1'], 0x12],
    [protocolMap['1.19'], 0x11],
    [protocolMap['1.17'], 0x0f],
    [protocolMap['1.16.4'], 0x10]
  ]),
  // AKA Close Container
  SERVERBOUND_CLOSE_WINDOW: generateIdFunction([
    [protocolMap['1.20.2'], 0x0e],
    [protocolMap['1.19.4'], 0x0c],
    [protocolMap['1.19.3'], 0x0f],
    [protocolMap['1.19.1'], 0x0c],
    [protocolMap['1.19'], 0x0b],
    [protocolMap['1.17'], 0x09],
    [protocolMap['1.16.4'], 0x0a]
  ]),
  // AKA Client Information
  SERVERBOUND_CLIENT_SETTINGS: generateIdFunction([
    [protocolMap['1.20.2'], 0x09],
    [protocolMap['1.19.4'], 0x08],
    [protocolMap['1.19.3'], 0x07],
    [protocolMap['1.19.1'], 0x08],
    [protocolMap['1.19'], 0x07],
    [protocolMap['1.16.4'], 0x05]
  ]),
  // AKA Client Command
  SERVERBOUND_CLIENT_STATUS: generateIdFunction([
    [protocolMap['1.20.2'], 0x08],
    [protocolMap['1.19.4'], 0x07],
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
  SERVERBOUND_PONG_PLAY: generateIdFunction([
    [protocolMap['1.20.3'], 0x24],
    [protocolMap['1.20.2'], 0x23],
    [protocolMap['1.19.4'], 0x20],
    [protocolMap['1.19.3'], 0x1f],
    [protocolMap['1.19.1'], 0x20],
    [protocolMap['1.19'], 0x1f],
    [protocolMap['1.17'], 0x1d]
  ]),
  SERVERBOUND_ACKNOWLEDGE_CONFIGURATION: generateIdFunction([
    [protocolMap['1.20.2'], 0x0b]
  ]),
  // AKA Resource Pack Status
  // AKA Resource Pack
  SERVERBOUND_RESOURCE_PACK_RESPONSE_PLAY: generateIdFunction([
    [protocolMap['1.20.3'], 0x43],
    [protocolMap['1.20.2'], 0x27],
    [protocolMap['1.19.2'], 0x24],
    [protocolMap['1.19'], 0x23],
    [protocolMap['1.16.4'], 0x21]
  ])
}

export default packetIds
