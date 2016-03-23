'use strict';

import * as request from 'superagent'
import * as url from 'url'
import * as sodium from 'libsodium-wrappers'
import * as querystring from 'querystring'

export interface Conf {
  launcherBaseUrl: string
  token?: string
  sharedKey?: Uint8Array
  nonce?: Uint8Array
}

export interface Request {
  path: string
  method: string
  jsonBody?: any
  rawBody?: string
  query?: { [name: string]: string }
  doNotEncrypt?: boolean
  jsonResponse?: boolean
  doNotAuth?: boolean
}

export type RequestBuilder = (client: Client, req: Request) => Promise<request.SuperAgentRequest>
export type ResponseHandler = (
  client: Client,
  resp: request.Response,
  decrypt: boolean,
  jsonResponse: boolean
) => Promise<request.Response>
export type Logger = (message?: any, ...optionalParams: any[]) => void

const doNotDecryptResponses = {
  200: 'OK',
  202: 'Accepted',
  500: 'Server Error'
}

export class ApiError {
  resp: request.Response
  constructor(resp: request.Response) {
    this.resp = resp
  }
  
  toString() {
    return this.resp.status + ': ' + this.resp.text
  }
}

export class Client {
  conf: Conf
  requestBuilder: RequestBuilder
  responseHandler: ResponseHandler
  logger: Logger

  constructor(conf?: Conf) {
    if (conf == null) this.conf = { launcherBaseUrl: 'http://localhost:8100/' }
    else this.conf = conf
    this.requestBuilder = (client, req) => new Promise((resolve) => resolve(client.buildRequest(req)))
    this.responseHandler = (client, resp, decrypt, jsonResponse) => new Promise((resolve) => {
      resolve(client.handleResponse(resp, decrypt, jsonResponse))
    })
  }
  
  do(req: Request): Promise<request.Response> {
    return this.requestBuilder(this, req).then(httpReq => {
      return new Promise<request.Response>((resolve, reject) => {
        httpReq.end((err, res) => {
          if (err != null) reject(err)
          else resolve(res)
        })
      })
    }).then(resp => {
      return this.responseHandler(this, resp, !req.doNotEncrypt, req.jsonResponse)
    })
  }

  private buildRequest(req: Request): request.SuperAgentRequest {
    const fullUrl = url.parse(this.conf.launcherBaseUrl)
    fullUrl.pathname = req.path
    // We might have to encrypt the query values
    if (req.query != null) {
      if (req.doNotEncrypt) fullUrl.query = req.query
      else fullUrl.search = this.encryptAndBase64(querystring.stringify(req.query))
    }
    
    const httpReq = request(req.method, url.format(fullUrl))
    if (this.logger != null) this.logger('Calling ' + req.method + ' ' + url.format(fullUrl))
    
    // Set the body
    if (req.jsonBody != null) req.rawBody = JSON.stringify(req.jsonBody)
    if (req.rawBody != null) {
      if (this.logger != null) this.logger('REQ BODY', req.rawBody)
      // Encrypt if necessary
      if (req.doNotEncrypt) {
        httpReq.send(req.rawBody)
        if (req.jsonBody != null) httpReq.set('Content-Type', 'application/json')
        else httpReq.set('Content-Type', 'text/plain')
      } else {
        httpReq.set('Content-Type', 'text/plain')
        httpReq.send(this.encryptAndBase64(req.rawBody))
      }
    }
    
    // Auth if necessary
    if (this.conf.token != null && !req.doNotAuth) httpReq.set('authorization', 'Bearer ' + this.conf.token)
    
    // TODO: Ug - https://github.com/visionmedia/superagent/issues/852
    httpReq['then'] = null
    
    return httpReq
  }
  
  private handleResponse(resp: request.Response, decrypt: boolean, jsonResponse: boolean): request.Response {
    // Decrypt that body if necessary (some things we ignore)
    if (decrypt && resp.text.length > 0 && doNotDecryptResponses[resp.status] != resp.text) {
      resp.text = this.unbase64AndDecrypt(resp.text)
    }
    if (this.logger != null) this.logger('RESP BODY', resp.text)
    if (resp.status < 200 || resp.status >= 300) throw new ApiError(resp)
    // Go ahead and parse JSON if it wants it (this may be redundant if not encrypted but oh well)
    if (jsonResponse) resp.body = JSON.parse(resp.text)
    return resp
  }
  
  private encryptAndBase64(input: string): string {
    return sodium.crypto_secretbox_easy(input, this.conf.nonce, this.conf.sharedKey, 'base64')
  }
  
  private unbase64AndDecrypt(input: string): string {
    return sodium.crypto_secretbox_open_easy(sodium.from_base64(input), this.conf.nonce, this.conf.sharedKey, 'text')
  }
}