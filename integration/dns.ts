'use strict';

import { client, Utils } from './bootstrap'
import * as safe from '../src/index'
import { assert } from 'chai'
import { posix } from 'path'

describe('safeclient.js DNS', function() {
  // We'll give the whole set of tests 10 minutes as an arbitrarily high barrier
  this.timeout(1000 * 60 * 10)
  
  // Dir created for use by services
  const dirName = Utils.randomName()
  const dirPath = '/' + dirName
  
  // Couple of names we want to make sure we remove at the end
  const longName = Utils.randomName()
  const newLongName = Utils.randomName()
  
  // Create dir for use by services
  before(() => safe.nfs.createDir(client, { dirPath }))
  
  // Remove the dir and both long names (ignoring errors)
  after(() => Promise.all([
    safe.nfs.deleteDir(client, { dirPath }).catch(_ => {}),
    safe.dns.deleteLongName(client, longName).catch(_ => {}),
    safe.dns.deleteLongName(client, newLongName).catch(_ => {})
  ]))
  
  it('should perform normal DNS functions', () => {
    let p: Promise<any> = Promise.resolve()
    
    // First, create a name
    p = p.then(_ => {
      return safe.dns.createLongName(client, longName)
    })
    
    // Make sure name is there
    p = p.then(_ => {
      return safe.dns.getLongNames(client).then(names => assert.include(names, longName))
    })
    
    // But there are no services
    p = p.then(_ => {
      return safe.dns.getServices(client, longName).then(svcs => assert.lengthOf(svcs, 0))
    })
    
    // Create a temp file
    const fileName = Utils.randomName() + '.js'
    const filePath = posix.join(dirPath, fileName)
    p = p.then(_ => {
      return safe.nfs.createFile(client, { filePath }).then(_ => {
        return safe.nfs.writeFile(client, { filePath, contents: 'Some Content' })
      })
    })
    
    // Add a service to that dir and make sure it's there
    const serviceName = Utils.randomName()
    p = p.then(_ => {
      return safe.dns.addService(client, { longName, serviceName, serviceHomeDirPath: dirPath }).then(_ => {
        return safe.dns.getServices(client, longName).then(names => {
          assert.lengthOf(names, 1)
          assert.equal(names[0], serviceName)
        })
      })
    })
    
    // And check the dir
    p = p.then(_ => {
      return safe.dns.getServiceDir(client, longName, serviceName).then(dir => {
        assert.lengthOf(dir.files, 1)
        assert.equal(dir.files[0].name, fileName)
        assert.lengthOf(dir.subDirectories, 0)
        assert.equal(dir.info.name, dirName)
      })
    })
    
    // Try to get the whole file
    p = p.then(_ => {
      return safe.dns.getFile(client, { longName, service: serviceName, filePath: '/' + fileName }).then(file => {
        assert.equal(file.info.name, fileName)
        assert.equal(file.contentType, 'application/javascript')
        assert.equal(file.body.toString(), 'Some Content')
      })
    })
    
    // Now delete the service and make sure it's gone
    p = p.then(_ => {
      return safe.dns.deleteService(client, longName, serviceName).then(_ => {
        // TODO: Ug, https://maidsafe.atlassian.net/browse/CS-63
        // return safe.dns.getServices(client, longName).then(svcs => assert.notInclude(svcs, serviceName))
        return safe.dns.getLongNames(client).then(names => assert.notInclude(names, longName))
      })
    })
    
    // Do a "register" which should create a new DNS name and service at the same time
    const newServiceName = Utils.randomName()
    p = p.then(_ => {
      return safe.dns.register(client, {
        longName: newLongName,
        serviceName: newServiceName,
        serviceHomeDirPath: dirPath
      })
    })
    
    // Check the name
    p = p.then(_ => {
      return safe.dns.getLongNames(client).then(names => assert.include(names, newLongName))
    })
    
    // Check the dir
    p = p.then(_ => {
      return safe.dns.getServiceDir(client, newLongName, newServiceName).then(dir => {
        assert.lengthOf(dir.files, 1)
        assert.equal(dir.files[0].name, fileName)
        assert.lengthOf(dir.subDirectories, 0)
        assert.equal(dir.info.name, dirName)
      })
    })
    
    // Now just get "me Con" out of the file
    p = p.then(_ => {
      return safe.dns.getFile(client, {
        longName: newLongName,
        service: newServiceName,
        filePath: '/' + fileName,
        offset: 2,
        length: 6
      }).then(file => assert.equal(file.body.toString(), 'me Con'))
    })
    
    // Do an explicit delete (even though we have some deferred to after) and make sure deleted
    p = p.then(_ => {
      return safe.dns.deleteLongName(client, newLongName).then(_ => {
        return safe.dns.getLongNames(client).then(names => assert.notInclude(names, newLongName))
      })
    })
    
    return p
  })
})