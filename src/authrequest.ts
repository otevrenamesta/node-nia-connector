import urlencode from 'urlencode'
import xmlbuilder from 'xmlbuilder'
import zlib from 'zlib'
import { XMLNS, LOA } from './consts.js'
import { generateReqId, signXML } from './utils.js'

interface LoginAttr {
  name: string;
  required: boolean;
}

interface LoginOpts {
  level?: string;
  attrs: LoginAttr[];
}

interface NIAOpts {
  sso_login_url: string;
  assert_endpoint: string;
  audience: string;
  comparison?: string;
  private_key: string;
}

export function createAuthXML (id: string, loginOpts: LoginOpts, opts: NIAOpts): string {
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
        'saml:AuthnContextClassRef': loginOpts.level || LOA.LOW
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
          'eidas:RequestedAttribute': loginOpts.attrs.map(i => {
            return {
              '@Name': i.name,
              '@isRequired': i.required,
              '@NameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri'
            }
          })
        }
      }
    }
  }).end()
  return xml
}

export function createAuthRequest (loginOpts: LoginOpts, opts: NIAOpts): Promise<string> {
  const id = generateReqId()
  const xml = createAuthXML(id, loginOpts, opts)
  const signedXML = signXML(xml, 'AuthnRequest', opts)
  return new Promise((resolve, reject) => {
    zlib.deflateRaw(signedXML, (err, deflated) => {
      if (err) return reject(err)
      const req = urlencode(deflated.toString('base64'))
      const loginUrl = `${opts.sso_login_url}?SAMLRequest=${req}`
      resolve(loginUrl)
    })
  })
}
