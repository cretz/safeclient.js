
declare module 'libsodium-wrappers' {
  type OutputFormat = 'uint8array' | 'text' | 'hex' | 'base64'
  const crypto_box_NONCEBYTES: number
  const crypto_secretbox_KEYBYTES: number
  
  function crypto_secretbox_easy(message: string, nonce: Uint8Array, key: Uint8Array, outputFormat?: 'uint8array'): Uint8Array
  function crypto_secretbox_easy(message: string, nonce: Uint8Array, key: Uint8Array, outputFormat: 'base64'): string
  function crypto_secretbox_easy(message: string, nonce: Uint8Array, key: Uint8Array, outputFormat: OutputFormat): any
  
  function crypto_secretbox_open_easy(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array, outputFormat?: 'uint8array'): Uint8Array
  function crypto_secretbox_open_easy(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array, outputFormat: 'text'): string
  function crypto_secretbox_open_easy(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array, outputFormat: OutputFormat): any
  
  function crypto_box_open_easy(ciphertext: Uint8Array, nonce: Uint8Array, publicKey: Uint8Array, secretKey: Uint8Array, outputFormat?: 'uint8array'): Uint8Array
  function crypto_box_open_easy(ciphertext: Uint8Array, nonce: Uint8Array, publicKey: Uint8Array, secretKey: Uint8Array, outputFormat: 'base64'): string
  function crypto_box_open_easy(ciphertext: Uint8Array, nonce: Uint8Array, publicKey: Uint8Array, secretKey: Uint8Array, outputFormat: OutputFormat): any
  
  function to_base64(arr: Uint8Array, noNewLine?: boolean): string
  function from_base64(str: string, blockSize?: number): Uint8Array
  
  interface KeyPair<T> {
    publicKey: T
    privateKey: T
  }
  
  function crypto_box_keypair(outputFormat?: 'uint8array'): KeyPair<Uint8Array>
  function crypto_box_keypair(outputFormat: 'base64'): KeyPair<string>
  function crypto_box_keypair<T>(outputFormat: OutputFormat): KeyPair<T>
  
  function randombytes_buf(length: number, outputFormat?: 'uint8array'): Uint8Array
  function randombytes_buf(length: number, outputFormat: 'base64'): string
  function randombytes_buf(length: number, outputFormat: OutputFormat): any
}