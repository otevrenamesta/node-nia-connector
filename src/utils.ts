import crypto from 'crypto'
import xpath from 'xpath'
import xmlcrypto from 'xml-crypto'
import { XMLNS } from './consts.js'

export const selectXpath = xpath.useNamespaces({
  dflt: 'urn:oasis:names:tc:SAML:2.0:metadata',
  samlp: XMLNS.SAMLP,
  saml: 'urn:oasis:names:tc:SAML:2.0:assertion',
  sig: 'http://www.w3.org/2000/09/xmldsig#',
  xenc: 'http://www.w3.org/2001/04/xmlenc#',
  claims: 'http://schemas.xmlsoap.org/ws/2009/09/identity/claims'
})

export class NIAError extends Error { }

export function generateReqId (): string {
  return '_' + crypto.randomBytes(21).toString('hex')
}

export function signXML (xml: string, rootElem: string, opts: { private_key: string }): string {
  const signer = new xmlcrypto.SignedXml(null as any)
  signer.addReference(`//*[local-name(.)='${rootElem}']`,
    [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#'
    ],
    'http://www.w3.org/2001/04/xmlenc#sha256'
  )

  signer.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
  signer.signingKey = opts.private_key
  signer.computeSignature(xml, { prefix: 'ds' })
  return signer.getSignedXml()
}

export function formatPEM (key: string, type: string): string {
  if ((/-----BEGIN [0-9A-Z ]+-----[^-]*-----END [0-9A-Z ]+-----/g.exec(key)) != null) {
    return key
  }
  const prefix = `-----BEGIN ${type.toUpperCase()}-----`
  const end = `-----END ${type.toUpperCase()}-----\n`
  const matches = key.match(/.{1,64}/g)
  if (!matches) return `${prefix}\n${key}\n${end}`
  return `${prefix}\n${matches.join('\n')}\n${end}`
}

export function checkSamlSignature (doc: Node, xml: string, certificate: string): boolean {
  const signature = selectXpath('//sig:Signature', doc, true)
  if (!signature || (Array.isArray(signature) && signature.length === 0)) throw new NIAError('Signature not fount in response')
  
  const sig = new xmlcrypto.SignedXml()
  sig.keyInfoProvider = {
    getKey: function () {
      return Buffer.from(formatPEM(certificate, 'CERTIFICATE'))
    },
    getKeyInfo: function () {
      return '<ds:X509Data/>'
    }
  } as any
  sig.loadSignature((signature instanceof Array ? signature[0] : signature).toString())
  const valid = sig.checkSignature(xml)
  return valid
}
