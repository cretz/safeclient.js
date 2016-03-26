'use strict';

import { client, Utils } from './bootstrap'
import * as safe from '../src/index'
import { assert } from 'chai'
import { posix } from 'path'

describe('safeclient.js', function() {
  // We'll give the whole set of tests 10 minutes as an arbitrarily high barrier
  this.timeout(1000 * 60 * 10)
  const scenarios = [
    { shared: false, private: false },
    { shared: true, private: false },
    { shared: false, private: true },
    { shared: true, private: true }
  ]
  
  scenarios.forEach(scenario => {
    const desc = 'NFS ' + (scenario.shared ? 'shared' : 'not shared') +
      ' and ' + (scenario.private ? 'private' : 'public')
    describe(desc, () => {
      // Create top-level dir and tear down at the end (ignoring error)
      const topLevelName = Utils.randomName()
      const topLevelPath = '/' + topLevelName
      before(() => safe.nfs.createDir(client, {
        dirPath: topLevelPath,
        isPrivate: scenario.private,
        // TODO: https://maidsafe.atlassian.net/browse/CS-57 (we're ignoring all metadata for now)
        metadata: '',
        isPathShared: scenario.shared
      }))
      after(() => safe.nfs.deleteDir(client, {
        dirPath: topLevelPath,
        isPathShared: scenario.shared
      }).catch(_ => {}))
      
      it('correctly handles directory operations', () => {
        let p: Promise<any> = Promise.resolve()
        
        // Make sure our top level dir is there
        p = p.then(_ => {
          return safe.nfs.getDir(client, { dirPath: '/', isPathShared: scenario.shared }).then(resp => {
            const foundDir = resp.subDirectories.find(dir => dir.name == topLevelName)
            assert.isNotNull(foundDir)
            assert.equal(foundDir.isPrivate, scenario.private)
            assert.equal(foundDir.metadata, '')
            assert.equal(foundDir.createdOn, foundDir.modifiedOn)
            // Is in the past 20 seconds?
            assert.isBelow(foundDir.createdOn, Date.now())
            assert.isAbove(foundDir.createdOn, Date.now() - (20 * 1000))
          })
        })
        
        // Grab just this directory and make sure it has no files and it's right
        p = p.then(_ => {
          return safe.nfs.getDir(client, { dirPath: topLevelPath, isPathShared: scenario.shared }).then(resp => {
            assert.lengthOf(resp.files, 0)
            assert.lengthOf(resp.subDirectories, 0)
            assert.equal(resp.info.name, topLevelName)
          })
        })
        
        // Add a child directory, and make sure it looks right
        const childName = Utils.randomName()
        const childPath = posix.join(topLevelPath, childName)
        p = p.then(_ => {
          return safe.nfs.createDir(client, {
            dirPath: childPath,
            isPrivate: scenario.private,
            metadata: '',
            isPathShared: scenario.shared
          }).then(_ => {
            // Re-get the top dir and check
            return safe.nfs.getDir(client, { dirPath: topLevelPath, isPathShared: scenario.shared }).then(resp => {
              assert.lengthOf(resp.files, 0)
              assert.lengthOf(resp.subDirectories, 1)
              const childDir = resp.subDirectories[0]
              assert.equal(childDir.name, childName)
              assert.equal(childDir.isPrivate, scenario.private)
            })
          })
        })
        
        // Change the child dir name and make sure it took
        const newChildName = Utils.randomName()
        const newChildPath = posix.join(topLevelPath, newChildName)
        p = p.then(_ => {
          return safe.nfs.changeDir(client, {
            dirPath: childPath,
            isPathShared: scenario.shared,
            newInfo: { name: newChildName }
          }).then(_ => {
            // Re-get the top dir and check
            return safe.nfs.getDir(client, { dirPath: topLevelPath, isPathShared: scenario.shared }).then(resp => {
              assert.lengthOf(resp.subDirectories, 1)
              assert.equal(resp.subDirectories[0].name, newChildName)
            })
          })
        })
        
        // Delete the child directory and make sure it's gone
        p = p.then(_ => {
          return safe.nfs.deleteDir(client, { dirPath: newChildPath, isPathShared: scenario.shared }).then(_ => {
            // Re-get the top dir and check
            return safe.nfs.getDir(client, { dirPath: topLevelPath, isPathShared: scenario.shared }).then(resp => {
              assert.lengthOf(resp.subDirectories, 0)
            })
          })
        })
        
        return p
      })
      
      it('correctly handles file operations', () => {
        // Create a file in base directory and make sure it's there
        const fileName = Utils.randomName()
        const filePath = posix.join(topLevelPath, fileName)
        let p: Promise<any> = safe.nfs.createFile(client, {
          filePath: filePath,
          isPathShared: scenario.shared,
          metadata: ''
        }).then(_ => {
          // Grab top dir and check
          return safe.nfs.getDir(client, { dirPath: topLevelPath, isPathShared: scenario.shared }).then(resp => {
            assert.lengthOf(resp.subDirectories, 0)
            assert.lengthOf(resp.files, 1)
            assert.equal(resp.files[0].name, fileName)
            assert.equal(resp.files[0].size, 0)
            // Is in the past 20 seconds?
            assert.isBelow(resp.files[0].createdOn, Date.now())
            assert.isAbove(resp.files[0].createdOn, Date.now() - (20 * 1000))
          })
        })
        
        // Change the name and confirm changed
        const newFileName = Utils.randomName()
        const newFilePath = posix.join(topLevelPath, newFileName)
        p = p.then(_ => {
          return safe.nfs.changeFile(client, {
            filePath: filePath,
            isPathShared: scenario.shared,
            newInfo: { name: newFileName }
          }).then(_ => {
            return safe.nfs.getDir(client, { dirPath: topLevelPath, isPathShared: scenario.shared }).then(resp => {
              assert.lengthOf(resp.files, 1)
              assert.equal(resp.files[0].name, newFileName)
            })
          })
        })
        
        // Write "FOO BAR BAZ" and make sure the size and dates are right
        p = p.then(_ => {
          return safe.nfs.writeFile(client, {
            filePath: newFilePath,
            isPathShared: scenario.shared,
            contents: 'FOO BAR BAZ'
          }).then(_ => {
            return safe.nfs.getDir(client, { dirPath: topLevelPath, isPathShared: scenario.shared }).then(resp => {
              assert.lengthOf(resp.files, 1)
              assert.equal(resp.files[0].size, 11)
              assert.isAbove(resp.files[0].modifiedOn, resp.files[0].createdOn)
            })
          })
        })
        
        // Full content has to be right
        p = p.then(_ => {
          return safe.nfs.getFile(client, {
            filePath: newFilePath,
            isPathShared: scenario.shared
          }).then(fileBuf => {
            assert.equal(fileBuf.toString(), 'FOO BAR BAZ')
          })
        })
        
        // Pull out just "O BAR B"
        p = p.then(_ => {
          return safe.nfs.getFile(client, {
            filePath: newFilePath,
            isPathShared: scenario.shared,
            offset: 2,
            length: 7
          }).then(fileBuf => {
            assert.equal(fileBuf.toString(), 'O BAR B')
          })
        })

        // Change BAR to QUX and confirm
        p = p.then(_ => {
          return safe.nfs.writeFile(client, {
            filePath: newFilePath,
            isPathShared: scenario.shared,
            contents: 'QUX',
            offset: 4
          }).then(_ => {
            return safe.nfs.getFile(client, {
              filePath: newFilePath,
              isPathShared: scenario.shared
            }).then(fileBuf => {
              assert.equal(fileBuf.toString(), 'FOO QUX BAZ')
            })
          })
        })
        
        // Delete file and make sure it's no longer there
        p = p.then(_ => {
          return safe.nfs.deleteFile(client, { filePath: newFilePath, isPathShared: scenario.shared }).then(_ => {
            return safe.nfs.getDir(client, { dirPath: topLevelPath, isPathShared: scenario.shared }).then(resp => {
              assert.lengthOf(resp.files, 0)
            })
          })
        })
        
        return p
      })
    })
  })
})