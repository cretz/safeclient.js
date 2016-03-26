'use strict';

import * as safe from '../src/index'
import * as fs from 'fs'

export const client: safe.Client = new safe.Client()

before(function() {
  // We'll give the human 2 minutes to approve if it's not there
  this.timeout(1000 * 60 * 2)
  
  // Uncomment this to get debug info
  // client.logger = console.log
  
  // Load conf from file if we can
  try {
    client.conf = safe.unmarshalConf(fs.readFileSync('integration.conf.json', 'utf8'))
  } catch(_) {}
  // Ensure authed
  return safe.ensureAuthed(client, {
    app: {
      name: 'SAFE JS Client Integration Tests',
      id: 'safeclient.js-tests.cretz.github.com',
      version: '0.0.1',
      vendor:  "cretz"
    },
    permissions: ['SAFE_DRIVE_ACCESS']
  }).then(_ => {
    // Save the authenticated conf for next time
    fs.writeFileSync('integration.conf.json', safe.marshalConf(client.conf))
  })
})

const letters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

export class Utils {
  static randomString(length: number): string {
    let result = ''
    for (let i = length; i > 0; --i) result += letters[Math.floor(Math.random() * letters.length)];
    return result
  }
  
  static alreadyUsedNames = {}
  
  static randomName(): string {
    while (true) {
      const name = Utils.randomString(20)
      if (!Utils.alreadyUsedNames[name]) {
        Utils.alreadyUsedNames[name] = true
        return name
      }
    }
  }
}