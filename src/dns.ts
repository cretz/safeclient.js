'use strict';

import * as client from './client'
import { nfs } from './nfs'

export module dns {
  export function getLongNames(cl: client.Client): Promise<string[]> {
    return cl.do({
      path: '/dns',
      method: 'GET',
      jsonResponse: true
    }).then(resp => <string[]>resp.body)
  }
  
  export function getServices(cl: client.Client, longName: string): Promise<string[]> {
    return cl.do({
      path: `/dns/${encodeURIComponent(longName)}`,
      method: 'GET',
      jsonResponse: true
    }).then(resp => <string[]>resp.body)
  }
  
  export function getServiceDir(cl: client.Client, longName: string, service: string): Promise<nfs.DirResponse> {
    return cl.do({
      path: `/dns/${encodeURIComponent(service)}/${encodeURIComponent(longName)}`,
      method: 'GET',
      jsonResponse: true,
      doNotEncrypt: true,
      doNotAuth: true
    }).then(resp => <nfs.DirResponse>resp.body)
  }
  
  export interface FileInfo {
    longName: string
    service: string
    filePath: string
    offset?: number
    length?: number
  }
  
  export interface File {
    info: nfs.FileInfo
    contentType: string
    body: Buffer
  }
  
  export function getFile(cl: client.Client, info: FileInfo): Promise<File> {
    return cl.do({
      path: `/dns/${encodeURIComponent(info.service)}/${encodeURIComponent(info.longName)}/${encodeURIComponent(info.filePath)}`,
      method: 'GET',
      query: { offset: info.offset, length: info.length },
      doNotEncrypt: true,
      doNotAuth: true
    }).then(resp => {
      return {
        info: {
          name: resp.header['file-name'],
          size: parseInt(resp.header['file-size'], 10),
          createdOn: parseInt(resp.header['file-created-time'], 10),
          modifiedOn: parseInt(resp.header['file-modified-time'], 10),
          metadata: resp.header['file-metadata']
        },
        contentType: resp.header['content-type'],
        body: new Buffer(resp.text)
      }
    })
  }
  
  export interface RegisterInfo {
    longName: string
    serviceName: string
    serviceHomeDirPath: string
    isPathShared?: boolean
  }
  
  export function register(cl: client.Client, info: RegisterInfo): Promise<any> {
    return cl.do({
      path: '/dns',
      method: 'POST',
      jsonBody: info
    })
  }
  
  export function createLongName(cl: client.Client, longName: string): Promise<any> {
    return cl.do({
      path: `/dns/${encodeURIComponent(longName)}`,
      method: 'POST'
    })
  }
  
  export interface AddServiceInfo {
    longName: string
    serviceName: string
    serviceHomeDirPath: string
    isPathShared?: boolean
  }
  
  export function addService(cl: client.Client, info: AddServiceInfo): Promise<any> {
    return cl.do({
      path: '/dns',
      method: 'PUT',
      jsonBody: info
    })
  }
  
  export function deleteLongName(cl: client.Client, longName: string): Promise<any> {
    return cl.do({
      path: `/dns/${encodeURIComponent(longName)}`,
      method: 'DELETE'
    })
  }
  
  export function deleteService(cl: client.Client, longName: string, service: string): Promise<any> {
    return cl.do({
      path: `/dns/${encodeURIComponent(service)}/${encodeURIComponent(longName)}`,
      method: 'DELETE'
    })
  }
}