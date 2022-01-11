import axios from 'axios'
import xmldom from 'xmldom'
import { BINDING } from './consts'
import { selectXpath } from './utils'

const METADATA_URL = process.env.METADATA_URL ||
  'https://tnia.eidentita.cz/fpsts/FederationMetadata/2007-06/FederationMetadata.xml'

let metadata = null

axios.get(METADATA_URL).then(res => {
  const doc = (new xmldom.DOMParser()).parseFromString(res.data)
  const loginURLXpath = `//dflt:IDPSSODescriptor//dflt:SingleSignOnService[@Binding="${BINDING.REDIRECT}"]`
  const cert = selectXpath('string(//dflt:IDPSSODescriptor//sig:X509Certificate)', doc)
  const login = selectXpath(loginURLXpath, doc, 1)
  const logout = selectXpath('//dflt:IDPSSODescriptor//dflt:SingleLogoutService', doc, 1)
  metadata = {
    sso_login_url: login.getAttribute('Location'),
    sso_logout_url: logout.getAttribute('Location'),
    certificates: [cert]
  }
})

export function loadNIAMetadata () {
  return metadata
}
