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

class PacketIds(protocolVersion: Int) {
    // Login state packet IDs
    val loginSuccess = 0x02
    val loginAcknowledged = 0x03
    val setCompression = 0x03

    // Configuration state packet IDs
    val configurationKeepAliveClientBound =
        if (protocolVersion >= PROTOCOL_VERSION_1205) 0x04
        else 0x03

    val configurationKeepAliveServerBound =
        if (protocolVersion >= PROTOCOL_VERSION_1205) 0x04
        else 0x03

    val finishConfigurationClientBound =
        if (protocolVersion >= PROTOCOL_VERSION_1205) 0x03
        else 0x02

    val finishConfigurationServerBound =
        if (protocolVersion >= PROTOCOL_VERSION_1205) 0x03
        else 0x02

    // Play state packet IDs
    val startConfigurationClientBound =
        if (protocolVersion >= PROTOCOL_VERSION_1205) 0x69
        else if (protocolVersion >= PROTOCOL_VERSION_1203) 0x67
        else if (protocolVersion >= PROTOCOL_VERSION_1202) 0x65
        else -1

    val acknowledgeConfigurationServerBound =
        if (protocolVersion >= PROTOCOL_VERSION_1205) 0x0c
        else if (protocolVersion >= PROTOCOL_VERSION_1202) 0x0b
        else -1

    val playKeepAliveClientBound =
        if (protocolVersion >= PROTOCOL_VERSION_1205) 0x26
        else if (protocolVersion >= PROTOCOL_VERSION_1202) 0x24
        else if (protocolVersion >= PROTOCOL_VERSION_1194) 0x23
        else if (protocolVersion >= PROTOCOL_VERSION_1193) 0x1f
        else if (protocolVersion >= PROTOCOL_VERSION_1191) 0x20
        else if (protocolVersion >= PROTOCOL_VERSION_119) 0x1e
        else if (protocolVersion >= PROTOCOL_VERSION_117) 0x21
        else if (protocolVersion >= PROTOCOL_VERSION_1164) 0x1f
        else -1

    val playKeepAliveServerBound =
        if (protocolVersion >= PROTOCOL_VERSION_1205) 0x18
        else if (protocolVersion >= PROTOCOL_VERSION_1203) 0x15
        else if (protocolVersion >= PROTOCOL_VERSION_1202) 0x14
        else if (protocolVersion >= PROTOCOL_VERSION_1194) 0x12
        else if (protocolVersion >= PROTOCOL_VERSION_1193) 0x11
        else if (protocolVersion >= PROTOCOL_VERSION_1191) 0x12
        else if (protocolVersion >= PROTOCOL_VERSION_119) 0x11
        else if (protocolVersion >= PROTOCOL_VERSION_117) 0x0f
        else if (protocolVersion >= PROTOCOL_VERSION_1164) 0x10
        else -1
}
