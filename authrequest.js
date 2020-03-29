import urlencode from 'urlencode'
import xmlbuilder from 'xmlbuilder'
import zlib from 'zlib'
import { XMLNS, LOA } from './consts'
import { generateReqId, signXML } from './utils'

export function createAuthXML (id, profileAttrs, opts) {
  const xml = xmlbuilder.create({
    'samlp:AuthnRequest': {
      '@xmlns:samlp': XMLNS.SAMLP,
      '@xmlns:saml': XMLNS.SAML,
      '@Version': '2.0',
      '@ID': id,
      '@IssueInstant': (new Date()).toISOString(),
      '@Destination': opts.sso_login_url,
      '@AssertionConsumerServiceURL': opts.assert_endpoint,
      'saml:Issuer': opts.audience,
      'samlp:RequestedAuthnContext': {
        '@Comparison': opts.comparison || 'minimum',
        'saml:AuthnContextClassRef': opts.level || LOA.LOW
      },
      'saml:Conditions': {
        'saml:AudienceRestriction': {
          'saml:Audience': opts.audience
        }
      },
      'samlp:Extensions': {
        '@xmlns:eidas': 'http://eidas.europa.eu/saml-extensions',
        'eidas:SPType': 'public',
        'eidas:RequestedAttributes': {
          'eidas:RequestedAttribute': profileAttrs.map(i => {
            return {
              '@Name': i,
              '@isRequired': true,
              '@NameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri'
            }
          })
        }
      }
    }
  }).end()
  return xml
}

export function createAuthRequest (profileAttrs, opts) {
  const id = generateReqId()
  const xml = createAuthXML(id, profileAttrs, opts)
  const signedXML = signXML(xml, 'AuthnRequest', opts)
  console.log(signedXML)
  return new Promise((resolve, reject) => {
    zlib.deflateRaw(signedXML, (err, deflated) => {
      if (err) return reject(err)
      const req = urlencode(deflated.toString('base64'))
      const loginUrl = `${opts.sso_login_url}?SAMLRequest=${req}`
      resolve(loginUrl)
    })
  })
}
