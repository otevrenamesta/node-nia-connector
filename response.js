import xmldom from 'xmldom'
import xmlenc from 'xml-encryption'
import Debug from 'debug'
import { SUCCESS_STATUS, PROFILEATTRS } from './consts'
import { checkSamlSignature, selectXpath, formatPEM, NIAError } from './utils'

const debug = Debug('saml2')

export function getStatus (dom) {
  var statusNode = selectXpath('//samlp:Status/samlp:StatusCode', dom, 1)
  if (!statusNode) throw new NIAError('Status not found')
  return statusNode.getAttribute('Value')
}

export function decryptAssertion (dom, privateKeys) {
  const privateKey = formatPEM(privateKeys[0], 'PRIVATE KEY')
  return new Promise((resolve, reject) => {
    const encryptedAssertion = selectXpath('//ass:EncryptedAssertion', dom, 1)
    if (!encryptedAssertion) {
      return reject(new NIAError('Expected 1 EncryptedAssertion found'))
    }
    const encryptedData = selectXpath('//xenc:EncryptedData', encryptedAssertion, 1)
    if (!encryptedData) {
      return reject(new NIAError('No EncryptedData inside EncryptedAssertion found'))
    }
    xmlenc.decrypt(encryptedAssertion, { key: privateKey }, (err, result) => {
      if (err) return reject(err)
      resolve(result)
    })
  })
}

export function logoutPostAssert (options, body) {
  const raw = Buffer.from(body.SAMLResponse || body.SAMLRequest, 'base64')
  const samlResponse = (new xmldom.DOMParser()).parseFromString(raw.toString())
  debug(samlResponse)

  const status = getStatus(samlResponse)
  if (status !== SUCCESS_STATUS) {
    throw new NIAError('SAML Response not success!')
  }
  return parseResponseHeader(samlResponse, 'LogoutResponse')
}

export function loginPostAssert (options, body) {
  const raw = Buffer.from(body.SAMLResponse || body.SAMLRequest, 'base64')
  const samlResponse = (new xmldom.DOMParser()).parseFromString(raw.toString())
  debug(samlResponse)

  const response = {
    header: parseResponseHeader(samlResponse, 'Response')
  }

  const status = getStatus(samlResponse)
  if (status !== SUCCESS_STATUS) throw new NIAError('Status: ' + status)

  return decryptAssertion(samlResponse, [options.private_key])
    .then(decriptedXML => {
      const decriptedDoc = new xmldom.DOMParser().parseFromString(decriptedXML)
      const valid = checkSamlSignature(decriptedDoc, decriptedXML, options.certificates[0])
      if (!valid) throw new NIAError('response signature not mathed')
      checkAuthResponse(decriptedXML, options)
      parseAssertionAttributes(decriptedDoc, response)
      return response
    })
}

export function parseResponseHeader (dom, tag) {
  const response = selectXpath(`//samlp:${tag}`, dom, 1)
  if (!response) throw new NIAError('No Response found')
  const responseHeader = {
    version: response.getAttribute('Version'),
    destination: response.getAttribute('Destination'),
    in_response_to: response.getAttribute('InResponseTo'),
    id: response.getAttribute('ID')
  }
  return responseHeader
}

function parseComplexProfileAttr (val) {
  const decoded = Buffer.from(val, 'base64')
  const dom = (new xmldom.DOMParser()).parseFromString(decoded.toString())
  const subAttrs = selectXpath('//*', dom)
  return subAttrs.reduce((obj, i) => {
    const val = selectXpath('string(node())', i)
    if (val) obj[i.localName] = val
    return obj
  }, {})
}
const COMPLEX_ATTRS = [
  PROFILEATTRS.CURRENT_ADDRESS,
  PROFILEATTRS.CZMORIS_TR_ADRESA_ID
]

function parseAssertionAttributes (dom, response) {
  response.NameID = selectXpath('string(//ass:Subject/ass:NameID)', dom, 1)
  response.SessionIndex = selectXpath('//ass:AuthnStatement', dom, 1)
    .getAttribute('SessionIndex')

  const vals = selectXpath('//ass:AttributeStatement//ass:Attribute', dom)
  response.user = {}
  vals.map(i => {
    const name = i.getAttribute('Name')
    const frendlyName = i.getAttribute('FriendlyName')
    const val = selectXpath('string(ass:AttributeValue)', i)
    response.user[frendlyName] = COMPLEX_ATTRS.indexOf(name) < 0
      ? val : parseComplexProfileAttr(val)
  })
}

function checkAuthResponse (dom, opts) {
  const conditions = selectXpath('//saml:Conditions', dom, 1)
  if (!conditions) return

  const notBefore = Date.parse(conditions.getAttribute('NotBefore'))
  const notAfter = Date.parse(conditions.getAttribute('NotOnOrAfter'))
  const now = Date.now()

  if (now > notBefore) throw new NIAError('SAML Response is not yet valid')
  if (now < notAfter) throw new NIAError('SAML Response is no longer valid')

  const audience = selectXpath('string(//saml:AudienceRestriction/Audience)', dom, 1)

  if (audience !== opts.audience) {
    throw new NIAError('Response is not valid for this audience')
  }
}
