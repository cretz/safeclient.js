'use strict';

import * as client from './client'

export module nfs {
  export interface DirInfo {
    name: string
    isPrivate: boolean
    isVersioned: boolean
    createdOn: number
    modifiedOn: number
    metadata: string
  }
  
  export interface FileInfo {
    name: string
    size: number
    createdOn: number
    modifiedOn: number
    metadata: string
  }
  
  export interface DirResponse {
    info: DirInfo
    files: FileInfo[]
    subDirectories: DirInfo[]
  }
  
  export interface CreateDirInfo {
    dirPath: string
    isPrivate?: boolean
    isVersioned?: boolean
    metadata?: string
    isPathShared?: boolean
  }
  
  export function createDir(cl: client.Client, info: CreateDirInfo): Promise<any> {
    return cl.do({
      path: '/nfs/directory',
      method: 'POST',
      jsonBody: info
    })
  }
  
  export interface GetDirInfo {
    dirPath: string
    isPathShared?: boolean
  }
  
  export function getDir(cl: client.Client, info: GetDirInfo): Promise<DirResponse> {
    const shared = info.isPathShared || false
    return cl.do({
      path: `/nfs/directory/${encodeURIComponent(info.dirPath)}/${shared}`,
      method: 'GET',
      jsonResponse: true 
    }).then(resp => <DirResponse>resp.body)
  }
  
  export interface DeleteDirInfo {
    dirPath: string
    isPathShared?: boolean
  }
  
  export function deleteDir(cl: client.Client, info: DeleteDirInfo): Promise<any> {
    const shared = info.isPathShared || false
    return cl.do({
      path: `/nfs/directory/${encodeURIComponent(info.dirPath)}/${shared}`,
      method: 'DELETE'
    })
  }
  
  export interface ChangeDirInfo {
    dirPath: string
    isPathShared?: boolean
    newInfo: { name: string, metadata?: string } | { name?: string, metadata: string }
  }
  
  export function changeDir(cl: client.Client, info: ChangeDirInfo): Promise<any> {
    const shared = info.isPathShared || false
    return cl.do({
      path: `/nfs/directory/${encodeURIComponent(info.dirPath)}/${shared}`,
      method: 'PUT',
      jsonBody: info.newInfo
    })
  }
  
  export interface MoveDirInfo {
    srcPath: string
    isSrcPathShared?: boolean,
    destPath: string
    isDestPathShared?: boolean,
    retainSource?: boolean
  }
  
  export function moveDir(cl: client.Client, info: MoveDirInfo): Promise<any> {
    return cl.do({
      path: '/nfs/movedir',
      method: 'POST',
      jsonBody: info
    })
  }
  
  export interface CreateFileInfo {
    filePath: string
    isPathShared?: boolean
    metadata?: string
  }
  
  export function createFile(cl: client.Client, info: CreateFileInfo): Promise<any> {
    return cl.do({
      path: '/nfs/file',
      method: 'POST',
      jsonBody: info
    })
  }
  
  export interface MoveFileInfo {
    srcPath: string
    isSrcPathShared?: boolean,
    destPath: string
    isDestPathShared?: boolean,
    retainSource?: boolean
  }
  
  export function moveFile(cl: client.Client, info: MoveFileInfo): Promise<any> {
    return cl.do({
      path: '/nfs/movefile',
      method: 'POST',
      jsonBody: info
    })
  }
  
  export interface DeleteFileInfo {
    filePath: string
    isPathShared?: boolean
  }
  
  export function deleteFile(cl: client.Client, info: DeleteFileInfo): Promise<any> {
    const shared = info.isPathShared || false
    return cl.do({
      path: `/nfs/file/${encodeURIComponent(info.filePath)}/${shared}`,
      method: 'DELETE'
    })
  }
  
  export interface ChangeFileInfo {
    filePath: string
    isPathShared?: boolean
    newInfo: { name: string, metadata?: string } | { name?: string, metadata: string }
  }
  
  export function changeFile(cl: client.Client, info: ChangeFileInfo): Promise<any> {
    const shared = info.isPathShared || false
    return cl.do({
      path: `/nfs/file/metadata/${encodeURIComponent(info.filePath)}/${shared}`,
      method: 'PUT',
      jsonBody: info.newInfo
    })
  }
  
  export interface WriteFileInfo {
    filePath: string
    isPathShared?: boolean
    contents: string|Buffer
    offset?: number
  }
  
  export function writeFile(cl: client.Client, info: WriteFileInfo): Promise<any> {
    const shared = info.isPathShared || false
    return cl.do({
      path: `/nfs/file/${encodeURIComponent(info.filePath)}/${shared}`,
      method: 'PUT',
      rawBody: info.contents.toString(),
      query: { offset: info.offset }
    })
  }
  
  export interface GetFileInfo {
    filePath: string
    isPathShared?: boolean
    offset?: number
    length?: number
  }
  
  export function getFile(cl: client.Client, info: GetFileInfo): Promise<Buffer> {
    const shared = info.isPathShared || false
    return cl.do({
      path: `/nfs/file/${encodeURIComponent(info.filePath)}/${shared}`,
      method: 'GET',
      query: { offset: info.offset, length: info.length }
    }).then(resp => new Buffer(resp.text))
  }
}