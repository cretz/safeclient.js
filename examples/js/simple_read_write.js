'use strict';

const safe = require('../../lib/src/index')

const client = new safe.Client()
// client.logger = console.log

const result = safe.ensureAuthed(client, {
  app: {
    name: "My Application",
    id: "myapp.example.com",
    version: "0.1.0",
    vendor: "myname"
  }
})

result.then(
  _ => { console.log('Yay!') },
  err => { console.log('NO!', err.toString()) }
)

// TODO: more