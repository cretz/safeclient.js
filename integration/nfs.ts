'use strict';

import { client, Utils } from './bootstrap'
import * as safe from '../src/index'
import { assert } from 'chai'

describe('safeclient.js', function() {
  // We'll give the whole set of tests 10 minutes as an arbitrarily high barrier
  this.timeout(1000 * 60 * 10)
  const scenarios = [
    { shared: false, private: false }
  ]
  
  scenarios.forEach(scenario => {
    const desc = 'NFS ' + (scenario.shared ? 'shared' : 'not shared') +
      ' and ' + (scenario.private ? 'private' : 'public')
    describe(desc, () => {
      // Create top-level dir and tear down at the end
      const topLevelName = Utils.randomName()
      const topLevelDir = '/' + topLevelName
      before(() => {
        return safe.nfs.createDir(client, {
          dirPath: topLevelDir,
          isPrivate: scenario.private,
          // TODO: https://maidsafe.atlassian.net/browse/CS-57 (we're ignoring all metadata for now)
          metadata: '',
          isPathShared: scenario.shared
        })
      })
      after(() => {
        return safe.nfs.deleteDir(client, {
          dirPath: topLevelDir,
          isPathShared: scenario.shared
        })
      })
      
      it('correctly handles directory operations', () => {
        // Make sure our top level dir is there
        let p: Promise<any> = safe.nfs.getDir(client, { dirPath: '/', isPathShared: scenario.shared }).then(resp => {
          const foundDir = resp.subDirectories.find(dir => dir.name == topLevelName)
          assert.isNotNull(foundDir)
        })
        return p
      })
    })
  })
})