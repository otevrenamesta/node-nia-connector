import axios from 'axios'
import xmldom from 'xmldom'
import { BINDING } from './consts'
import { selectXpath } from './utils'

const METADATA_TEST_URL = process.env.METADATA_TEST_URL ||
  'https://tnia.identitaobcana.cz/fpsts/FederationMetadata/2007-06/FederationMetadata.xml'
const METADATA_PRODUCTION_URL = process.env.METADATA_PRODUCTION_URL ||
  'https://nia.identitaobcana.cz/fpsts/FederationMetadata/2007-06/FederationMetadata.xml'

function _parseMetadata (res) {
  const doc = (new xmldom.DOMParser()).parseFromString(res.data)
  const loginURLXpath = `//dflt:IDPSSODescriptor//dflt:SingleSignOnService[@Binding="${BINDING.REDIRECT}"]`
  const cert = selectXpath('string(//dflt:IDPSSODescriptor//sig:X509Certificate)', doc)
  const login = selectXpath(loginURLXpath, doc, 1)
  const logout = selectXpath('//dflt:IDPSSODescriptor//dflt:SingleLogoutService', doc, 1)
  return {
    sso_login_url: login.getAttribute('Location'),
    sso_logout_url: logout.getAttribute('Location'),
    certificates: [cert]
  }
}

const metadata = {}

async function _load() {
  const res_test = await axios.get(METADATA_TEST_URL)
  metadata[true] = _parseMetadata(res_test)
  const res = await axios.get(METADATA_PRODUCTION_URL)
  metadata[false] = _parseMetadata(res)
}
_load()

export function loadNIAMetadata (i_want_test) {
  return metadata[i_want_test]
}
