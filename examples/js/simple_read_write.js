'use strict';

const safe = require('../../lib/src/index')

const client = new safe.Client()
// Uncomment this to see debug info
// client.logger = console.log

// Authenticate with launcher
let p = safe.ensureAuthed(client, {
  app: {
    name: "My Application",
    id: "myapp.example.com",
    version: "0.1.0",
    vendor: "myname"
  }
})

p = p.then(_ => {
  // Note, the client.conf structure should call safe.marshalConf and save the string
  // here so it can be reloaded with safe.unmarshalConf and reused later instead of
  // registering a new app
  
  // Create file (note this will fail on the second run because it's already there)
  return safe.nfs.createFile(client, { filePath: '/myfile.txt' })
})

p = p.then(_ => {
  // Write data to the file
  return safe.nfs.writeFile(client, {
    filePath: '/myfile.txt',
    contents: 'Hello, World!'
  })
})

p = p.then(_ => {
  // Read it back out and print it
  return safe.nfs.getFile(client, { filePath: '/myfile.txt' }).then(fileBuf => {
    console.log('FILE CONTENTS: ', fileBuf.toString())
  })
})

// We could delete the file here
// p = p.then(_ => { return safe.nfs.deleteFile(client, { filePath: '/myfile.txt' }) })

p.catch(err => console.error('Error: ', err.toString()))