'use strict';

import * as client from './client'
import * as sodium from 'libsodium-wrappers'
import * as request from 'superagent'

export type Permission = 'SAFE_DRIVE_ACCESS'

export interface AuthInfo {
  app: AuthAppInfo
  permissions?: Permission[]
  // Base 64'd
  publicKey?: string
  // Base 64'd
  nonce?: string
}

export interface AuthAppInfo {
  name: string
  id: string
  version: string
  vendor: string
}

export interface AuthResult {
  info: AuthInfo
  token: string
  sharedKey: Uint8Array
  nonce: Uint8Array
}

interface AuthResponse {
  token: string
  encryptedKey: string
  publicKey: string
}

// If privateKey (which is base64'd) is not present, keys are generated and set in info
export function auth(cl: client.Client, info: AuthInfo, privateKey?: string): Promise<AuthResult> {
  return new Promise<request.Response>(resolve => {
    if (privateKey == null) {
      ;({ publicKey: info.publicKey, privateKey: privateKey } = sodium.crypto_box_keypair('base64'))
      info.nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES, 'base64')
    }
    // The launcher breaks unless we have an explicit permissions array
    if (info.permissions == null) info.permissions = []
    
    const req: client.Request = {
      path: '/auth',
      method: 'POST',
      jsonBody: info,
      doNotEncrypt: true,
      jsonResponse: true
    }
    resolve(cl.do(req))
  }).then(resp => {
    const result = <AuthResponse>resp.body
    // I acknowledge this may be base64 decoding something that was just encoded above but
    // the code clarity outweighs the cost of extra decoding IMO
    const data = sodium.crypto_box_open_easy(
      sodium.from_base64(result.encryptedKey),
      sodium.from_base64(info.nonce),
      sodium.from_base64(result.publicKey),
      sodium.from_base64(privateKey)
    )
    return {
      info: info,
      token: result.token,
      sharedKey: data.slice(0, sodium.crypto_secretbox_KEYBYTES),
      nonce: data.slice(sodium.crypto_secretbox_KEYBYTES)
    }
  })
}

export function isValidToken(cl: client.Client): Promise<boolean> {
  if (cl.conf.token == null) return Promise.resolve(false)
  return new Promise<request.Response>(resolve => {
    resolve(cl.do({
      path: '/auth',
      method: 'GET',
      doNotEncrypt: true
    }))
  }).then(_ => { return true }).catch(err => {
    // 401 is simply a false, not an error
    if (err instanceof client.ApiError && (<client.ApiError>err).resp.status == 401) return Promise.resolve(false)
    else return Promise.reject(err)
  })
}

// Automatically sets client.conf.token, client.conf.sharedKey, and client.conf.nonce
export function ensureAuthed(cl: client.Client, info: AuthInfo): Promise<any> {
  return isValidToken(cl).then(valid => {
    if (valid) return
    // Clear out the existing conf values and auth
    cl.conf.token = null
    cl.conf.sharedKey = null
    cl.conf.nonce = null
    return auth(cl, info).then(res => {
      cl.conf.token = res.token
      cl.conf.sharedKey = res.sharedKey
      cl.conf.nonce = res.nonce
    })
  })
}