
export const XMLNS = {
  SAML: 'urn:oasis:names:tc:SAML:2.0:assertion',
  SAMLP: 'urn:oasis:names:tc:SAML:2.0:protocol',
  MD: 'urn:oasis:names:tc:SAML:2.0:metadata',
  DS: 'http://www.w3.org/2000/09/xmldsig#',
  XENC: 'http://www.w3.org/2001/04/xmlenc#',
  EXC_C14N: 'http://www.w3.org/2001/10/xml-exc-c14n#'
}

export const SUCCESS_STATUS = 'urn:oasis:names:tc:SAML:2.0:status:Success'

export const BINDING = {
  REDIRECT: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'
}

export const LOA = {
  LOW: 'http://eidas.europa.eu/LoA/low',
  SUBSTANTIAL: 'http://eidas.europa.eu/LoA/substantial',
  HIGH: 'http://eidas.europa.eu/LoA/high'
}

export const PROFILEATTRS = {
  PERSON_IDENTIFIER: 'http://eidas.europa.eu/attributes/naturalperson/PersonIdentifier',
  GIVEN_NAME: 'http://eidas.europa.eu/attributes/naturalperson/CurrentGivenName',
  FAMILY_NAME: 'http://eidas.europa.eu/attributes/naturalperson/CurrentFamilyName',
  CURRENT_ADDRESS: 'http://eidas.europa.eu/attributes/naturalperson/CurrentAddress',
  DATE_OF_BIRTH: 'http://eidas.europa.eu/attributes/naturalperson/DateOfBirth',
  PLACE_OF_BIRTH: 'http://eidas.europa.eu/attributes/naturalperson/PlaceOfBirth',
  COUNTRY_CODE_OF_BIRTH: 'http://www.stork.gov.eu/1.0/countryCodeOfBirth',
  EMAIL: 'http://www.stork.gov.eu/1.0/eMail',
  AGE: 'http://www.stork.gov.eu/1.0/age',
  // IS_AGE_OVER_18: 'http://www.stork.gov.eu/1.0/isAgeOver',
  CZMORIS_PHONE_NUMBER: 'http://schemas.eidentity.cz/moris/2016/identity/claims/phonenumber',
  CZMORIS_TR_ADRESA_ID: 'http://schemas.eidentita.cz/moris/2016/identity/claims/tradresaid',
  CZMORIS_ID_TYPE: 'http://schemas.eidentita.cz/moris/2016/identity/claims/idtype',
  CZMORIS_ID_NUMBER: 'http://schemas.eidentita.cz/moris/2016/identity/claims/idnumber'
}
