import urlencode from 'urlencode'
import xmlbuilder from 'xmlbuilder'
import zlib from 'zlib'
import { XMLNS } from './consts'
import { generateReqId, signXML } from './utils'

export function createLogoutRequestUrl (nameId, sessionIndex, opts) {
  const id = generateReqId()
  const xml = createLogoutRequestXML(id, nameId, sessionIndex, opts)
  const signedXML = signXML(xml, 'LogoutRequest', opts)
  return new Promise((resolve, reject) => {
    zlib.deflateRaw(signedXML, (err, deflated) => {
      if (err) return reject(err)
      const req = urlencode(deflated.toString('base64'))
      const loginUrl = `${opts.sso_logout_url}?SAMLRequest=${req}`
      resolve(loginUrl)
    })
  })
}

export function createLogoutRequestXML (id, nameId, sessionIndex, opts) {
  const xml = xmlbuilder.create({
    'samlp:LogoutRequest': {
      '@xmlns:samlp': XMLNS.SAMLP,
      '@xmlns:saml': XMLNS.SAML,
      '@ID': id,
      '@Version': '2.0',
      '@IssueInstant': (new Date()).toISOString(),
      '@Destination': opts.sso_logout_url,
      'saml:Issuer': opts.audience,
      'saml:NameID': nameId,
      'samlp:SessionIndex': sessionIndex
    }
  }).end()
  return xml
}
