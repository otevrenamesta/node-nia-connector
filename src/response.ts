import { DOMParser } from '@xmldom/xmldom'
import xmlenc from 'xml-encryption'
import Debug from 'debug'
import { SUCCESS_STATUS, PROFILEATTRS } from './consts.js'
import { checkSamlSignature, selectXpath, formatPEM, NIAError } from './utils.js'

const debug = Debug('saml2')

export function getStatus (dom: Node) {
  var statusNode = selectXpath('//samlp:Status/samlp:StatusCode', dom, true) as any
  if (!statusNode) throw new NIAError('Status not found')
  const statusAttr = Array.isArray(statusNode) ? statusNode[0] : statusNode
  return statusAttr.getAttribute('Value')
}

export function decryptAssertion (dom: Node, privateKeys: string[]): Promise<string> {
  const privateKey = formatPEM(privateKeys[0], 'PRIVATE KEY')
  return new Promise((resolve, reject) => {
    const encryptedAssertion = selectXpath('//saml:EncryptedAssertion', dom, true) as any
    if (!encryptedAssertion || (Array.isArray(encryptedAssertion) && encryptedAssertion.length === 0)) {
      return reject(new NIAError('Expected 1 EncryptedAssertion found'))
    }
    const encryptedAssertionNode = Array.isArray(encryptedAssertion) ? encryptedAssertion[0] : encryptedAssertion
    const encryptedData = selectXpath('//xenc:EncryptedData', encryptedAssertionNode, true) as any
    if (!encryptedData || (Array.isArray(encryptedData) && encryptedData.length === 0)) {
      return reject(new NIAError('No EncryptedData inside EncryptedAssertion found'))
    }
    xmlenc.decrypt(encryptedAssertionNode.toString(), { key: privateKey }, (err, result) => {
      if (err) return reject(err)
      resolve(result)
    })
  })
}

export function logoutPostAssert (options: any, body: any) {
  const raw = Buffer.from(body.SAMLResponse || body.SAMLRequest, 'base64')
  const samlResponse = (new DOMParser()).parseFromString(raw.toString())
  debug(samlResponse)

  const status = getStatus(samlResponse)
  if (status !== SUCCESS_STATUS) {
    throw new NIAError('SAML Response not success!')
  }
  return parseResponseHeader(samlResponse, 'LogoutResponse')
}

export function loginPostAssert (options: any, body: any) {
  const raw = Buffer.from(body.SAMLResponse || body.SAMLRequest, 'base64')
  const samlResponse = (new DOMParser()).parseFromString(raw.toString())
  debug(samlResponse)

  const response: any = {
    header: parseResponseHeader(samlResponse, 'Response')
  }

  const status = getStatus(samlResponse)
  if (status !== SUCCESS_STATUS) throw new NIAError('Status: ' + status)

  return decryptAssertion(samlResponse, [options.private_key])
    .then(decriptedXML => {
      const decriptedDoc = new DOMParser().parseFromString(decriptedXML)
      const valid = checkSamlSignature(decriptedDoc, decriptedXML, options.certificates[0])
      if (!valid) throw new NIAError('response signature not mathed')
      checkAuthResponse(decriptedDoc, options)
      parseAssertionAttributes(decriptedDoc, response)
      return response
    })
}

export function parseResponseHeader (dom: Node, tag: string) {
  const response = selectXpath(`//samlp:${tag}`, dom, true) as any
  if (!response || (Array.isArray(response) && response.length === 0)) throw new NIAError('No Response found')
  const responseNode = Array.isArray(response) ? response[0] : response
  const responseHeader = {
    version: responseNode.getAttribute('Version'),
    destination: responseNode.getAttribute('Destination'),
    in_response_to: responseNode.getAttribute('InResponseTo'),
    id: responseNode.getAttribute('ID')
  }
  return responseHeader
}

function parseComplexProfileAttr (val: string) {
  const decoded = Buffer.from(val, 'base64')
  const dom = (new DOMParser()).parseFromString(decoded.toString())
  const subAttrs = selectXpath('//*', dom) as any[]
  return subAttrs.reduce((obj, i) => {
    const val = selectXpath('string(node())', i) as unknown as string
    if (val) obj[i.localName] = val
    return obj
  }, {} as any)
}
const COMPLEX_ATTRS = [
  PROFILEATTRS.CURRENT_ADDRESS,
  PROFILEATTRS.CZMORIS_TR_ADRESA_ID
]

function parseAssertionAttributes (dom: Node, response: any) {
  response.NameID = selectXpath('string(//saml:Subject/saml:NameID)', dom, true) as unknown as string
  const authnStatement = selectXpath('//saml:AuthnStatement', dom, true) as any
  const authnStatementNode = Array.isArray(authnStatement) ? authnStatement[0] : authnStatement
  response.SessionIndex = authnStatementNode?.getAttribute('SessionIndex')
  response.LoA = selectXpath('string(//saml:AuthnContextClassRef)', dom, true) as unknown as string

  const vals = selectXpath('//saml:AttributeStatement//saml:Attribute', dom) as any[]
  response.user = {}
  vals.map(i => {
    const name = i.getAttribute('Name')
    const frendlyName = i.getAttribute('FriendlyName')
    const val = selectXpath('string(saml:AttributeValue)', i) as unknown as string
    response.user[frendlyName] = COMPLEX_ATTRS.indexOf(name) < 0
      ? val : parseComplexProfileAttr(val)
  })
}

function checkAuthResponse (dom: Node, opts: any) {
  const conditions = selectXpath('//saml:Conditions', dom, true) as any
  if (!conditions || (Array.isArray(conditions) && conditions.length === 0)) return
  const conditionsNode = Array.isArray(conditions) ? conditions[0] : conditions

  const notBefore = Date.parse(conditionsNode.getAttribute('NotBefore'))
  const notAfter = Date.parse(conditionsNode.getAttribute('NotOnOrAfter'))
  const now = Date.now()

  if (now > notBefore) throw new NIAError('SAML Response is not yet valid')
  if (now < notAfter) throw new NIAError('SAML Response is no longer valid')

  const audience = selectXpath('string(//saml:AudienceRestriction/saml:Audience)', dom, true) as unknown as string

  if (audience !== opts.audience) {
    throw new NIAError('Response is not valid for this audience')
  }
}
