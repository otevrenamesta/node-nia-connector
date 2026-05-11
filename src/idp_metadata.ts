import _axios from 'axios'
const axios = _axios as any
import { DOMParser } from '@xmldom/xmldom'
import { BINDING } from './consts.js'
import { selectXpath } from './utils.js'

const METADATA_TEST_URL = process.env.METADATA_TEST_URL ||
  'https://tnia.identitaobcana.cz/fpsts/FederationMetadata/2007-06/FederationMetadata.xml'
const METADATA_PRODUCTION_URL = process.env.METADATA_PRODUCTION_URL ||
  'https://nia.identitaobcana.cz/fpsts/FederationMetadata/2007-06/FederationMetadata.xml'

interface NIAMetadata {
  sso_login_url: string;
  sso_logout_url: string;
  certificates: string[];
}

function _parseMetadata (res: { data: string }): NIAMetadata {
  const doc = (new DOMParser()).parseFromString(res.data)
  const loginURLXpath = `//dflt:IDPSSODescriptor//dflt:SingleSignOnService[@Binding="${BINDING.REDIRECT}"]`
  const cert = selectXpath('string(//dflt:IDPSSODescriptor//sig:X509Certificate)', doc) as unknown as string
  const login = selectXpath(loginURLXpath, doc, true) as any
  const logout = selectXpath('//dflt:IDPSSODescriptor//dflt:SingleLogoutService', doc, true) as any
  
  const loginAttr = Array.isArray(login) ? login[0] : login
  const logoutAttr = Array.isArray(logout) ? logout[0] : logout

  return {
    sso_login_url: loginAttr?.getAttribute('Location') || '',
    sso_logout_url: logoutAttr?.getAttribute('Location') || '',
    certificates: [cert]
  }
}

const metadata: Record<string, NIAMetadata> = {}

async function _load() {
  try {
    const res_test = await axios.get(METADATA_TEST_URL)
    metadata['true'] = _parseMetadata(res_test)
    const res = await axios.get(METADATA_PRODUCTION_URL)
    metadata['false'] = _parseMetadata(res)
  } catch (e) {
    console.error('Failed to load NIA metadata', e)
  }
}
_load()

export function loadNIAMetadata (i_want_test: boolean): NIAMetadata {
  return metadata[String(i_want_test)]
}
