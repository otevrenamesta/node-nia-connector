import { createAuthRequest } from './authrequest.js'
import { createLogoutRequestUrl } from './logoutrequest.js'
import { loadNIAMetadata } from './idp_metadata.js'
import { LOA, PROFILEATTRS } from './consts.js'
import { NIAError } from './utils.js'
import { loginPostAssert, logoutPostAssert } from './response.js'

export class NIA {
  opts: any;
  static NIAError = NIAError;
  static LOA = LOA;
  static PROFILEATTRS = PROFILEATTRS;

  constructor(options: any, testenv: boolean | string = false) {
    this.opts = options
    this.opts.notbefore_skew = 1
    Object.assign(this.opts, loadNIAMetadata(Boolean(testenv)))
  }

  createAuthRequestUrl(loginOpts: any): Promise<string> {
    return createAuthRequest(loginOpts, this.opts)
  }

  postAssert(body: any) {
    return loginPostAssert(this.opts, body)
  }

  createLogoutRequestUrl(nameId: string, sessionIndex: string): Promise<string> {
    return createLogoutRequestUrl(nameId, sessionIndex, this.opts)
  }

  logoutAssert(body: any) {
    return logoutPostAssert(this.opts, body)
  }
}
