import crypto from 'crypto'
import xpath from 'xpath'
import xmlcrypto from 'xml-crypto'
import { XMLNS } from './consts'

export const selectXpath = xpath.useNamespaces({
  dflt: 'urn:oasis:names:tc:SAML:2.0:metadata',
  samlp: XMLNS.SAMLP,
  ass: 'urn:oasis:names:tc:SAML:2.0:assertion',
  sig: 'http://www.w3.org/2000/09/xmldsig#',
  xenc: 'http://www.w3.org/2001/04/xmlenc#',
  claims: 'http://schemas.xmlsoap.org/ws/2009/09/identity/claims'
})

export class NIAError extends Error { }

export function generateReqId () {
  return '_' + crypto.randomBytes(21).toString('hex')
}

export function signXML (xml, rootElem, opts) {
  const signer = new xmlcrypto.SignedXml(null)
  signer.addReference(`//*[local-name(.)='${rootElem}']`,
    [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#'
    ],
    ['http://www.w3.org/2001/04/xmlenc#sha256']
  )

  signer.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
  // signer.keyInfoProvider = {
  //   getKeyInfo: function(key, prefix) {
  //       prefix = prefix || ''
  //       prefix = prefix ? prefix + ':' : prefix
  //     return "<" + prefix + "X509Data><ds:X509Certificate>" + this.getKey() + "</ds:X509Certificate></" + prefix + "X509Data>"
  //   },
  //   getKey: function(keyInfo) {
  //     //you can use the keyInfo parameter to extract the key in any way you want
  //     return 'rrr'
  //     return fs.readFileSync("key.pem")
  //   }
  // }
  signer.signingKey = opts.private_key
  signer.computeSignature(xml, { prefix: 'ds' })
  return signer.getSignedXml()
}

export function formatPEM (key, type) {
  if ((/-----BEGIN [0-9A-Z ]+-----[^-]*-----END [0-9A-Z ]+-----/g.exec(key)) != null) {
    return key
  }
  const prefix = `-----BEGIN ${type.toUpperCase()}-----`
  const end = `-----END ${type.toUpperCase()}-----\n`
  return `${prefix}\n${key.match(/.{1,64}/g).join('\n')}\n${end}`
}

export function checkSamlSignature (doc, xml, certificate) {
  const signature = selectXpath('//sig:Signature', doc, 1)
  if (!signature) throw new NIAError('Signature not fount in response')
  const sig = new xmlcrypto.SignedXml()
  sig.keyInfoProvider = {
    getKey: function () {
      return formatPEM(certificate, 'CERTIFICATE')
    }
  }
  sig.loadSignature(signature.toString())
  const valid = sig.checkSignature(xml)
  return valid
}
