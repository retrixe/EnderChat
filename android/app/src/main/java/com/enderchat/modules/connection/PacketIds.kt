package com.enderchat.modules.connection

const val PROTOCOL_VERSION_1164 = 754
const val PROTOCOL_VERSION_117 = 755
const val PROTOCOL_VERSION_119 = 759
const val PROTOCOL_VERSION_1191 = 760
const val PROTOCOL_VERSION_1193 = 761
const val PROTOCOL_VERSION_1194 = 762
const val PROTOCOL_VERSION_1202 = 764
const val PROTOCOL_VERSION_1203 = 765
const val PROTOCOL_VERSION_1205 = 766
const val PROTOCOL_VERSION_1212 = 768

data class PacketIds(
    val protocolVersion: Int,

    // Login state packet IDs
    var loginStart: Int = 0x00,
    var encryptionResponse: Int = 0x01,
    var loginSuccess: Int = 0x02,
    var loginAcknowledged: Int = 0x03,
    var setCompression: Int = 0x03,

    // Configuration state packet IDs
    var configurationKeepAliveClientBound: Int =
        if (protocolVersion >= PROTOCOL_VERSION_1205) 0x04
        else 0x03,

    var configurationKeepAliveServerBound: Int =
        if (protocolVersion >= PROTOCOL_VERSION_1205) 0x04
        else 0x03,

    var finishConfigurationClientBound: Int =
        if (protocolVersion >= PROTOCOL_VERSION_1205) 0x03
        else 0x02,

    var finishConfigurationServerBound: Int =
        if (protocolVersion >= PROTOCOL_VERSION_1205) 0x03
        else 0x02,

    // Play state packet IDs
    var startConfigurationClientBound: Int =
        if (protocolVersion >= PROTOCOL_VERSION_1212) 0x70
        else if (protocolVersion >= PROTOCOL_VERSION_1205) 0x69
        else if (protocolVersion >= PROTOCOL_VERSION_1203) 0x67
        else if (protocolVersion >= PROTOCOL_VERSION_1202) 0x65
        else -1,

    var acknowledgeConfigurationServerBound: Int =
        if (protocolVersion >= PROTOCOL_VERSION_1212) 0x0e
        else if (protocolVersion >= PROTOCOL_VERSION_1205) 0x0c
        else if (protocolVersion >= PROTOCOL_VERSION_1202) 0x0b
        else -1,

    var playKeepAliveClientBound: Int =
        if (protocolVersion >= PROTOCOL_VERSION_1212) 0x27
        else if (protocolVersion >= PROTOCOL_VERSION_1205) 0x26
        else if (protocolVersion >= PROTOCOL_VERSION_1202) 0x24
        else if (protocolVersion >= PROTOCOL_VERSION_1194) 0x23
        else if (protocolVersion >= PROTOCOL_VERSION_1193) 0x1f
        else if (protocolVersion >= PROTOCOL_VERSION_1191) 0x20
        else if (protocolVersion >= PROTOCOL_VERSION_119) 0x1e
        else if (protocolVersion >= PROTOCOL_VERSION_117) 0x21
        else if (protocolVersion >= PROTOCOL_VERSION_1164) 0x1f
        else -1,

    var playKeepAliveServerBound: Int =
        if (protocolVersion >= PROTOCOL_VERSION_1212) 0x1a
        else if (protocolVersion >= PROTOCOL_VERSION_1205) 0x18
        else if (protocolVersion >= PROTOCOL_VERSION_1203) 0x15
        else if (protocolVersion >= PROTOCOL_VERSION_1202) 0x14
        else if (protocolVersion >= PROTOCOL_VERSION_1194) 0x12
        else if (protocolVersion >= PROTOCOL_VERSION_1193) 0x11
        else if (protocolVersion >= PROTOCOL_VERSION_1191) 0x12
        else if (protocolVersion >= PROTOCOL_VERSION_119) 0x11
        else if (protocolVersion >= PROTOCOL_VERSION_117) 0x0f
        else if (protocolVersion >= PROTOCOL_VERSION_1164) 0x10
        else -1,
)
