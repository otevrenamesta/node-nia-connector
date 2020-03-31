import { createAuthRequest } from './authrequest'
import { createLogoutRequestUrl } from './logoutrequest'
import { loadNIAMetadata } from './idp_metadata'
import { LOA, PROFILEATTRS } from './consts'
import { NIAError } from './utils'
import { loginPostAssert, logoutPostAssert } from './response'

export default class NIA {
  //
  constructor (options) {
    this.opts = options
    this.opts.notbefore_skew = 1
    loadNIAMetadata().then(metadata => {
      Object.assign(this.opts, metadata)
    })
  }

  createAuthRequestUrl (loginOpts) {
    return createAuthRequest(loginOpts, this.opts)
  }

  postAssert (body) {
    return loginPostAssert(this.opts, body)
  }

  createLogoutRequestUrl (nameId, sessionIndex) {
    return createLogoutRequestUrl(nameId, sessionIndex, this.opts)
  }

  logoutAssert (body) {
    return logoutPostAssert(this.opts, body)
  }
}

// static class consts
NIA.NIAError = NIAError
NIA.LOA = LOA
NIA.PROFILEATTRS = PROFILEATTRS
