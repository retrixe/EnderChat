module.exports = {
  env: {
    production: {
      plugins: ['transform-remove-console']
    }
  },
  presets: ['module:@react-native/babel-preset'],
  // The following plugin will rewrite imports. Reimplementations of node
  // libraries such as `assert`, `buffer`, etc. will be picked up
  // automatically by the React Native packager.  All other built-in node
  // libraries get rewritten to their browserify counterpart.
  plugins: [
    // uuid wants react-native-get-random-bytes. r-n-randombytes and asyncstorage-down were here.
    // constants-browserify react-native-crypto http-dns dns.js react-native-level-fs stream-http
    // https-browserify react-native-os path-browserify querystring-es3 stream-browserify process
    // readable-stream browserify-zlib url util text-encoding-shim events assert react-native-udp
    [
      'module:babel-plugin-rewrite-require',
      {
        aliases: {
          /* Now unused, was effort to get minecraft-protocol/server-util to work.
          constants: 'constants-browserify',
          crypto: 'react-native-crypto', // crypto: 'crypto-browserify',
          dgram: 'react-native-udp', // Custom.
          dns: 'http-dns', // dns: 'dns.js' or 'node-libs-browser/mock/dns',
          // domain: 'domain-browser',
          fs: 'react-native-level-fs',
          http: 'stream-http',
          https: 'https-browserify',
          macaddress: 'constants-browserify', // Custom.
          net: 'react-native-tcp', // net: 'node-libs-browser/mock/net',
          os: 'react-native-os', // os: 'os-browserify/browser',
          path: 'path-browserify',
          querystring: 'querystring-es3', */
          stream: 'stream-browserify',
          _stream_duplex: 'readable-stream/duplex',
          _stream_passthrough: 'readable-stream/passthrough',
          _stream_readable: 'readable-stream/readable',
          _stream_transform: 'readable-stream/transform',
          _stream_writable: 'readable-stream/writable',
          // sys: 'util',
          // timers: 'timers-browserify',
          // tls: 'node-libs-browser/mock/tls',
          // tty: 'tty-browserify',
          // vm: 'vm-browserify',
          zlib: 'browserify-zlib',
          // You can also mock any libraries that you don't need to support on
          // React Native, but have to be present for 3rd party code to work:
          'some-third-party-dependency': 'node-libs-browser/mock/empty'
        },
        throwForNonStringLiteral: true
      }
    ]
  ]
}
